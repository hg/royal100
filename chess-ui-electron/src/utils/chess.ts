import { Key, Letter } from "chessgroundx/types";
import { read } from "chessgroundx/fen";
import { enginePositionToBoard } from "./interop";
import assert from "assert";
import { ValidMoves } from "../game/engine";

const reKey = /^([abcdefghij])([0-9:])$/;

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

export interface EnPassant {
  dests: Key[];
  target?: Key;
}

export function getEnPassant(from: Key, to: Key): EnPassant {
  return {
    dests: getEnPassantTargets(from, to),
    target: to,
  };
}

function getEnPassantTargets(from: Key, to: Key): Key[] {
  const fromMatch = from.match(reKey);
  if (!fromMatch) {
    return [];
  }
  const toMatch = to.match(reKey);
  if (!toMatch) {
    return [];
  }

  let [, col, fromRow] = fromMatch;
  let [, toCol, toRow] = toMatch;

  if (col !== toCol) {
    return [];
  }

  fromRow = Number(fromRow);
  toRow = Number(toRow);

  if (fromRow === 2) {
    // При пропуске третьей строки добавляем её в ячейки снятия в проходе
    if (toRow === 4) {
      return [`${col}3`];
    }
    // При пропуске третьей и четвёртой добавляем обе
    if (toRow === 5) {
      return [`${col}3`, `${col}4`];
    }
  }

  if (fromRow === 9) {
    // Здесь аналогично, но для противоположной стороны
    if (toRow === 7) {
      return [`${col}8`];
    }
    if (toRow === 6) {
      return [`${col}8`, `${col}7`];
    }
  }

  return [];
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

export function parseValidMoves(data: string): ValidMoves | undefined {
  const prefix = "valid_moves: ";

  if (!data.includes(prefix)) {
    return undefined;
  }

  const moves = data.substr(data.indexOf(prefix) + prefix.length);
  const result: ValidMoves = { promotions: {}, destinations: {} };

  for (const { from, to, promotion } of parseMoves(moves)) {
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
