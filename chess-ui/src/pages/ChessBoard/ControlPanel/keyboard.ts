import { Game } from "../../../game/game";
import { useCallback, useEffect, useState } from "react";
import { File, Key, Rank } from "chessgroundx/types";
import { notification } from "antd";
import { useHotkey } from "../../../utils/hotkeys";

const keymapFiles: { [key: string]: File } = {
  KeyA: "a",
  KeyB: "b",
  KeyC: "c",
  KeyD: "d",
  KeyE: "e",
  KeyF: "f",
  KeyG: "g",
  KeyH: "h",
  KeyI: "i",
  KeyJ: "j",
};

const keymapRanks: { [key: string]: Rank } = {
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Digit6: "6",
  Digit7: "7",
  Digit8: "8",
  Digit9: "9",
  Digit0: ":",
};

const allKeys = [...Object.keys(keymapFiles), ...Object.keys(keymapRanks)];

export function useKeyboardControl(game: Game) {
  const [combo, setCombo] = useState<{ rank?: Rank; file?: File }>({});

  const handler = useCallback((code: string) => {
    const rank = keymapRanks[code];
    const file = keymapFiles[code];
    setCombo((prev) => ({
      rank: prev.rank || rank,
      file: prev.file || file,
    }));
  }, []);

  for (const key of allKeys) {
    // Список не меняется от вызова к вызову
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useHotkey(key, handler);
  }

  useEffect(() => {
    const { file, rank } = combo;
    if (file && rank) {
      const key = `${file}${rank}` as Key;
      if (game.premove) {
        game.finishMove(key);
      } else {
        const sources = game.validMovesTo(key);
        if (sources.length === 0) {
          notification.error({ message: "Нет ходов в эту клетку" });
        } else if (sources.length === 1) {
          game.move(sources[0], key);
        } else {
          game.setMove(sources, key);
        }
      }
      setTimeout(() => setCombo({}), 500);
    }
  }, [combo, game]);

  return combo;
}
