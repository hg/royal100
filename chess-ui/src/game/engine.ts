import cg, { Color, Key } from "chessgroundx/types";
import { Clocks } from "./game";
import assert from "assert";
import { EventEmitter } from "events";
import { sleep } from "../utils/async";
import {
  BestMove,
  checkScore,
  parseBestMove,
  parseCheckersResponse,
  parseFen,
  parseFenResponse,
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

interface CastlingAvailability {
  K: boolean;
  Q: boolean;
}

export interface Fen {
  raw: string;
  pieces: string;
  color: Color;
  castling: {
    [key in Color]: CastlingAvailability;
  };
  princess: {
    [key in Color]: boolean;
  };
  enPassant?: {
    from: Key;
    to: Key;
  };
  halfMoves: number;
  fullMoves: number;
}

export function fixBoardFen(fen: cg.FEN): cg.FEN {
  // Движок парсит `10` как `1 0`, поэтому подменяем на две пятёрки
  // (можно заменить на любую другую пару x + y = 10).
  return fen.replaceAll("10", "55");
}

export function fenToString(f: Fen): string {
  return [
    f.pieces,
    f.color[0],
    (f.castling.white.K ? "K" : "") +
      (f.castling.white.Q ? "Q" : "") +
      (f.castling.black.K ? "k" : "") +
      (f.castling.black.Q ? "q" : "") || "-",
    (f.princess.white ? "S" : "") + (f.princess.black ? "s" : "") || "-",
    f.enPassant ? f.enPassant.from + f.enPassant.to : "-",
    f.halfMoves,
    f.fullMoves,
  ].join(" ");
}

interface Options {
  threads?: number;
  depth?: number;
  moveTime?: number;
}

export enum EngineEvent {
  Data = "Data",
  Fen = "Fen",
  Checkers = "Checkers",
  Ready = "Ready",
  Score = "Score",
  BestMove = "BestMove",
  ValidMoves = "ValidMoves",
  Exit = "Exit",
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

  async checkers(): Promise<Key> {
    assert.ok(this.engine);

    while (true) {
      this.engine.postMessage("checkers");

      try {
        return await this.wait(EngineEvent.Checkers, 5000);
      } catch (e) {
        await this.restartEngine();
      }
    }
  }

  async fen(currentFen: string, moves: string[]): Promise<Fen> {
    assert.ok(this.engine);

    while (true) {
      const moveList = moves.join(" ").replaceAll(":", "10");

      this.engine.postMessage(
        `position fen ${currentFen}${
          moveList.length ? " moves " + moveList : ""
        }`
      );
      this.engine.postMessage("fen");

      try {
        const fen: string = await this.wait(EngineEvent.Fen, 5000);
        if (fen) {
          return parseFen(fen);
        }
      } catch (e) {
        await this.restartEngine();
      }
    }
  }

  async validMoves(fen: string): Promise<ValidMoves> {
    assert.ok(this.engine);

    while (true) {
      this.position(fen);
      this.engine.postMessage("valid_moves");

      try {
        return await this.wait(EngineEvent.ValidMoves, 5000);
      } catch {
        await this.restartEngine();
      }
    }
  }

  stopThinking() {
    this.engine?.postMessage("stop");
  }

  quit() {
    this.engine?.postMessage("quit");
    this.engine = undefined;
  }

  private async restartEngine() {
    while (true) {
      this.engine?.removeMessageListener(this.onDataReceived);
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
      console.log("engine", line);

      if (line.includes("readyok")) {
        this.events.emit(EngineEvent.Ready);
        continue;
      }

      const checkers = parseCheckersResponse(line);
      if (checkers) {
        this.events.emit(EngineEvent.Checkers, checkers);
        continue;
      }

      const fen = parseFenResponse(line);
      if (fen) {
        this.events.emit(EngineEvent.Fen, fen);
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
        this.off(event, eventHandler);
        this.off(EngineEvent.Exit, exitHandler);
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

      this.events.once(EngineEvent.Exit, exitHandler);
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
    this.engine?.postMessage("isready");
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

    const depth = this.options.depth ? `depth ${this.options.depth}` : "";
    const moveTime = this.options.moveTime
      ? `movetime ${this.options.moveTime}`
      : "";

    const cmd =
      `go ${depth} ${moveTime} ` +
      (this.clocks.used
        ? `wtime ${this.clocks.white.remainingMs} btime ${this.clocks.black.remainingMs}`
        : "");

    this.engine.postMessage(cmd);
  }
}
