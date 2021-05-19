import { useLayoutEffect } from "react";

export const hotkeys = {
  resign: "R",
  settings: "S",
  saveGame: "Q",
  sidebar: "Z",
  newGame: "N",
  showMoves: "M",
  stopThinking: "W",
  hint: "V",
  undoMove: "U",
  askDraw: "T",
};

type HotkeyHandler = (key: string) => void;

export function useHotkey(key: string, callback: HotkeyHandler) {
  useLayoutEffect(() => {
    let hotkey = key;
    if (key.length === 1 && key >= "A" && key <= "Z") {
      hotkey = `Key${key}`;
    }
    function eventHandler(e: KeyboardEvent) {
      if (e.code === hotkey) {
        callback(key);
      }
    }
    document.addEventListener("keydown", eventHandler);
    return () => document.removeEventListener("keydown", eventHandler);
  }, [key, callback]);
}
