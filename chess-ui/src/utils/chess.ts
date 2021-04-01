import { Key, Letter } from "chessgroundx/types";
import { read } from "chessgroundx/fen";
import { enginePositionToBoard } from "./interop";
import { ValidMoves } from "../pages/ChessBoard/engine";

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

export function getEnPassant(from: Key, to: Key): Key[] {
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

export function parseValidMoves(moves: string): ValidMoves {
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

export function parseBestMove(data: string): BestMove | null {
  const matchMove = data.match(reBestMove);
  if (!matchMove) {
    return null;
  }
  const [, from, to, promotion] = matchMove;
  return {
    from: enginePositionToBoard(from),
    to: enginePositionToBoard(to),
    promotion: promotion as Letter,
  };
}

const reScore = /\bscore cp (-?\d+)\b/;

export function checkScore(lines: string[]): number | undefined {
  for (const line of lines) {
    if (line.includes("info")) {
      const match = line.match(reScore);
      if (match) {
        return Number(match[1]);
      }
    }
  }
  return undefined;
}
