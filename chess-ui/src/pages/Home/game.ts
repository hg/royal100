import { Api } from "chessgroundx/api";
import { Color, FEN, Piece } from "chessgroundx/types";
import { Chessground } from "chessgroundx";
import * as cg from "chessgroundx/types";
import { numCpus } from "../../utils/system";
import { notification } from "antd";
import { Engine } from "./engine";
import { Clock } from "./clock";

const dimension10x10 = 4; // Geometry.dim10x10

// Мат в пару ходов
// const startFen = "55/55/5k4/55/4Q~B4/55/2Q~1T5/55/8K1/551 w - Ss 18 10";

// promotion в один ход
// const startFen = "55/4k2P2/8P1/55/1p8/1s8/4T5/55/1B6K1/551 w - Ss 146 74";

// стартовая позиция
const startFen =
  "rnbskqtbnr/pppppppppp/10/10/10/10/10/10/PPPPPPPPPP/RNBSKQTBNR1 w - - 0 1";
// const startFen = "rnbskqtbnr/pppppppppp/10/10/10/10/10/10/PPPPPPPPPP/RNBSKQTBNR1 w KQkq Ss 0 1";

const enginePath = "/home/neko/royal";

// const enginePath = "/home/neko/src/my/royal100/engine/royal100";

interface GameConfig {
  myColor: Color;
  fen?: FEN;
}

function otherColor(color: Color): Color {
  switch (color) {
    case "black":
      return "white";

    case "white":
      return "black";
  }
}

export class Game {
  private engine: Engine;
  private ground: Api;
  private myColor: Color = "white";
  private opponentColor: Color = "black";
  private turnColor: Color = "white";
  private halfMove = 0;
  private move = 1;
  private clockWhite = new Clock();
  private clockBlack = new Clock();

  constructor(element: HTMLElement) {
    this.engine = new Engine(enginePath);

    this.ground = Chessground(element, {
      geometry: dimension10x10,
      variant: "chess",
      fen: startFen,
      turnColor: this.turnColor,
      orientation: this.myColor,
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

  private onMove = (orig: cg.Key, dest: cg.Key, capturedPiece?: cg.Piece) => {
    console.log("move", { orig, dest, capturedPiece });

    this.toggleColor();

    if (this.turnColor === this.opponentColor) {
      this.step();
    }
  };

  private async toggleColor() {
    if (this.turnColor === "black") {
      this.move++;
      this.turnColor = "white";
    } else {
      this.turnColor = "black";
    }

    this.ground.set({
      turnColor: this.turnColor,
    });

    if (this.turnColor === this.myColor) {
      await this.updateValidMoves();
    }

    this.halfMove++;
  }

  async newGame({ myColor, fen }: GameConfig) {
    const { engine, ground } = this;

    await engine.isReady();
    await engine.configure({
      skill: 10,
      threads: numCpus(),
    });
    await engine.newGame();

    ground.set({
      turnColor: "white",
      lastMove: undefined,
      fen: fen || startFen,
    });

    this.turnColor = "white";
    this.myColor = myColor;
    this.opponentColor = otherColor(myColor);

    await this.updateValidMoves();
  }

  private async updateValidMoves() {
    await this.updatePosition();

    const moves = await this.engine.validMoves();

    this.ground.set({
      movable: {
        dests: moves,
      },
    });
  }

  private get fullFen(): string {
    const fen = this.ground.getFen().replaceAll("10", "55");
    const fullFen = `${fen}1 ${this.turnColor[0]} - - ${this.halfMove} ${this.move}`;

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
