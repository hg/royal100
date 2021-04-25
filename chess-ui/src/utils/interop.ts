import { Key } from "chessgroundx/types";

export function enginePositionToBoard(position: string): Key {
  return position.replace("10", ":") as Key;
}
