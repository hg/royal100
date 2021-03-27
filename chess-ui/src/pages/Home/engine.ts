import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { Key, Letter } from "chessgroundx/types";

const reMated = /\binfo .* score mate 0\b/;
const reBestMove = /\bbestmove (\w\d+)(\w\d+)(\w?)\b/;

interface ValidMoves {
  [key: string]: Key[];
}

interface Options {
  threads?: number;
  skill?: number;
}

interface MoveResult {
  info?: Info;
  move?: Move;
}

interface Info {
  mated: boolean;
}

interface Move {
  from: Key;
  to: Key;
  promotion?: Letter;
}

export class Engine {
  private readonly engine: ChildProcessWithoutNullStreams;

  constructor(path: string) {
    this.engine = spawn(path);
  }

  private async setOption(name: string, value: string) {
    this.engine.stdin.write(`setoption name ${name} value ${value}\n`);
    await this.isReady();
  }

  async newGame() {
    this.engine.stdin.write("ucinewgame\n");
    await this.isReady();
  }

  async configure({ threads, skill }: Options) {
    await this.setOption("Debug Log File", "/tmp/log");

    if (threads) {
      await this.setOption("Threads", threads + "");
    }
    if (typeof skill === "number" && skill >= 0 && skill <= 20) {
      await this.setOption("Skill Level", skill + "");
    }
  }

  isReady(): Promise<void> {
    const { stdin, stdout } = this.engine;

    stdin.write("isready\n");

    return new Promise((resolve, reject) => {
      function errorListener(error: Error) {
        stdout.off("data", dataListener);
        reject(error);
      }

      function dataListener(rawData: Buffer) {
        const data = rawData.toString();

        if (data.indexOf("readyok") !== -1) {
          stdin.off("data", dataListener);
          stdout.off("data", errorListener);
          resolve();
        }
      }

      stdout.on("data", dataListener);
      stdout.once("error", errorListener);
    });
  }

  async position(fen: string) {
    const { stdin } = this.engine;

    stdin.write(`position fen ${fen}\n`);
    await this.isReady();
  }

  validMoves(): Promise<ValidMoves> {
    const { stdin, stdout } = this.engine;

    stdin.write("valid_moves\n");

    return new Promise((resolve, reject) => {
      function unsub() {
        stdout.off("data", dataHandler);
        stdout.off("error", errorHandler);
      }

      function errorHandler(error: Error) {
        unsub();
        reject(error);
      }

      function dataHandler(dataRaw: Buffer) {
        unsub();

        const data = dataRaw.toString();
        const moves = data.trim().split(" ");
        const result: ValidMoves = {};

        for (const move of moves) {
          const [from, to] = move.split(":");
          if (!from || !to) {
            console.error("invalid move", { from, to });
            continue;
          }
          if (!result[from]) {
            result[from] = [];
          }
          result[from].push(to);
        }

        resolve(result);
      }

      stdout.once("data", dataHandler);
      stdout.on("error", errorHandler);
    });
  }

  go(depth: number): Promise<MoveResult> {
    const { stdin, stdout } = this.engine;

    stdin.write(`go depth ${depth}\n`);

    return new Promise((resolve, reject) => {
      function unsub() {
        stdout.off("data", dataListener);
        stdout.off("error", errorListener);
      }

      function dataListener(rawData: Buffer) {
        const data = rawData.toString();

        const mated = data.match(reMated);
        if (mated) {
          unsub();
          resolve({
            info: { mated: true },
          });
          return;
        }

        const matchMove = data.match(reBestMove);
        if (matchMove) {
          unsub();

          let [, from, to, promotion] = matchMove;

          // chessboardx uses : instead of 10
          from = from.replace("10", ":");
          to = to.replace("10", ":");

          resolve({
            move: { from, to, promotion: promotion as Letter },
          });
          return;
        }
      }

      function errorListener(error: Error) {
        unsub();
        reject(error);
      }

      stdout.on("data", dataListener);
      stdout.once("error", errorListener);
    });
  }

  quit() {
    this.engine.stdin.write("quit\n");
  }
}
