import { Piece } from "chessgroundx/types";
import { sound, Track } from "./audio";

export function playMoveSound(captured?: Piece) {
  if (captured) {
    sound.play(Track.Capture);
  } else {
    sound.play(Track.Move);
  }
}

export function playSelectSound(piece?: Piece) {
  if (piece) {
    sound.play(Track.Select);
  }
}
