import { useLayoutEffect } from "react";

export function useHotkey(key: string, hotkeyHandler: (key: string) => void) {
  useLayoutEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.code === key) {
        hotkeyHandler(key);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [key, hotkeyHandler]);
}
