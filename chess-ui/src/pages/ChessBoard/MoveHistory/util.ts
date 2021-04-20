import { Key } from "chessgroundx/types";

export function formatMove(key: Key): string {
  const [file, rank] = key;
  if (rank === ":") {
    return `${file}10`;
  }
  return key;
}
