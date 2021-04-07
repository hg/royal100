// Импорт констант по пока не выясненной причине не работает,
// поэтому перетаскию нужные сюда вручную

import { Role } from "chessgroundx/types";

export const Dimension = {
  dim10x10: 4,
};

export const Pieces: { [key: string]: Role } = {
  Pawn: "p-piece",
  Prince: "t-piece",
  Princess: "s-piece",
  King: "k-piece",
  Queen: "q-piece",
};

export const Fen = {
  start:
    "r3k4r/pppppppppp/55/55/55/55/55/55/PPPPPPPPPP/R3K4R w KQkq - - 0 1",
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
