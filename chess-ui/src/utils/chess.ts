import { Color } from "chessgroundx/types";

export function otherColor(color: Color): Color {
  switch (color) {
    case "black":
      return "white";

    case "white":
      return "black";
  }
}
