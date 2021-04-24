import { Key } from "chessgroundx/types";
import { Clocks } from "./game";
import assert from "assert";
import { EventEmitter } from "events";
import { sleep } from "../utils/async";
import {
  BestMove,
  checkScore,
  parseBestMove,
  parseValidMoves,
} from "../utils/chess";
import { numCpus } from "../utils/system";
import { clamp } from "../utils/util";

export interface Promotions {
  [fromTo: string]: string[];
}

export interface Destinations {
  [key: string]: Key[];
}

export interface ValidMoves {
  destinations: Destinations;
  promotions: Promotions;
}

interface Options {
  threads?: number;
  depth?: number;
  moveTime?: number;
}

export enum EngineEvent {
  Data = "data",
  Ready = "ready",
  Score = "score",
  BestMove = "bestMove",
  ValidMoves = "validMoves",
}

export class Engine {
  private engine?: RoyalEngine;
  private options?: Options;
  private readonly clocks: Clocks;
  private readonly events = new EventEmitter();

  constructor(clocks: Clocks) {
    this.clocks = clocks;

    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
    this.onDataReceived = this.onDataReceived.bind(this);
  }

  on<T>(event: EngineEvent, handler: (data: T) => void) {
    this.events.on(event, handler);
  }

  off<T>(event: EngineEvent, handler: (...args: T[]) => void) {
    this.events.off(event, handler);
  }

  async newGame({ moveTime, ...options }: Options) {
    this.options = {
      ...options,
      moveTime: moveTime ? moveTime * 1000 : undefined,
    };
    await this.restartEngine();
  }

  async calculateMove(fen: string): Promise<BestMove> {
    assert.ok(this.engine);

    while (true) {
      this.position(fen);
      this.go();

      try {
        const move: BestMove = await this.wait(EngineEvent.BestMove);
        if (move) {
          return move;
        }
      } catch {
        await this.restartEngine();
      }

      await sleep(1000, null);
    }
  }

  async validMoves(fen: string): Promise<ValidMoves> {
    assert.ok(this.engine);

    while (true) {
      this.position(fen);
      this.engine.postMessage(`valid_moves`);

      try {
        return await this.wait(EngineEvent.ValidMoves, 5000);
      } catch {
        await this.restartEngine();
      }
    }
  }

  stopThinking() {
    this.engine?.postMessage(`stop`);
  }

  quit() {
    this.engine?.postMessage(`quit`);
    this.engine = undefined;
  }

  private async restartEngine() {
    while (true) {
      this.engine?.terminate();

      this.engine = await Royal100();
      this.engine.addMessageListener(this.onDataReceived);

      await this.configure();
      this.engine.postMessage("ucinewgame");

      if (await this.isReady()) {
        break;
      }
    }
  }

  private onDataReceived(data: string) {
    const lines = data.split(/\r?\n/);

    for (const line of lines) {
      if (line.includes("readyok")) {
        this.events.emit(EngineEvent.Ready);
        continue;
      }

      const validMoves = parseValidMoves(line);
      if (validMoves) {
        this.events.emit(EngineEvent.ValidMoves, validMoves);
        continue;
      }

      const score = checkScore(line);
      if (score) {
        this.events.emit(EngineEvent.Score, score);
        continue;
      }

      const bestMove = parseBestMove(line);
      if (bestMove) {
        this.events.emit(EngineEvent.BestMove, bestMove);
      }
    }

    this.events.emit(EngineEvent.Data, lines);
  }

  private wait<T>(event: EngineEvent, timeoutMs?: number) {
    return new Promise<T>((resolve, reject) => {
      let timeout: NodeJS.Timeout | null = null;

      const unsub = () => {
        if (timeout !== null) {
          clearTimeout(timeout);
        }
        this.events.off(event, eventHandler);
        this.events.off("exit", exitHandler);
      };

      if (timeoutMs) {
        timeout = setTimeout(() => {
          unsub();
          reject(new Error("timeout reached"));
        }, timeoutMs);
      }

      const exitHandler = () => {
        unsub();
        reject(new Error("engine exited"));
      };

      const eventHandler = (...data: T[]) => {
        unsub();
        resolve(data[0]);
      };

      this.events.once("exit", exitHandler);
      this.events.once(event, eventHandler);
    });
  }

  private async configure() {
    assert.ok(this.options);
    assert.ok(this.engine);

    const setOption = (name: string, value: string) =>
      this.engine?.postMessage(`setoption name ${name} value ${value}`);

    const { threads } = this.options;
    if (threads) {
      const value = clamp(threads, 1, numCpus() * 2);
      setOption("Threads", String(value));
    }
  }

  private async isReady(): Promise<boolean> {
    this.engine?.postMessage(`isready`);
    try {
      await this.wait(EngineEvent.Ready, 5000);
      return true;
    } catch {
      return false;
    }
  }

  private position(fen: string) {
    assert.ok(this.engine);
    this.engine.postMessage(`position fen ${fen}`);
  }

  private go() {
    assert.ok(this.options);
    assert.ok(this.engine);

    const wtime = this.clocks.white.remainingMs;
    const btime = this.clocks.black.remainingMs;
    const depth = this.options.depth ? `depth ${this.options.depth}` : "";
    const moveTime = this.options.moveTime
      ? `movetime ${this.options.moveTime}`
      : "";

    const cmd = `go ${depth} ${moveTime} wtime ${wtime} btime ${btime}`;

    this.engine.postMessage(cmd);
  }
}
