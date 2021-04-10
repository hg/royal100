import { Api } from "chessgroundx/api";
import { Color, FEN, Key, Piece, Role } from "chessgroundx/types";
import { Chessground } from "chessgroundx";
import { Clock } from "./clock";
import { choosePromotion, confirmPrincessPromotion } from "./gameUi";
import {
  action,
  computed,
  IReactionDisposer,
  makeObservable,
  observable,
  reaction,
} from "mobx";
import assert from "assert";
import { opposite } from "chessgroundx/util";
import {
  BestMove,
  EnPassant,
  getEnPassant,
  Score,
  ScoreType,
  winningChances,
} from "../utils/chess";
import { getEnginePath, numCpus } from "../utils/system";
import { isEmpty } from "../utils/util";
import { boardFenToEngine } from "../utils/interop";
import { Engine, EngineEvent, ValidMoves } from "./engine";
import {
  castle,
  dimension,
  drawHalfMoves,
  drawMinMoves,
  Fen,
  pieces,
} from "../utils/consts";
import { playMoveSound, playSelectSound } from "./sounds";
import {
  castlingKingPathIsSafe,
  castlingPiecesAtHome,
  CastlingSide,
  initialCastling,
} from "../utils/castling";

export enum OpponentType {
  Computer,
  Human,
}

export enum UndoMove {
  None,
  Single,
  Full,
}

export interface GameConfig {
  opponent: OpponentType;
  depth?: number;
  myColor: Color;
  fen?: FEN;
  totalTime: number;
  plyTime?: number;
  undo: UndoMove;
}

export interface Move {
  color: Color;
  from: Key;
  to: Key;
  captured?: Piece;
  piece?: Piece;
  fenBefore: string;
  fenAfter: string;
  state: {
    halfMoves: number;
    fullMoves: number;
    canPromotePrincess: {
      white: boolean;
      black: boolean;
    };
  };
}

export interface Clocks {
  white: Clock;
  black: Clock;
}

export enum GameState {
  Paused,
  Playing,
  LossWhite,
  LossBlack,
  Draw,
}

export enum LossReason {
  Mate,
  Timeout,
  Forfeit,
}

export class Game {
  private readonly engine: Engine;
  private readonly ground: Api;
  private halfMoves = 0;
  private fullMoves = 1;
  private canPromotePrincess = { black: true, white: true };
  private undidMove?: Color;
  private previousFen = "";
  private reactionDisposers: IReactionDisposer[] = [];
  private validMoves?: ValidMoves;
  private enPassant: EnPassant = { dests: [] };
  @observable private opponent = OpponentType.Computer;
  @observable private myColor: Color = "white";
  @observable private turnColor: Color = "white";

  @observable score?: Score;
  @observable lossReason = LossReason.Mate;
  @observable state = GameState.Paused;
  @observable moves: Move[] = [];
  @observable isThinking = false;
  @observable bottomColor: Color = "black";
  @observable undo: UndoMove = UndoMove.Single;
  @observable clocks: Clocks = {
    white: new Clock(),
    black: new Clock(),
  };

  constructor(element: HTMLElement) {
    makeObservable(this);

    this.onMove = this.onMove.bind(this);
    this.canUndo = this.canUndo.bind(this);
    this.onSelect = this.onSelect.bind(this);

    const enginePath = getEnginePath();
    this.engine = new Engine(enginePath, this.clocks);
    this.engine.on(EngineEvent.Score, this.setScore);

    this.ground = Chessground(element, {
      geometry: dimension.dim10x10,
      variant: "chess",
      autoCastle: false,
      movable: {
        free: false,
        showDests: true,
      },
      events: {
        move: this.onMove,
        select: this.onSelect,
      },
    });

    this.reactionDisposers.push(
      reaction(
        () => this.clocks.white.remainingSecs,
        (secs) => {
          if (secs <= 0) {
            this.setLoss("white", LossReason.Timeout);
          }
        }
      ),

      reaction(
        () => this.clocks.black.remainingSecs,
        (secs) => {
          if (secs <= 0) {
            this.setLoss("black", LossReason.Timeout);
          }
        }
      )
    );
  }

  dispose() {
    for (const disposer of this.reactionDisposers) {
      disposer();
    }
    this.reactionDisposers.splice(0);
    this.engine.off(EngineEvent.Score, this.setScore);
  }

  canUndo(moveNumber: number): boolean {
    if (!this.isPlaying) {
      return false;
    }
    // Если играем с движком — отменять можно только во время своего хода
    if (this.isOpponentAComputer && this.turnColor !== this.myColor) {
      return false;
    }
    if (this.undo === UndoMove.None) {
      return false;
    }
    if (moveNumber <= 1) {
      return false;
    }
    const move = this.moves[moveNumber];
    if (!move) {
      return false;
    }
    // Отмена только своих ходов
    if (move.color !== this.turnColor) {
      return false;
    }
    if (this.undo === UndoMove.Single) {
      // Если недавно отменяли — больше нельзя
      if (this.undidMove === this.turnColor) {
        return false;
      }
      // Отмена только последнего хода
      if (moveNumber < this.moves.length - 2) {
        return false;
      }
    }
    return true;
  }

  @action.bound
  async undoMove(moveNumber: number) {
    const undoMove = this.moves[moveNumber];
    const previousMove = this.moves[moveNumber - 1];

    if (undoMove && previousMove) {
      // Удаляем всё, начиная с прыдущего шага
      this.moves.splice(moveNumber - 1);

      // Останавливаем все часы — если белые отменяют свой ход,
      // это не повод зачислять лишнее время чёрным.
      this.clocks.white.stop();
      this.clocks.black.stop();

      // Повторяем последний шаг, который нужно сохранить
      this.ground.set({
        fen: previousMove.fenBefore,
        turnColor: previousMove.color,
      });
      this.previousFen = previousMove.fenBefore;
      this.turnColor = previousMove.color;
      this.halfMoves = previousMove.state.halfMoves;
      this.fullMoves = previousMove.state.fullMoves;
      this.undidMove = undoMove.color;
      this.canPromotePrincess = { ...previousMove.state.canPromotePrincess };
      this.ground.move(previousMove.from, previousMove.to);
    }
  }

  @action.bound
  private setScore(score: Score) {
    this.score = score;
  }

  @computed
  get isOpponentAComputer(): boolean {
    return this.opponent === OpponentType.Computer;
  }

  @computed
  get isOpponentHuman(): boolean {
    return !this.isOpponentAComputer;
  }

  @computed
  get topColor(): Color {
    return opposite(this.bottomColor);
  }

  @computed
  get hasWon(): boolean {
    return (
      !this.isPlaying &&
      (this.isOpponentHuman ||
        (this.myColor === "white" && this.state === GameState.LossBlack) ||
        (this.myColor === "black" && this.state === GameState.LossWhite))
    );
  }

  @computed
  get isPlaying(): boolean {
    return this.state === GameState.Playing;
  }

  @computed
  get isMyTurn(): boolean {
    return (
      this.isPlaying &&
      (this.turnColor === this.myColor || this.isOpponentHuman)
    );
  }

  @computed
  get canAskForDraw(): boolean {
    return Boolean(
      this.isOpponentAComputer &&
        this.isPlaying &&
        this.moves.length >= drawMinMoves &&
        this.score
    );
  }

  @action.bound
  private setLoss(side: Color, reason: LossReason) {
    if (this.isPlaying) {
      const state =
        side === "white" ? GameState.LossWhite : GameState.LossBlack;
      this.setState(state);
      this.lossReason = reason;
    }
  }

  @action.bound
  private setState(state: GameState) {
    this.state = state;

    if (!this.isPlaying) {
      this.ground.stop();
      this.clocks.black.stop();
      this.clocks.white.stop();
    }
  }

  private checkEnPassant(dest: Key): Piece | undefined {
    this.assertPlayingState();

    const { ground, enPassant } = this;
    let captured: Piece | undefined;

    // Если поставили фигуру на одну из ячеек, пропущенных пешкой
    // при длинном прыжке, ищем ходившую пешку и срубаем её.
    if (enPassant.dests.includes(dest)) {
      captured = ground.state.pieces[enPassant.target];
      ground.setPieces({
        [enPassant.target]: undefined,
      });
    }

    return captured;
  }

  @action.bound
  private async addMove(
    movePartial: Pick<Move, "from" | "to" | "captured" | "piece">
  ) {
    const currentFen = await this.fullFen();

    this.moves.push({
      ...movePartial,
      color: this.turnColor,
      fenBefore: this.previousFen,
      fenAfter: currentFen,
      state: {
        halfMoves: this.halfMoves,
        fullMoves: this.fullMoves,
        canPromotePrincess: {
          white: this.canPromotePrincess.white,
          black: this.canPromotePrincess.black,
        },
      },
    });
    this.previousFen = currentFen;
  }

  private locatePiece(role: Role, color: Color): Key | undefined {
    const { pieces } = this.ground.state;

    for (const [key, piece] of Object.entries(pieces)) {
      if (piece && piece.role === role && piece.color === color) {
        return key;
      }
    }

    return undefined;
  }

  private onSelect(_key: Key) {
    const { state } = this.ground;
    const piece = state.pieces[state.selected];
    playSelectSound(piece);
  }

  private resetCheck() {
    this.ground.set({ check: false });
  }

  private async detectCheck(): Promise<boolean> {
    const opponentColor = opposite(this.turnColor);

    const kingLocation = this.locatePiece("k-piece", opponentColor);
    if (!kingLocation) {
      return false;
    }

    await this.updateValidMoves();

    const moveDestinations = this.validMoves?.destinations;
    if (!moveDestinations) {
      return false;
    }

    for (const destinations of Object.values(moveDestinations)) {
      if (destinations.includes(kingLocation)) {
        this.ground.set({ check: opponentColor });
        return true;
      }
    }

    return false;
  }

  private async canCastle(
    opponentMoveFen: string,
    side: Color,
    dir: CastlingSide
  ): Promise<boolean> {
    const castling = this.castling[side];
    if (castling.movedKing || castling.movedRook[dir]) {
      return false;
    }

    if (!castlingPiecesAtHome(side, dir, this.ground.state.pieces)) {
      return false;
    }

    const moves = await this.engine.validMoves(opponentMoveFen);

    return castlingKingPathIsSafe(side, dir, moves.destinations);
  }

  private checkCastlingAvailability(orig: Key, piece: Piece) {
    const castling = this.castling[this.turnColor];

    switch (piece.role) {
      case pieces.king:
        castling.movedKing = true;
        break;

      case pieces.rook:
        const cells = castle[this.turnColor].rookCells;
        if (orig === cells.K) {
          castling.movedRook.K = true;
        } else if (orig === cells.Q) {
          castling.movedRook.Q = true;
        }
        break;
    }
  }

  private castle(orig: Key, dest: Key) {
    const [file, rank] = dest;

    let rookOrig: Key;
    let rookDest: Key;
    if (file === "c") {
      rookOrig = `a${rank}`;
      rookDest = `d${rank}`;
    } else {
      assert.deepStrictEqual(file, "h");
      rookOrig = `j${rank}`;
      rookDest = `g${rank}`;
    }

    this.ground.setPieces({
      [rookOrig]: undefined,
      [rookDest]: {
        role: pieces.rook,
        color: this.turnColor,
      },
      [orig]: undefined,
      [dest]: {
        role: pieces.king,
        color: this.turnColor,
      },
    });
  }

  private async onMove(orig: Key, dest: Key, capturedPiece?: Piece) {
    const movedPiece = this.ground.state.pieces[dest];

    await this.addMove({
      from: orig,
      to: dest,
      captured: capturedPiece,
      piece: movedPiece,
    });

    playMoveSound();

    if (this.turnColor === this.undidMove) {
      this.undidMove = undefined;
    }

    this.ground.setShapes([]);

    if (!capturedPiece) {
      capturedPiece = this.checkEnPassant(dest);
    }
    this.enPassant = { dests: [] };

    if (movedPiece) {
      this.checkCastlingAvailability(orig, movedPiece);

      const conf = castle[this.turnColor];
      if (
        movedPiece.role === pieces.king &&
        orig === conf.kingCell &&
        (dest === conf.destinations.K || dest === conf.destinations.Q)
      ) {
        this.castle(orig, dest);
      }
    }

    if (capturedPiece) {
      await this.checkRoyaltyPromotions(capturedPiece);
    }

    // Если пешка скакнула на 2-3 ячейки, запоминаем, что её можно срубить на проходе
    if (movedPiece?.role === pieces.pawn) {
      this.enPassant = getEnPassant(orig, dest);
    }

    await this.checkPawnPromotions(orig, dest);

    const check = await this.detectCheck();

    await this.toggleColor();

    if (!this.isPlaying) {
      return;
    }

    // В этих шахматах игрок может сделать ход, ставящий под угрозу собственного
    // короля. Т.к. библиотека позволяет пометить шахом только одну ячейку,
    // проверяем, находится ли король другой стороны под шахом. Если нет,
    // смотрим, не поставили ли под удар своего короля.
    if (!check) {
      const selfCheck = await this.detectCheck();
      if (!selfCheck) {
        this.resetCheck();
      }
    }

    // Если взяли фигуру или подвинули пешку, сбрасываем полу-ходы
    if (capturedPiece || movedPiece?.role === pieces.pawn) {
      this.halfMoves = 0;
    }

    await this.makeOpponentMove();
  }

  private async checkRoyaltyPromotions(captured: Piece) {
    const oppColor = opposite(this.turnColor);
    assert.deepStrictEqual(captured.color, oppColor);

    // Если срубили короля — пробуем поднять принца до статуса короля
    if (captured.role === pieces.king) {
      const princeLocation = this.locatePiece(pieces.prince, oppColor);
      if (princeLocation) {
        this.ground.setPieces({
          [princeLocation]: {
            role: pieces.king,
            promoted: true,
            color: oppColor,
          },
        });
      }
    }

    if (captured.role === pieces.princess) {
      this.canPromotePrincess[captured.color] = false;
    }

    // Если срубили ферзя — пробуем поднять принцессу в ферзя
    if (captured.role === pieces.queen) {
      // Ферзь реального игрока (не компьютера)?
      const capturedHumanPiece =
        this.isOpponentHuman || oppColor === this.myColor;

      // Игрок уже отказывался от превращения — больше не спрашиваем
      if (capturedHumanPiece && !this.canPromotePrincess[oppColor]) {
        return;
      }
      const princessLocation = this.locatePiece(pieces.princess, oppColor);
      if (!princessLocation) {
        return;
      }
      if (capturedHumanPiece) {
        const promote = await confirmPrincessPromotion();
        this.canPromotePrincess[oppColor] = false;
        if (!promote) {
          return;
        }
      }
      this.ground.setPieces({
        [princessLocation]: {
          role: pieces.queen,
          color: oppColor,
          promoted: true,
        },
      });
      this.canPromotePrincess[oppColor] = false;
    }
  }

  private async checkPawnPromotions(orig: Key, dest: Key) {
    if (
      this.opponent !== OpponentType.Human &&
      this.turnColor !== this.myColor
    ) {
      return;
    }
    if (this.validMoves?.promotions) {
      const promotions = this.validMoves.promotions[orig + dest];

      if (promotions?.length) {
        const promotion = await choosePromotion(this.turnColor, promotions);

        this.ground.setPieces({
          [dest]: {
            color: this.turnColor,
            promoted: true,
            role: `${promotion}-piece`,
          } as Piece,
        });
      }
    }
  }

  private async toggleColor() {
    this.clocks[this.turnColor].stop();

    if (this.turnColor === "black") {
      this.fullMoves++;
    }

    this.turnColor = opposite(this.turnColor);

    this.clocks[this.turnColor].continue();
    this.ground.set({ turnColor: this.turnColor });

    await this.updateValidMoves();
    await this.detectEndGame();

    if (!this.isPlaying) {
      return;
    }

    this.halfMoves++;

    if (this.halfMoves >= drawHalfMoves) {
      this.setState(GameState.Draw);
      return;
    }

    if (this.isOpponentHuman) {
      this.flipBoard();
    }
  }

  @action.bound
  private flipBoard() {
    this.bottomColor = this.turnColor;
    this.ground.set({
      orientation: this.turnColor,
      movable: {
        color: this.turnColor,
      },
    });
  }

  private get hasNoMoves(): boolean {
    return Boolean(this.validMoves && isEmpty(this.validMoves.destinations));
  }

  private async detectEndGame() {
    this.assertPlayingState();

    if (this.hasNoMoves) {
      const color = this.turnColor;
      this.turnColor = opposite(color);
      await this.updateValidMoves();
      this.turnColor = color;

      // Если у противника тоже нет ходов — объявляем ничью
      if (this.hasNoMoves) {
        this.setState(GameState.Draw);
      } else {
        this.setLoss(color, LossReason.Mate);
      }
    }
  }

  async newGame(config: GameConfig) {
    assert.ok(!this.isPlaying);

    await this.engine.newGame({
      depth: config.depth,
      threads: numCpus(),
      moveTime: config.plyTime,
    });

    const nextColor = this.isOpponentAComputer ? config.myColor : "white";

    this.ground.set({
      turnColor: "white",
      orientation: nextColor,
      lastMove: undefined,
      fen: config.fen || Fen.start,
      movable: {
        color: nextColor,
      },
    });

    this.setState(GameState.Playing);
    this.opponent = config.opponent;
    this.canPromotePrincess = {
      white: !!this.locatePiece(pieces.princess, "white"),
      black: !!this.locatePiece(pieces.princess, "black"),
    };
    this.castling = initialCastling();
    this.bottomColor = nextColor;
    this.turnColor = "white";
    this.myColor = config.myColor;
    this.undo = config.undo;
    this.moves.splice(0);

    await this.updateValidMoves();

    this.clocks.white.set(config.totalTime * 1000);
    this.clocks.white.continue();
    this.clocks.black.set(config.totalTime * 1000);

    await this.makeOpponentMove();
  }

  private async updateValidMoves() {
    const fen = await this.fullFen();
    this.validMoves = await this.engine.validMoves(fen);

    this.ground.set({
      movable: {
        dests: this.validMoves.destinations,
      },
    });
  }

  private castling = initialCastling();

  private async fullFen(): Promise<string> {
    const { ground, turnColor, halfMoves, fullMoves, enPassant } = this;
    const fen = boardFenToEngine(ground.getFen());

    const { white, black } = this.canPromotePrincess;
    const princessPromotion = (white ? "S" : "") + (black ? "s" : "");

    function result(color: string, castling: string) {
      // фигуры  цвет_хода  рокировка  превращение_принцессы  взятие_на_проходе  полуходы  полные_ходы
      return `${fen} ${color} ${castling || "-"} ${princessPromotion || "-"} ${
        enPassant.target || "-"
      } ${halfMoves} ${fullMoves}`;
    }

    const fenWhite = result("w", "-");
    const fenBlack = result("b", "-");

    const castling =
      ((await this.canCastle(fenBlack, "white", "K")) ? "K" : "") +
      ((await this.canCastle(fenBlack, "white", "Q")) ? "Q" : "") +
      ((await this.canCastle(fenWhite, "black", "K")) ? "k" : "") +
      ((await this.canCastle(fenWhite, "black", "Q")) ? "q" : "");

    return result(turnColor[0], castling);
  }

  @action.bound
  private setThinking(enabled: boolean) {
    this.isThinking = enabled;
  }

  async getHint(): Promise<BestMove | undefined> {
    this.setThinking(true);
    try {
      const fen = await this.fullFen();
      const move = await this.engine.calculateMove(fen);
      if (move) {
        this.ground.selectSquare(move.from);
        this.ground.setShapes([
          {
            orig: move.from,
            dest: move.to,
            brush: "green",
          },
        ]);
      }
      return move;
    } finally {
      this.setThinking(false);
    }
  }

  async askForDraw() {
    assert.deepStrictEqual(this.opponent, OpponentType.Computer);

    if (!this.canAskForDraw) {
      return false;
    }
    assert.ok(this.score);

    this.setThinking(true);
    try {
      const fen = await this.fullFen();
      await this.engine.calculateMove(fen);
    } finally {
      this.setThinking(false);
    }

    if (this.score.type === ScoreType.Mate) {
      return false;
    }

    assert.deepStrictEqual(this.score.type, ScoreType.Cp);

    const engineChances = winningChances(this.score.value);
    if (engineChances >= 0.15) {
      return false;
    }

    this.setState(GameState.Draw);

    return true;
  }

  @action.bound
  forfeit() {
    if (this.isPlaying) {
      this.setLoss(this.myColor, LossReason.Forfeit);
    }
  }

  private async makeOpponentMove() {
    if (
      this.opponent !== OpponentType.Computer ||
      this.turnColor === this.myColor
    ) {
      return;
    }
    this.setThinking(true);
    try {
      const fen = await this.fullFen();
      const move = await this.engine.calculateMove(fen);
      if (move) {
        this.doMove(move);
      }
    } finally {
      this.setThinking(false);
    }
  }

  private doMove({ from, to, promotion }: BestMove) {
    this.ground.move(from, to);

    if (promotion) {
      this.ground.setPieces({
        [to]: {
          color: this.turnColor,
          role: `${promotion}-piece`,
          promoted: true,
        } as Piece,
      });
    }
  }

  @action.bound
  async stopThinking() {
    if (this.isThinking) {
      await this.engine.stopThinking();
    }
  }

  @action.bound
  stop() {
    this.setState(GameState.Paused);
    this.engine.quit();
  }

  private assertPlayingState() {
    assert.ok(this.isPlaying);
  }
}
