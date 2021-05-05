import { Api } from "chessgroundx/api";
import { Color, FEN, Key, Letter, Piece, Role } from "chessgroundx/types";
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
import { BestMove, Score, ScoreType, winningChances } from "../utils/chess";
import { numCpus } from "../utils/system";
import { isEmpty } from "../utils/util";
import { Engine, EngineEvent, Fen, fenToString, ValidMoves } from "./engine";
import {
  depth,
  dimension,
  drawHalfMoves,
  drawMinMoves,
  fens,
  pieces,
} from "../utils/consts";
import { playMoveSound, playSelectSound } from "./sounds";

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
  plyIncrement: number;
  plyTime?: number;
  undo: UndoMove;
  showAnalysis: boolean;
}

export const defaultConfig: GameConfig = {
  myColor: "white",
  depth: depth.default,
  totalTime: 600,
  plyIncrement: 10,
  opponent: OpponentType.Computer,
  undo: UndoMove.Single,
  showAnalysis: true,
};

export interface Move {
  color: Color;
  from: Key;
  to: Key;
  captured?: Piece;
  piece?: Piece;
  fenBefore: string;
  fenAfter: string;
}

export interface Clocks {
  used: boolean;
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
  private undidMove?: Color;
  private previousFen = "";
  private reactionDisposers: IReactionDisposer[] = [];
  private validMoves?: ValidMoves;
  private promotion?: Letter;
  private plyIncrement = 0;
  private showAnalysis = true;
  @observable private opponent = OpponentType.Computer;
  @observable private myColor: Color = "white";

  @observable private score?: Score;
  @observable lossReason = LossReason.Mate;
  @observable state = GameState.Paused;
  @observable moves: Move[] = [];
  @observable isThinking = false;
  @observable bottomColor: Color = "black";
  @observable undo: UndoMove = UndoMove.Single;
  @observable clocks: Clocks = {
    used: true,
    white: new Clock(),
    black: new Clock(),
  };

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  @observable fen: Fen = null!;

  @computed
  get gameScore(): Score | undefined {
    if (this.showAnalysis) {
      return this.score;
    }
    return undefined;
  }

  @computed
  get turnColor(): Color {
    return this.fen.color;
  }

  constructor(element: HTMLElement) {
    makeObservable(this);

    this.onMove = this.onMove.bind(this);
    this.canUndo = this.canUndo.bind(this);
    this.onSelect = this.onSelect.bind(this);

    this.engine = new Engine(this.clocks);
    this.engine.on(EngineEvent.Score, this.setScore);

    this.ground = Chessground(element, {
      geometry: dimension.dim10x10,
      variant: "chess",
      autoCastle: false,
      resizable: true,
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
          if (this.clocks.used && secs <= 0) {
            this.setLoss("white", LossReason.Timeout);
          }
        }
      ),

      reaction(
        () => this.clocks.black.remainingSecs,
        (secs) => {
          if (this.clocks.used && secs <= 0) {
            this.setLoss("black", LossReason.Timeout);
          }
        }
      )
    );
  }

  redraw() {
    this.ground?.redrawAll();
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
      await this.setFen(previousMove.fenBefore, []);
      this.previousFen = previousMove.fenBefore;
      this.undidMove = undoMove.color;
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

  private locatePiece(role: Role, color: Color): Key | undefined {
    const { pieces } = this.ground.state;

    for (const [key, piece] of Object.entries(pieces)) {
      if (piece && piece.role === role && piece.color === color) {
        return key as Key;
      }
    }

    return undefined;
  }

  private onSelect(_key: Key) {
    const { state } = this.ground;
    if (state.selected) {
      const piece = state.pieces[state.selected];
      playSelectSound(piece);
    }
  }

  private async detectCheck() {
    const { pieces } = this.ground.state;

    for (const key of await this.engine.checkers()) {
      const piece = pieces[key];
      if (piece) {
        this.ground.set({ check: opposite(piece.color) });
        return;
      }
    }

    this.ground.set({ check: false });
  }

  private async onMove(orig: Key, dest: Key, capturedPiece?: Piece) {
    playMoveSound();

    if (this.turnColor === this.undidMove) {
      this.undidMove = undefined;
    }

    if (this.isMyTurn) {
      this.promotion = await this.checkPawnPromotions(orig, dest);
    }

    await this.setFen(this.fen.raw, [`${orig}${dest}${this.promotion || ""}`]);

    this.promotion = undefined;

    this.ground.set({
      check: false,
      drawable: { shapes: [] },
    });

    this.moves.push({
      from: orig,
      to: dest,
      captured: capturedPiece,
      piece: this.ground.state.pieces[dest],
      color: opposite(this.turnColor),
      fenBefore: this.previousFen,
      fenAfter: this.fen.raw,
    });

    this.previousFen = this.fen.raw;

    if (capturedPiece) {
      await this.checkRoyaltyPromotions(capturedPiece);
    }

    if (this.clocks.used) {
      const prevClock = this.clocks[opposite(this.turnColor)];
      prevClock.stop();
      prevClock.add(this.plyIncrement);
      this.clocks[this.turnColor].continue();
    }

    await this.detectEndGame();

    if (!this.isPlaying) {
      return;
    }

    if (this.isOpponentHuman) {
      this.flipBoard();
    }

    await this.detectCheck();

    await this.makeOpponentMove();
  }

  private async checkRoyaltyPromotions({ color, role }: Piece) {
    // Движок не проверяем — он сам выполняет замену своих фигур
    if (!this.isMyTurn) {
      return;
    }

    // Срубили принцессу — её больше нельзя превратить
    if (role === pieces.princess) {
      this.fen.princess[color] = false;
    }

    // Если срубили ферзя — пробуем поднять принцессу в ферзя
    if (role === pieces.queen) {
      if (!this.fen.princess[color]) {
        return;
      }
      this.fen.princess[color] = false;
      const princessLocation = this.locatePiece(pieces.princess, color);
      if (!princessLocation) {
        return;
      }
      const promote = await confirmPrincessPromotion();
      if (!promote) {
        return;
      }
      // Подменяем принцессу на ферзя и обновляем FEN
      this.ground.setPieces({
        [princessLocation]: {
          role: pieces.queen,
          color: color,
          promoted: true,
        },
      });
      this.fen.pieces = this.ground.getFen().replaceAll("10", "55");
      this.fen.raw = fenToString(this.fen);
    }
  }

  private async checkPawnPromotions(
    orig: Key,
    dest: Key
  ): Promise<Letter | undefined> {
    const promotions = this.validMoves?.promotions;
    if (promotions && this.isMyTurn) {
      const available = promotions[orig + dest];
      if (available?.length) {
        return await choosePromotion(this.turnColor, available);
      }
    }
    return undefined;
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

  private async hasMoves(color: Color): Promise<boolean> {
    await this.updateValidMoves({ ...this.fen, color });
    return !(this.validMoves && isEmpty(this.validMoves.destinations));
  }

  private async detectEndGame() {
    this.assertPlayingState();

    // 50 полуходов — ничья
    if (this.fen.halfMoves >= drawHalfMoves) {
      this.setState(GameState.Draw);
      return;
    }

    // У текущей стороны есть возможные ходы — игра не закончена
    if (await this.hasMoves(this.turnColor)) {
      return;
    }

    // У противника есть ходы — мы проиграли
    if (await this.hasMoves(opposite(this.turnColor))) {
      this.setLoss(this.turnColor, LossReason.Mate);
      return;
    }

    // У противника тоже нет ходов — ничья
    this.setState(GameState.Draw);
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
      orientation: nextColor,
      movable: { color: nextColor },
      lastMove: undefined,
    });

    await this.setFen(config.fen || fens.start, []);

    this.setState(GameState.Playing);
    this.opponent = config.opponent;
    this.bottomColor = nextColor;
    this.myColor = config.myColor;
    this.undo = config.undo;
    this.moves.splice(0);
    this.showAnalysis = config.showAnalysis;
    this.plyIncrement = config.plyIncrement * 1000;

    await this.updateValidMoves(this.fen);

    this.clocks.used = config.totalTime > 0;
    if (this.clocks.used) {
      this.clocks.white.set(config.totalTime * 1000);
      this.clocks.black.set(config.totalTime * 1000);
    }

    await this.makeOpponentMove();
  }

  private async setFen(fen: string, moves: string[]) {
    this.fen = await this.engine.fen(fen, moves);
    this.ground.set({
      fen: this.fen.pieces,
      turnColor: this.turnColor,
    });
  }

  private async updateValidMoves(fen: Fen) {
    const str = fenToString(fen);
    this.validMoves = await this.engine.validMoves(str);

    this.ground.set({
      movable: {
        dests: this.validMoves.destinations,
      },
    });
  }

  @action.bound
  private setThinking(enabled: boolean) {
    this.isThinking = enabled;
  }

  async getHint(): Promise<BestMove | undefined> {
    this.setThinking(true);
    try {
      const move = await this.engine.calculateMove(this.fen.raw);
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
      await this.engine.calculateMove(this.fen.raw);
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
    if (this.isOpponentAComputer && this.turnColor !== this.myColor) {
      this.setThinking(true);
      try {
        const move = await this.engine.calculateMove(this.fen.raw);
        if (move) {
          this.promotion = move.promotion;
          const captured = this.ground.state.pieces[move.to];
          await this.onMove(move.from, move.to, captured);
        }
      } finally {
        this.setThinking(false);
      }
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
