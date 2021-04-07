// Импорт констант по пока не выясненной причине не работает,
// поэтому перетаскию нужные сюда вручную

import { Role } from "chessgroundx/types";

export const dimension = {
  dim10x10: 4,
};

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
