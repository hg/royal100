import { GameConfig, GameState, Move, UndoMove } from "./game";
import { Color } from "chessgroundx/types";

export type SerializedClocks = {
  [key in Color]: {
    total: number;
    remaining: number;
  };
};

export interface SerializedState {
  version: number;
  state: GameState;
  moves: Move[];
  undo: UndoMove;
  clocks: SerializedClocks;
  config: GameConfig;
}

export function parseState(json: string): SerializedState | undefined {
  try {
    const state: SerializedState = JSON.parse(json);
    if (state.version !== 1) {
      console.error("unsupported version", state.version);
      return undefined;
    }
    return state;
  } catch (e) {
    console.error("state parse failed", e);
    return undefined;
  }
}
