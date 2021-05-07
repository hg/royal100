import { Color, Key, Letter } from "chessgroundx/types";
import { read } from "chessgroundx/fen";
import { enginePositionToBoard } from "./interop";
import assert from "assert";
import { Fen, ValidMoves } from "../game/engine";

const reWs = /\s+/;
const reOne = /1{2,9}/g;

export function randomColor(): Color {
  return Math.random() <= 0.5 ? "white" : "black";
}

export function validateFen(fen: string) {
  const field = read(fen);
  const squares = Object.keys(field).filter(Boolean);

  if (squares.length < 2) {
    return false;
  }

  // TODO: грубая проверка, доработать
  let hasWhite = false,
    hasBlack = false;

  for (const square of squares) {
    const piece = field[square];

    if (piece?.color === "black") {
      hasBlack = true;
    }
    if (piece?.color === "white") {
      hasWhite = true;
    }
    if (hasWhite && hasBlack) {
      return true;
    }
  }

  return false;
}

export interface PieceMove {
  from: string;
  to: string;
  promotion?: string;
}

const reMove = /\b(\w\d+)(\w\d+)(\w?)\b/g;

export function parseMoves(data: string): PieceMove[] {
  const moves = data.matchAll(reMove);
  const result: PieceMove[] = [];

  for (const [, from, to, promotion] of moves) {
    result.push({
      from: enginePositionToBoard(from),
      to: enginePositionToBoard(to),
      promotion,
    });
  }

  return result;
}

export function parseFen(fen: string): Fen {
  const [
    pieces,
    color,
    castling,
    princess,
    enPassant,
    halfMoves,
    fullMoves,
  ] = fen.split(reWs);

  return {
    raw: fen,
    pieces: pieces.replaceAll(reOne, (sub) => sub.length.toString()),
    color: color === "w" ? "white" : "black",
    castling: {
      white: {
        K: castling.includes("K"),
        Q: castling.includes("Q"),
      },
      black: {
        K: castling.includes("k"),
        Q: castling.includes("q"),
      },
    },
    princess: {
      white: princess.includes("S"),
      black: princess.includes("s"),
    },
    enPassant: enPassant === "-" ? undefined : (enPassant as Key),
    halfMoves: Number(halfMoves),
    fullMoves: Number(fullMoves),
  };
}

export function parseCheckersResponse(data: string): Key[] | undefined {
  const prefix = "checkers: ";

  if (!data.startsWith(prefix)) {
    return undefined;
  }

  const body = data.substr(prefix.length).trim();
  const matches = body.matchAll(/([a-j]\d+)/g);
  const keys: Key[] = [];

  for (const [, key] of matches) {
    keys.push(key.replace("10", ":") as Key);
  }

  return keys;
}

export function parseFenResponse(data: string): string | undefined {
  const prefix = "fen: ";

  if (data.startsWith(prefix)) {
    return data.substr(prefix.length);
  }

  return undefined;
}

export function parseValidMoves(data: string): ValidMoves | undefined {
  const prefix = "valid_moves: ";

  if (!data.includes(prefix)) {
    return undefined;
  }

  const moves = data.substr(data.indexOf(prefix) + prefix.length);
  const result: ValidMoves = { promotions: {}, destinations: {} };

  for (const { from, to, promotion } of parseMoves(moves)) {
    result.destinations[from] = result.destinations[from] || [];
    result.destinations[from].push(to as Key);

    if (promotion) {
      const fromTo = from + to;
      result.promotions[fromTo] = result.promotions[fromTo] || [];
      result.promotions[fromTo].push(promotion);
    }
  }

  return result;
}

export interface BestMove {
  from: Key;
  to: Key;
  promotion?: Letter;
}

const reBestMove = /\bbestmove ([a-j]\d+)([a-j]\d+)(\w?)\b/;

export function parseBestMove(data: string): BestMove | undefined {
  const matchMove = data.match(reBestMove);
  if (!matchMove) {
    return undefined;
  }
  const [, from, to, promotion] = matchMove;
  return {
    from: enginePositionToBoard(from),
    to: enginePositionToBoard(to),
    promotion: promotion as Letter,
  };
}

export enum ScoreType {
  Cp,
  Mate,
}

export interface Score {
  type: ScoreType;
  value: number;
}

const reScore = /\bscore (cp|mate) (-?\d+)\b/;

export function checkScore(line: string): Score | undefined {
  if (!line.includes("info")) {
    return undefined;
  }
  const match = line.match(reScore);
  if (match) {
    const [, type, score] = match;
    if (type === "mate") {
      return { type: ScoreType.Mate, value: Number(score) };
    }
    if (type === "cp") {
      return { type: ScoreType.Cp, value: Number(score) };
    }
    assert.fail("unexpected type " + type);
  }
  return undefined;
}

// Формулы расчёта украдены из lichess.org
export function winningChances(cp: number): number {
  return 2 / (1 + Math.exp(-0.004 * cp)) - 1;
}
