import {
  createContext,
  FC,
  useContext,
  useLayoutEffect,
  useState,
} from "react";
import { remove } from "./util";

export const hotkeys = {
  resign: "R",
  settings: "S",
  saveGame: "Q",
  sidebar: "Z",
  newGame: "N",
  stopThinking: "W",
  hint: "V",
  undoMove: "U",
  offerDraw: "T",
  help: "X",
};

type HotkeyHandler = (key: string) => void;

interface HotkeyContext {
  handlers: Record<string, HotkeyHandler[]>;
}

const Context = createContext<HotkeyContext>(undefined!);

function useCreateContext(): HotkeyContext {
  const [value] = useState<HotkeyContext>({
    handlers: {},
  });

  useLayoutEffect(() => {
    function keydownHandler({ code }: KeyboardEvent) {
      const handlers = value.handlers[code];
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(code);
          } catch (e) {
            console.error("handler failed", e);
          }
        }
      }
    }

    document.addEventListener("keydown", keydownHandler);
    return () => document.removeEventListener("keydown", keydownHandler);
  }, [value]);

  return value;
}

export const HotkeyContextProvider: FC = ({ children }) => (
  <Context.Provider value={useCreateContext()}>{children}</Context.Provider>
);

export function useHotkey(key: string, callback: HotkeyHandler) {
  const { handlers } = useContext(Context);

  useLayoutEffect(() => {
    const code =
      key.length === 1 && key >= "A" && key <= "Z" ? `Key${key}` : key;

    const cb = handlers[code] || [];
    cb.push(callback);
    handlers[code] = cb;

    return () => {
      remove(cb, callback);
    };
  }, [key, callback, handlers]);
}
