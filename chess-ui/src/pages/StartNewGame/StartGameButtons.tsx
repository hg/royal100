import React from "react";
import { useHistory } from "react-router";
import { validateFen } from "../../utils/chess";
import { GameConfig } from "../../game/game";
import { routes } from "../routes";
import { Button } from "antd";
import { FaChessKing } from "react-icons/all";
import { observer } from "mobx-react-lite";

interface Props {
  config: GameConfig;
  setConfig: (config: GameConfig) => void;
}

export const StartGameButtons = observer<Props>(({ config, setConfig }) => {
  const history = useHistory();
  const canStart = !config.fen || validateFen(config.fen);

  function startGame() {
    if (canStart && config.totalTime > 0) {
      history.push(routes.chess);
    }
  }

  return (
    <Button.Group size="large" className="footer">
      <Button type="primary" onClick={startGame} disabled={!canStart}>
        <FaChessKing className="icon" /> Начать игру
      </Button>
    </Button.Group>
  );
});
