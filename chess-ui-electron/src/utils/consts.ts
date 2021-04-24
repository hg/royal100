// Импорт констант по пока не выясненной причине не работает,
// поэтому перетаскию нужные сюда вручную

import { File, Key, Rank, Role } from "chessgroundx/types";

export const dimension = {
  dim10x10: 4,
};

export const castle = {
  white: {
    rank: "1" as Rank,
    rookCells: {
      K: "a1" as Key,
      Q: "j1" as Key,
    },
    kingCell: "e1" as Key,
    destinations: {
      K: "c1" as File,
      Q: "h1" as File,
    },
    movement: {
      K: ["e1", "d1", "c1"],
      Q: ["e1", "f1", "g1", "h1"],
    },
  },
  black: {
    rank: ":" as Rank,
    rookCells: {
      K: "a:" as Key,
      Q: "j:" as Key,
    },
    kingCell: "e:" as Key,
    destinations: {
      K: "c:" as File,
      Q: "h:" as File,
    },
    movement: {
      K: ["e:", "d:", "c:"],
      Q: ["e:", "f:", "g:", "h:"],
    },
  },
  rookFile: {
    K: "a" as File,
    Q: "j" as File,
  },
};

export const drawMinMoves = 5;

export const drawHalfMoves = 100;

export const pieces = {
  pawn: "p-piece" as Role,
  prince: "t-piece" as Role,
  princess: "s-piece" as Role,
  king: "k-piece" as Role,
  queen: "q-piece" as Role,
  rook: "r-piece" as Role,
  knight: "n-piece" as Role,
  bishop: "b-piece" as Role,
} as const;

export const Fen = {
  start:
    "rnbskqtbnr/pppppppppp/55/55/55/55/55/55/PPPPPPPPPP/RNBSKQTBNR w KQkq Ss - 0 1",
};

export const appName = "Королевские шахматы 100";

export const depth = {
  min: 1,
  max: 30,
  default: 12,

  novice: 3,
  amateur: 6,
  master: 12,
  grandmaster: 16,
  champion: 21,
};
