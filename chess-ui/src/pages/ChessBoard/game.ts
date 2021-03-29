import { Api } from "chessgroundx/api";
import { Color, FEN, Key, Piece, Role } from "chessgroundx/types";
import { Chessground } from "chessgroundx";
import { getEnginePath, numCpus } from "../../utils/system";
import { BestMove, Engine, ValidMoves } from "./engine";
import { Clock } from "./clock";
import { choosePromotion, confirmPrincessPromotion } from "./gameUi";
import { Dimension, Fen, Pieces } from "../../utils/consts";
import { getEnPassant } from "../../utils/chess";
import { action, makeAutoObservable, reaction } from "mobx";
import { isEmpty } from "../../utils/util";
import assert from "assert";
import { boardFenToEngine } from "../../utils/interop";
import { read } from "chessgroundx/fen";
import { sound, Track } from "./audio";
import { opposite } from "chessgroundx/util";

export interface GameConfig {
  rating: number;
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
  private myColor: Color = "white";
  private opponentColor: Color = "black";
  private turnColor: Color = "white";
  private halfMoves = 0;
  private fullMoves = 1;
  private validMoves?: ValidMoves;
  private enPassantTarget?: Key;
  private enPassant: Key[] = [];
  private refusedPrincessPromotion = false;

  lossReason = LossReason.Mate;
  state = GameState.Paused;
  moves: Move[] = [];
  isThinking = false;
  clocks: Clocks = {
    white: new Clock(),
    black: new Clock(),
  };

  constructor(element: HTMLElement) {
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
      },
    });

    makeAutoObservable(this);

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

  @action
  private setLoss = (side: Color, reason: LossReason) => {
    if (this.isPlaying) {
      this.ground.stop();
      const state =
        side === "white" ? GameState.LossWhite : GameState.LossBlack;
      this.setState(state);
      this.lossReason = reason;
    }
  };

  @action
  private setState = (state: GameState) => {
    this.state = state;

    if (!this.isPlaying) {
      this.clocks.black.stop();
      this.clocks.white.stop();
    }
  };

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

  private get pieces() {
    // TODO: state.pieces почему-то содержит только поле 8×8, но если перегнать
    //       FEN в Piece[], строится корректное поле 10×10. Медленно, надо разобраться.
    return read(this.ground.getFen());
  }

  @action
  private addMove = (move: Move) => {
    this.moves.push(move);
    console.log("move", move);
  };

  private locatePiece(role: Role, color: Color): Key | undefined {
    // TODO: адски медленно, разобраться, почему в pieces лежит поле 8×8
    const pieces = read(this.ground.getFen());

    for (const [key, piece] of Object.entries(pieces)) {
      if (piece && piece.role === role && piece.color === color) {
        return key;
      }
    }

    return undefined;
  }

  private onMove = async (orig: Key, dest: Key, captured?: Piece) => {
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

    const piece = this.pieces[dest];

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

    if (this.turnColor === this.myColor) {
      await this.checkPawnPromotions(orig, dest);
    }

    await this.toggleColor();

    if (!this.isPlaying) {
      return;
    }

    // Если взяли фигуру или подвинули пешку, сбрасываем полу-ходы
    if (captured || piece?.role === "p-piece") {
      this.halfMoves = 0;
    }

    // Если следующий ход противника, даём движку подумать
    if (this.turnColor === this.opponentColor) {
      await this.step();
    }
  };

  private async checkRoyaltyPromotions(captured: Piece) {
    const oppColor = opposite(this.turnColor);
    const capturedMyPiece = oppColor === this.myColor;
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
      // Игрок уже отказывался от превращения — больше не спрашиваем
      if (capturedMyPiece && this.refusedPrincessPromotion) {
        return;
      }
      const princessLocation = this.locatePiece(Pieces.Princess, oppColor);
      if (!princessLocation) {
        return;
      }
      if (capturedMyPiece) {
        const promote = await confirmPrincessPromotion();
        if (!promote) {
          this.refusedPrincessPromotion = true;
          return;
        }
      }
      this.ground.setPieces({
        [princessLocation]: {
          role: Pieces.Queen,
          promoted: true,
          color: oppColor,
        },
      });
    }
  }

  private async checkPawnPromotions(orig: Key, dest: Key) {
    if (this.validMoves?.promotions) {
      const promotions = this.validMoves.promotions[orig + dest];

      if (promotions?.length) {
        const promotion = await choosePromotion(promotions);

        this.ground.setPieces({
          [dest]: {
            color: this.myColor,
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
    return this.isPlaying && this.turnColor === this.myColor;
  }

  private async toggleColor() {
    this.clocks[this.turnColor].stop();

    if (this.turnColor === "black") {
      this.fullMoves++;
      this.turnColor = "white";
    } else {
      this.turnColor = "black";
    }

    this.clocks[this.turnColor].continue();
    this.ground.set({ turnColor: this.turnColor });

    await this.updateValidMoves();

    this.detectMate();

    if (!this.isPlaying) {
      return;
    }

    this.halfMoves++;

    if (this.halfMoves >= 100) {
      this.setState(GameState.Draw);
    }
  }

  private detectMate = () => {
    if (this.validMoves && isEmpty(this.validMoves?.destinations)) {
      this.setLoss(this.turnColor, LossReason.Mate);
    }
  };

  async newGame(config: GameConfig) {
    assert.ok(!this.isPlaying);

    await this.engine.isReady();

    await this.engine.newGame({
      rating: config.rating,
      depth: config.depth,
      threads: numCpus(),
      moveTime: config.plyTime,
    });

    this.ground.set({
      turnColor: "white",
      orientation: config.myColor,
      lastMove: undefined,
      fen: config.fen || Fen.start,
      movable: {
        color: config.myColor,
      },
    });

    this.setState(GameState.Playing);
    this.refusedPrincessPromotion = false;
    this.turnColor = "white";
    this.myColor = config.myColor;
    this.opponentColor = opposite(config.myColor);
    this.moves.splice(0);

    await this.updateValidMoves();

    this.clocks.white.set(config.totalTime);
    this.clocks.white.continue();
    this.clocks.black.set(config.totalTime);

    if (this.turnColor === this.opponentColor) {
      await this.step();
    }
  }

  private async updateValidMoves() {
    await this.updatePosition();

    this.validMoves = await this.engine.validMoves();

    this.ground.set({
      movable: {
        dests: this.validMoves.destinations,
      },
    });
  }

  private get fullFen(): string {
    const { ground, turnColor, halfMoves, fullMoves, enPassant } = this;
    const fen = boardFenToEngine(ground.getFen());

    return `${fen} ${turnColor[0]} - - ${
      enPassant || "-"
    } ${halfMoves} ${fullMoves}`;
  }

  private async updatePosition() {
    this.assertPlayingState();
    await this.engine.position(this.fullFen);
  }

  async getHint(): Promise<BestMove | undefined> {
    await this.updatePosition();

    this.isThinking = true;
    try {
      const move = await this.engine.think();
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

  private async step() {
    await this.updatePosition();

    this.isThinking = true;
    try {
      const move = await this.engine.think();
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

  stop = () => {
    this.setState(GameState.Paused);
    this.engine.quit();
  };

  private assertPlayingState = () => {
    assert.ok(this.isPlaying);
  };
}
