import { Game, GameConfig } from "../../game/game";
import { MutableRefObject, useEffect, useState } from "react";

export function useGame(
  board: MutableRefObject<HTMLDivElement | null>,
  config: GameConfig
) {
  const [game, setGame] = useState<Game | undefined>(undefined);

  useEffect(() => {
    if (board.current) {
      const game = new Game(board.current);
      setGame(game);
      return () => game.dispose();
    }
  }, [board]);

  useEffect(() => {
    if (game) {
      game.newGame(config);

      const resizeHandler = () => game.redraw();
      window.addEventListener("resize", resizeHandler);

      return () => {
        window.removeEventListener("resize", resizeHandler);
        game.stop();
      };
    }
  }, [config, game]);

  return game;
}
