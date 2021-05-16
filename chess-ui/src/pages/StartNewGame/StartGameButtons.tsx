import React, { FC } from "react";
import { useHistory } from "react-router";
import { randomColor, validateFen } from "../../utils/chess";
import { GameConfig } from "../../game/game";
import { routes } from "../routes";
import { Button } from "antd";
import { FaChessKing, FaChessQueen } from "react-icons/all";
import { generate960 } from "../../utils/variants";
import { StateSetter } from "../../types";

interface Props {
  config: GameConfig;
  setConfig: StateSetter<GameConfig>;
}

export const StartGameButtons: FC<Props> = ({ config, setConfig }) => {
  const history = useHistory();
  const canStart = !config.fen || validateFen(config.fen);

  function startGame(var960: boolean) {
    if (var960) {
      setConfig((prev) => ({ ...prev, fen: generate960() }));
    }
    if (!config.myColor) {
      setConfig((prev) => ({ ...prev, myColor: randomColor() }));
    }
    history.push(routes.chess);
  }

  return (
    <Button.Group size="large" className="footer">
      <Button
        type="primary"
        onClick={() => startGame(false)}
        disabled={!canStart}
      >
        <FaChessKing className="icon" /> Начать игру
      </Button>
      <Button onClick={() => startGame(true)} disabled={!canStart}>
        <FaChessQueen className="icon" /> Начать игру (960)
      </Button>
    </Button.Group>
  );
};
