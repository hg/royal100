import { Color, Key } from "chessgroundx/types";

const reKey = /^([abcdefghij])([0-9:])$/;

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

export function otherColor(color: Color): Color {
  switch (color) {
    case "black":
      return "white";

    case "white":
      return "black";
  }
}
