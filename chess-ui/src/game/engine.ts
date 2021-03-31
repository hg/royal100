import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { Key } from "chessgroundx/types";
import { Clocks } from "./game";
import assert from "assert";
import { EventEmitter } from "events";
import { sleep, withTimeout } from "../utils/async";
import { BestMove, parseBestMove, parseValidMoves } from "../utils/chess";
import { isDevMode, numCpus } from "../utils/system";
import { Rating } from "../utils/consts";
import { clamp } from "../utils/util";

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
  depth?: number;
  moveTime?: number;
}

export class Engine {
  private engine?: ChildProcessWithoutNullStreams;
  private options?: Options;
  private readonly enginePath: string;
  private readonly clocks: Clocks;

  constructor(path: string, clocks: Clocks) {
    this.enginePath = path;
    this.clocks = clocks;
  }

  newGame = async ({ moveTime, ...options }: Options) => {
    this.options = {
      ...options,
      moveTime: moveTime ? moveTime * 1000 : undefined,
    };
    await this.restartEngine();
  };

  calculateMove = async (fen: string): Promise<BestMove> => {
    assert.ok(this.engine);

    while (true) {
      this.position(fen);
      this.go();

      while (true) {
        this.ping();

        try {
          const receive = this.receiveUntil("bestmove", "readyok");
          const response = await withTimeout(receive, 2000);
          const bestMove = parseBestMove(response);
          if (bestMove) {
            return bestMove;
          }
        } catch {
          await this.restartEngine();
          break;
        }

        // Если прочитали не то, что ожидали — добавляем паузу перед следующей
        // итерацией, чтобы не наваливать isready один за другим.
        await sleep(2000);
      }
    }
  };

  validMoves = async (fen: string): Promise<ValidMoves> => {
    assert.ok(this.engine);

    const prefix = "valid_moves: ";

    while (true) {
      this.position(fen);
      this.engine.stdin.write("valid_moves\n");

      try {
        const receive = this.receiveUntil(prefix);
        const response = await withTimeout(receive, 2500);
        const moves = response.substr(response.indexOf(prefix) + prefix.length);
        return parseValidMoves(moves);
      } catch {
        await this.restartEngine();
      }
    }
  };

  stopThinking = () => {
    this.engine?.stdin.write("stop\n");
  };

  quit = () => {
    this.engine?.stdin.write("quit\n");
    this.engine = undefined;
  };

  private lines: string[] = [];
  private linesEvent = new EventEmitter();

  private restartEngine = async () => {
    while (true) {
      this.engine?.kill();

      this.engine = spawn(this.enginePath);
      this.engine.once("exit", (code) => {
        console.info(`chess engine exited with code ${code}`);
      });
      this.engine.stdout.setEncoding("utf8");
      this.engine.stderr.setEncoding("utf8");

      this.engine.stdout.on("data", (rawData: string) => {
        const lines = rawData.toString().split(/\r?\n/);
        this.lines.push(...lines);
        this.linesEvent.emit("data", lines);
      });

      await this.configure();
      this.engine.stdin.write("ucinewgame\n");

      if (await this.isReady()) {
        break;
      }
    }
  };

  private configure = async () => {
    assert.ok(this.options);
    assert.ok(this.engine);

    const setOption = (name: string, value: string) =>
      this.engine!.stdin.write(`setoption name ${name} value ${value}\n`);

    if (isDevMode()) {
      setOption("Debug Log File", "/tmp/log");
    }

    const { threads, rating } = this.options;
    if (threads) {
      const value = clamp(threads, 1, numCpus() * 2);
      setOption("Threads", String(value));
    }

    if (typeof rating === "number" && rating) {
      const value = clamp(rating, Rating.min, Rating.max);
      setOption("UCI_LimitStrength", "true");
      setOption("UCI_Elo", String(value));
    }
  };

  private receiveUntil = (...anyOf: string[]): Promise<string> => {
    assert.ok(this.engine);

    return new Promise((resolve) => {
      // Считаем, что строки для поиска были переданы в порядке приоритета,
      // т.е. первая важнее второй, вторая важнее третьей, и т.д.
      // Дробим полученный текст на отдельные строки и ищем в каждой сначала
      // первую строку, потом, если не нашли её, вторую, и так до последнего
      // аргумента. Возвращаем первый найдённый, всё остальное выбрасывается.
      const search = () => {
        for (const needle of anyOf) {
          for (const [index, line] of this.lines.entries()) {
            if (line.includes(needle)) {
              this.lines.splice(index);
              this.linesEvent.off("data", search);
              resolve(line);
              return true;
            }
          }
        }
        return false;
      };

      if (!search()) {
        this.linesEvent.on("data", search);
      }
    });
  };

  private ping = () => {
    assert.ok(this.engine);
    this.engine.stdin.write("isready\n");
  };

  private isReady = (): Promise<boolean> => {
    assert.ok(this.engine);

    this.ping();
    const receive = this.receiveUntil("readyok");

    return new Promise(async (resolve) => {
      try {
        await withTimeout(receive, 2000);
        resolve(true);
      } catch {
        resolve(false);
      }
    });
  };

  private position = (fen: string) => {
    assert.ok(this.engine);
    this.engine.stdin.write(`position fen ${fen}\n`);
  };

  private go = () => {
    assert.ok(this.options);
    assert.ok(this.engine);

    const wtime = this.clocks.white.remainingMs;
    const btime = this.clocks.black.remainingMs;
    const depth = this.options.depth ? `depth ${this.options.depth}` : "";
    const moveTime = this.options.moveTime
      ? `movetime ${this.options.moveTime}`
      : "";

    const cmd = `go ${depth} ${moveTime} wtime ${wtime} btime ${btime}\n`;

    this.engine.stdin.write(cmd);
  };
}
