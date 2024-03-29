import { Color, Pieces } from "chessgroundx/types";
import { Destinations } from "../game/engine";
import { intersect } from "./arrays";
import { castle, pieces } from "./consts";

export type CastlingSide = "K" | "Q";

export interface Castling {
  movedKing: boolean;
  movedRook: {
    K: boolean;
    Q: boolean;
  };
}

export const initialCastling = (): { [side in Color]: Castling } => ({
  white: {
    movedKing: false,
    movedRook: {
      K: false,
      Q: false,
    },
  },
  black: {
    movedKing: false,
    movedRook: {
      K: false,
      Q: false,
    },
  },
});

export function castlingKingPathIsSafe(
  side: Color,
  dir: CastlingSide,
  opponentMovement: Destinations
) {
  const kingMovement = castle[side].movement[dir];

  for (const moves of Object.values(opponentMovement)) {
    if (intersect(kingMovement, moves)) {
      return false;
    }
  }

  return true;
}

export function castlingPiecesAtHome(
  side: Color,
  dir: CastlingSide,
  boardPieces: Pieces
): boolean {
  const { rank, kingCell } = castle[side];
  const rookFile = castle.rookFile[dir];

  return (
    boardPieces[kingCell]?.role === pieces.king &&
    boardPieces[`${rookFile}${rank}`]?.role === pieces.rook
  );
}
