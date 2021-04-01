import { Api } from "chessgroundx/api";
import { Color, FEN, Key, Piece, Role } from "chessgroundx/types";
import { Chessground } from "chessgroundx";
import { Clock } from "./clock";
import { choosePromotion, confirmPrincessPromotion } from "./gameUi";
import { action, AnnotationsMap, makeAutoObservable, reaction } from "mobx";
import assert from "assert";
import { sound, Track } from "./audio";
import { opposite } from "chessgroundx/util";
import { BestMove, getEnPassant } from "../utils/chess";
import { getEnginePath, numCpus } from "../utils/system";
import { isEmpty } from "../utils/util";
import { boardFenToEngine } from "../utils/interop";
import { Engine, ValidMoves } from "./engine";
import { Dimension, Fen, Pieces } from "../utils/consts";

export enum OpponentType {
  Computer,
  Human,
}

export interface GameConfig {
  opponent: OpponentType;
  depth?: number;
  myColor: Color;
  fen?: FEN;
  totalTime: number;
  plyTime?: number;
}

export interface Move {
  color: Color;
  from: Key;
  to: Key;
  captured?: Piece;
  piece?: Piece;
  fen: string;
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
  private engine: Engine;
  private ground: Api;
  private opponent = OpponentType.Computer;
  private myColor: Color = "white";
  private turnColor: Color = "white";
  private halfMoves = 0;
  private fullMoves = 1;
  private validMoves?: ValidMoves;
  private enPassantTarget?: Key;
  private enPassant: Key[] = [];
  private refusedPrincessPromotion = {
    black: false,
    white: false,
  };

  lossReason = LossReason.Mate;
  state = GameState.Paused;
  moves: Move[] = [];
  isThinking = false;
  clocks: Clocks = {
    white: new Clock(),
    black: new Clock(),
  };
  bottomColor: Color = "black";

  constructor(element: HTMLElement) {
    this.onMove = this.onMove.bind(this);
    this.onSelect = this.onSelect.bind(this);

    const enginePath = getEnginePath();
    this.engine = new Engine(enginePath, this.clocks);

    this.ground = Chessground(element, {
      geometry: Dimension.dim10x10,
      variant: "chess",
      autoCastle: true,
      movable: {
        free: false,
        showDests: true,
      },
      events: {
        move: this.onMove,
        select: this.onSelect,
      },
    });

    makeAutoObservable(this, {
      engine: false,
      ground: false,
    } as AnnotationsMap<this, never>);

    reaction(
      () => this.clocks.white.remainingSecs,
      (secs) => {
        if (secs <= 0) {
          this.setLoss("white", LossReason.Timeout);
        }
      }
    );

    reaction(
      () => this.clocks.black.remainingSecs,
      (secs) => {
        if (secs <= 0) {
          this.setLoss("black", LossReason.Timeout);
        }
      }
    );
  }

  get topColor(): Color {
    return opposite(this.bottomColor);
  }

  @action
  private setLoss(side: Color, reason: LossReason) {
    if (this.isPlaying) {
      const state =
        side === "white" ? GameState.LossWhite : GameState.LossBlack;
      this.setState(state);
      this.lossReason = reason;
    }
  }

  @action
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

    const { ground, enPassant, enPassantTarget } = this;
    let captured: Piece | undefined;

    // Если поставили фигуру на одну из ячеек, пропущенных пешкой
    // при длинном прыжке, ищем ходившую пешку и срубаем её.
    if (enPassant.includes(dest)) {
      captured = ground.state.pieces[enPassantTarget];
      ground.setPieces({
        [enPassantTarget]: undefined,
      });
    }

    return captured;
  }

  @action
  private addMove(move: Move) {
    this.moves.push(move);
    console.log("move", move);
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
    if (piece) {
      sound.play(Track.Select);
    }
  }

  private async onMove(orig: Key, dest: Key, captured?: Piece) {
    if (!captured) {
      captured = this.checkEnPassant(dest);
    }
    this.enPassant.splice(0);
    this.enPassantTarget = undefined;

    if (captured) {
      sound.play(Track.Capture);
    } else {
      sound.play(Track.Move);
    }

    const piece = this.ground.state.pieces[dest];

    this.addMove({
      from: orig,
      to: dest,
      color: this.turnColor,
      fen: this.fullFen,
      captured,
      piece,
    });

    if (captured) {
      await this.checkRoyaltyPromotions(captured);
    }

    // Если пешка скакнула на 2-3 ячейки, запоминаем, что её можно срубить на проходе
    if (piece?.role === Pieces.Pawn) {
      this.enPassant = getEnPassant(orig, dest);
      this.enPassantTarget = dest;
    }

    await this.checkPawnPromotions(orig, dest);
    await this.toggleColor();

    if (!this.isPlaying) {
      return;
    }

    // Если взяли фигуру или подвинули пешку, сбрасываем полу-ходы
    if (captured || piece?.role === "p-piece") {
      this.halfMoves = 0;
    }

    await this.makeOpponentMove();
  }

  private async checkRoyaltyPromotions(captured: Piece) {
    const oppColor = opposite(this.turnColor);
    assert.deepStrictEqual(captured.color, oppColor);

    // Если срубили короля — пробуем поднять принца до статуса короля
    if (captured.role === Pieces.King) {
      const princeLocation = this.locatePiece(Pieces.Prince, oppColor);
      if (princeLocation) {
        this.ground.setPieces({
          [princeLocation]: {
            role: Pieces.King,
            promoted: true,
            color: oppColor,
          },
        });
      }
    }

    // Если срубили ферзя — пробуем поднять принцессу в ферзя
    if (captured.role === Pieces.Queen) {
      // Ферзь реального игрока (не компьютера)?
      const capturedHumanPiece =
        this.opponent === OpponentType.Human || oppColor === this.myColor;

      // Игрок уже отказывался от превращения — больше не спрашиваем
      if (capturedHumanPiece && this.refusedPrincessPromotion[oppColor]) {
        return;
      }
      const princessLocation = this.locatePiece(Pieces.Princess, oppColor);
      if (!princessLocation) {
        return;
      }
      if (capturedHumanPiece) {
        const promote = await confirmPrincessPromotion();
        if (!promote) {
          this.refusedPrincessPromotion[oppColor] = true;
          return;
        }
      }
      this.ground.setPieces({
        [princessLocation]: {
          role: Pieces.Queen,
          color: oppColor,
          promoted: true,
        },
      });
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
        const promotion = await choosePromotion(promotions);

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

  get isPlaying(): boolean {
    return this.state === GameState.Playing;
  }

  get isMyTurn(): boolean {
    return (
      this.isPlaying &&
      (this.turnColor === this.myColor || this.opponent === OpponentType.Human)
    );
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

    if (this.halfMoves >= 100) {
      this.setState(GameState.Draw);
    }

    if (this.opponent === OpponentType.Human) {
      this.bottomColor = this.turnColor;
      this.ground.set({
        orientation: this.turnColor,
        movable: {
          color: this.turnColor,
        },
      });
    }
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
        this.setLoss(this.turnColor, LossReason.Mate);
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

    const nextColor =
      config.opponent === OpponentType.Computer ? config.myColor : "white";

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
    this.refusedPrincessPromotion = {
      white: false,
      black: false,
    };
    this.bottomColor = nextColor;
    this.turnColor = "white";
    this.myColor = config.myColor;
    this.moves.splice(0);

    await this.updateValidMoves();

    this.clocks.white.set(config.totalTime * 1000);
    this.clocks.white.continue();
    this.clocks.black.set(config.totalTime * 1000);

    await this.makeOpponentMove();
  }

  private async updateValidMoves() {
    this.validMoves = await this.engine.validMoves(this.fullFen);

    this.ground.set({
      movable: {
        dests: this.validMoves.destinations,
      },
    });
  }

  private get fullFen(): string {
    const { ground, turnColor, halfMoves, fullMoves, enPassant } = this;
    const fen = boardFenToEngine(ground.getFen());

    // фигуры  цвет_хода  рокировка  превращение_принцессы  взятие_на_проходе  полуходы  полные_ходы
    return `${fen} ${turnColor[0]} - - ${
      enPassant || "-"
    } ${halfMoves} ${fullMoves}`;
  }

  async getHint(): Promise<BestMove | undefined> {
    this.isThinking = true;
    try {
      const move = await this.engine.calculateMove(this.fullFen);
      if (move) {
        this.ground.selectSquare(move.from);
      }
      return move;
    } finally {
      this.isThinking = false;
    }
  }

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

    this.isThinking = true;
    try {
      const move = await this.engine.calculateMove(this.fullFen);
      if (move) {
        this.ground.move(move.from, move.to);

        if (move.promotion) {
          this.ground.setPieces({
            [move.to]: {
              color: this.turnColor,
              role: `${move.promotion}-piece`,
              promoted: true,
            } as Piece,
          });
        }
      }
    } finally {
      this.isThinking = false;
    }
  }

  async stopThinking() {
    if (this.isThinking) {
      await this.engine.stopThinking();
    }
  }

  stop() {
    this.setState(GameState.Paused);
    this.engine.quit();
  }

  private assertPlayingState() {
    assert.ok(this.isPlaying);
  }

  get hasWon(): boolean {
    return (
      !this.isPlaying &&
      (this.opponent === OpponentType.Human ||
        (this.myColor === "white" && this.state === GameState.LossBlack) ||
        (this.myColor === "black" && this.state === GameState.LossWhite))
    );
  }
}
