import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { Key, Letter } from "chessgroundx/types";
import { enginePositionToBoard } from "../../utils/interop";
import { Clocks } from "./game";
import { isDevMode } from "../../utils/system";

const reBestMove = /\bbestmove (\w\d+)(\w\d+)(\w?)\b/;
const reMove = /\b(\w\d+)(\w\d+)(\w?)\b/g;

export interface Promotions {
  [fromTo: string]: string[];
}

export interface ValidMoves {
  destinations: {
    [key: string]: Key[];
  };
  promotions: Promotions;
}

interface Options {
  threads?: number;
  rating?: number;
}

export interface BestMove {
  from: Key;
  to: Key;
  promotion?: Letter;
}

export class Engine {
  private readonly engine: ChildProcessWithoutNullStreams;
  private readonly clocks: Clocks;

  constructor(path: string, clocks: Clocks) {
    this.engine = spawn(path);
    this.clocks = clocks;
  }

  private async setOption(name: string, value: string) {
    this.engine.stdin.write(`setoption name ${name} value ${value}\n`);
    await this.isReady();
  }

  async newGame() {
    this.engine.stdin.write("ucinewgame\n");
    await this.isReady();
  }

  async configure({ threads, rating }: Options) {
    if (isDevMode()) {
      await this.setOption("Debug Log File", "/tmp/log");
    }
    if (threads) {
      await this.setOption("Threads", threads + "");
    }
    if (typeof rating === "number" && rating) {
      await this.setOption("UCI_LimitStrength", "true");
      await this.setOption("UCI_Elo", String(rating));
    }
  }

  private receiveUntil = (
    predicate: (data: string) => boolean
  ): Promise<string> => {
    const { stdout } = this.engine;

    return new Promise((resolve, reject) => {
      function unsub() {
        stdout.off("data", dataListener);
        stdout.off("error", errorListener);
      }

      function errorListener(error: Error) {
        unsub();
        reject(error);
      }

      function dataListener(rawData: Buffer) {
        const data = rawData.toString();
        if (predicate(data)) {
          resolve(data);
          unsub();
        }
      }

      stdout.on("data", dataListener);
      stdout.once("error", errorListener);
    });
  };

  async isReady(): Promise<void> {
    const { stdin } = this.engine;
    stdin.write("isready\n");
    await this.receiveUntil((data) => data.includes("readyok"));
  }

  async position(fen: string) {
    const { stdin } = this.engine;
    stdin.write(`position fen ${fen}\n`);
    await this.isReady();
  }

  async validMoves(): Promise<ValidMoves> {
    const { stdin } = this.engine;
    stdin.write("valid_moves\n");

    const data = await this.receiveUntil(() => true);
    const moves = data.matchAll(reMove);

    const result: ValidMoves = {
      promotions: {},
      destinations: {},
    };

    for (let [, from, to, promotion] of moves) {
      from = enginePositionToBoard(from);
      to = enginePositionToBoard(to);

      result.destinations[from] = result.destinations[from] || [];
      result.destinations[from].push(to);

      if (promotion) {
        const fromTo = from + to;
        result.promotions[fromTo] = result.promotions[fromTo] || [];
        result.promotions[fromTo].push(promotion);
      }
    }

    return result;
  }

  async stopThinking() {
    await this.engine.stdin.write("stop\n");
  }

  async think(): Promise<BestMove> {
    const { clocks } = this;

    this.engine.stdin.write(
      `go depth 15 wtime ${clocks.white.remainingMs} btime ${clocks.black.remainingMs}\n`
    );

    const data = await this.receiveUntil((buf) => buf.includes("bestmove"));

    const matchMove = data.match(reBestMove);
    if (matchMove) {
      const [, from, to, promotion] = matchMove;
      return {
        from: enginePositionToBoard(from),
        to: enginePositionToBoard(to),
        promotion: promotion as Letter,
      };
    }

    throw new Error("unexpected data: " + data);
  }

  quit() {
    this.engine.stdin.write("quit\n");
  }
}
