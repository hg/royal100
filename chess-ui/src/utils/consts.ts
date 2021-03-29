// Импорт констант по пока не выясненной причине не работает,
// поэтому перетаскию нужные сюда вручную

export const Dimension = {
  dim10x10: 4,
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
  min: 1350,
  amateur: 1600,
  master: 2400,
  grandmaster: 2600,
  max: 2850,
  default: 2000,
};
