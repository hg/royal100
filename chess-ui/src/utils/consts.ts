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
    "rnbskqtbnr/pppppppppp/55/55/55/55/55/55/PPPPPPPPPP/RNBSKQTBNR w KQkq Ss - 0 1",
};

export const Depth = {
  min: 1,
  max: 1000,
};

export const Rating = {
  min: 1350, // взято из исходников движка
  max: 2850, // взято из исходников движка
  amateur: 1600,
  master: 2400,
  grandmaster: 2600,
  default: 2000,
};
