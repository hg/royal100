import { Api } from "chessgroundx/api";
import { Color, FEN, Key, Piece } from "chessgroundx/types";
import { Chessground } from "chessgroundx";
import { getEnginePath, numCpus } from "../../utils/system";
import { notification } from "antd";
import { Engine, Promotions } from "./engine";
import { Clock } from "./clock";
import { choosePromotion } from "./gameUi";
import { Dimension, Fen } from "../../utils/consts";
import { otherColor } from "../../utils/chess";
import { observable } from "mobx";

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
}

export class Game {
  private engine: Engine;
  private ground: Api;
  private myColor: Color = "white";
  private opponentColor: Color = "black";
  private turnColor: Color = "white";
  private halfMoves = 0;
  private fullMoves = 1;
  private promotions?: Promotions;

  clocks = { white: new Clock(), black: new Clock() };
  moves = observable<Move>([]);

  constructor(element: HTMLElement) {
    const enginePath = getEnginePath();
    this.engine = new Engine(enginePath);

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
  }

  private onMove = async (orig: Key, dest: Key, capturedPiece?: Piece) => {
    console.log("move", { orig, dest, capturedPiece });

    const piece = this.ground.state.pieces[dest];

    this.moves.push({
      from: orig,
      to: dest,
      color: this.turnColor,
      captured: capturedPiece,
      piece,
    });

    if (this.turnColor === this.myColor && this.promotions) {
      const promotions = this.promotions[orig + dest];
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

    // Если взяли фигуру или подвинули пешку, сбрасываем полу-ходы
    if (capturedPiece || piece?.role === "p-piece") {
      this.halfMoves = 0;
      console.log("half-moves reset");
    }

    if (this.turnColor === this.opponentColor) {
      await this.step();
    }
  };

  private async toggleColor() {
    this.clocks[this.turnColor].stop();

    if (this.turnColor === "black") {
      this.fullMoves++;
      this.turnColor = "white";
    } else {
      this.turnColor = "black";
    }

    this.clocks[this.turnColor].continue();

    this.ground.set({
      turnColor: this.turnColor,
    });

    if (this.turnColor === this.myColor) {
      await this.updateValidMoves();
    }

    this.halfMoves++;

    if (this.halfMoves >= 100) {
      notification.warn({ message: "Ничья" });
      throw new Error("100 half-moves draw");
    }
  }

  async newGame({ myColor, fen, totalTime, skill }: GameConfig) {
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

    this.turnColor = "white";
    this.myColor = myColor;
    this.opponentColor = otherColor(myColor);

    await this.updateValidMoves();

    this.clocks.white.set(totalTime);
    this.clocks.white.continue();
    this.clocks.black.set(totalTime);
  }

  private async updateValidMoves() {
    await this.updatePosition();

    const moves = await this.engine.validMoves();

    this.ground.set({
      movable: {
        dests: moves.destinations,
      },
    });

    this.promotions = moves.promotions;
  }

  private get fullFen(): string {
    const fen = this.ground.getFen().replaceAll("10", "55");
    const fullFen = `${fen}1 ${this.turnColor[0]} - - ${this.halfMoves} ${this.fullMoves}`;
    console.log({ fullFen });
    return fullFen;
  }

  private async updatePosition() {
    await this.engine.position(this.fullFen);
  }

  async step() {
    const { ground, engine } = this;

    await this.updatePosition();
    const { move, info } = await engine.go(5);

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
    this.engine.quit();
  };
}
