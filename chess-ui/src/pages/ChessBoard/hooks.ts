import { Game, GameConfig } from "../../game/game";
import { MutableRefObject, useEffect, useState } from "react";
import { useHistory } from "react-router";
import { notification } from "antd";
import { routes } from "../routes";
import { SerializedState } from "../../game/state";

export function useGame(
  board: MutableRefObject<HTMLDivElement | null>,
  config: GameConfig,
  state?: SerializedState
) {
  const [game, setGame] = useState<Game | undefined>(undefined);
  const history = useHistory();

  useEffect(() => {
    if (board.current) {
      const game = new Game(board.current);
      setGame(game);
      return game.dispose;
    }
  }, [board]);

  useEffect(() => {
    if (game) {
      if (state) {
        game.restoreGame(state).catch(() => {
          notification.error({ message: "Не удалось восстановить игру." });
          history.push(routes.home);
        });
      } else {
        game.newGame(config);
      }

      return game.stop;
    }
  }, [config, game, state, history]);

  return game;
}
