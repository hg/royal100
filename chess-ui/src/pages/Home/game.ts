import { Api } from "chessgroundx/api";
import { Color, FEN, Key, Piece } from "chessgroundx/types";
import { Chessground } from "chessgroundx";
import { getEnginePath, numCpus } from "../../utils/system";
import { notification } from "antd";
import { BestMove, Engine, ValidMoves } from "./engine";
import { Clock } from "./clock";
import { choosePromotion } from "./gameUi";
import { Dimension, Fen } from "../../utils/consts";
import { otherColor } from "../../utils/chess";
import { action, makeAutoObservable, reaction } from "mobx";
import { isEmpty } from "../../utils/util";
import assert from "assert";
import { boardFenToEngine } from "../../utils/interop";

interface GameConfig {
  skill: number;
  myColor: Color;
  fen?: FEN;
  totalTime: number;
  plyTime: number;
}

interface Move {
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

  lossReason = LossReason.Mate;
  state = GameState.Paused;
  moves: Move[] = [];
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
      turnColor: this.turnColor,
      autoCastle: true,
      movable: {
        free: false,
        color: this.myColor,
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
      const state =
        side === "white" ? GameState.LossWhite : GameState.LossBlack;
      this.setState(state);
      this.lossReason = reason;
    }
  };

  @action
  private setState = (state: GameState) => {
    this.state = state;

    console.log({ state });

    if (!this.isPlaying) {
      this.clocks.black.stop();
      this.clocks.white.stop();
    }
  };

  private onMove = async (orig: Key, dest: Key, captured?: Piece) => {
    console.log("move", { orig, dest, captured });

    const piece = this.ground.state.pieces[dest];

    this.moves.push({
      from: orig,
      to: dest,
      color: this.turnColor,
      fen: this.fullFen,
      captured,
      piece,
    });

    if (this.turnColor === this.myColor && this.validMoves?.promotions) {
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

    await this.toggleColor();

    if (!this.isPlaying) {
      return;
    }

    // Если взяли фигуру или подвинули пешку, сбрасываем полу-ходы
    if (captured || piece?.role === "p-piece") {
      this.halfMoves = 0;
      console.log("half-moves reset");
    }

    if (this.turnColor === this.opponentColor) {
      await this.step();
    }
  };

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

  async newGame({ myColor, fen, totalTime, skill }: GameConfig) {
    assert.ok(!this.isPlaying);

    const { engine, ground } = this;

    await engine.isReady();
    await engine.configure({
      skill,
      threads: numCpus(),
    });
    await engine.newGame();

    ground.set({
      turnColor: "white",
      orientation: this.myColor,
      lastMove: undefined,
      fen: fen || Fen.start,
    });

    this.setState(GameState.Playing);
    this.turnColor = "white";
    this.myColor = myColor;
    this.opponentColor = otherColor(myColor);

    await this.updateValidMoves();

    this.clocks.white.set(totalTime);
    this.clocks.white.continue();
    this.clocks.black.set(totalTime);
  }

  private async updateValidMoves() {
    this.assertPlayingState();

    await this.updatePosition();

    this.validMoves = await this.engine.validMoves();

    this.ground.set({
      movable: {
        dests: this.validMoves.destinations,
      },
    });
  }

  private get fullFen(): string {
    const fen = boardFenToEngine(this.ground.getFen());
    const fullFen = `${fen} ${this.turnColor[0]} - - ${this.halfMoves} ${this.fullMoves}`;
    console.log({ fullFen });
    return fullFen;
  }

  private async updatePosition() {
    this.assertPlayingState();
    await this.engine.position(this.fullFen);
  }

  async getHint(): Promise<BestMove | undefined> {
    this.assertPlayingState();

    const { engine, ground } = this;

    await this.updatePosition();
    const { move } = await engine.go();

    if (move) {
      ground.selectSquare(move.from);
    }

    return move;
  }

  forfeit() {
    if (this.isPlaying) {
      this.setLoss(this.myColor, LossReason.Forfeit);
    }
  }

  private async step() {
    this.assertPlayingState();

    const { ground, engine } = this;

    await this.updatePosition();
    const { move, info } = await engine.go();

    console.log({ move, info });

    if (info?.mated) {
      notification.success({
        message: "Мат",
      });
      return;
    }

    if (move) {
      ground.move(move.from, move.to);

      if (move.promotion) {
        ground.setPieces({
          [move.to]: {
            color: this.turnColor,
            role: `${move.promotion}-piece`,
            promoted: true,
          } as Piece,
        });
      }
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
