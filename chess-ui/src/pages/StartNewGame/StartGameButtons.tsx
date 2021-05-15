import React, { FC } from "react";
import { useHistory } from "react-router";
import { randomColor, validateFen } from "../../utils/chess";
import { GameConfig } from "../../game/game";
import { routes } from "../routes";
import { Button } from "antd";
import { FaChessKing, FaChessQueen } from "react-icons/all";
import { generate960 } from "../../utils/variants";

interface Props {
  config: GameConfig;
  setConfig: (config: GameConfig) => void;
}

export const StartGameButtons: FC<Props> = ({ config, setConfig }) => {
  const history = useHistory();
  const canStart = !config.fen || validateFen(config.fen);

  function startGame() {
    if (!config.myColor) {
      setConfig({ ...config, myColor: randomColor() });
    }
    if (canStart) {
      history.push(routes.chess);
    }
  }

  function startGame960() {
    setConfig({ ...config, fen: generate960() });
    startGame();
  }

  return (
    <Button.Group size="large" className="footer">
      <Button type="primary" onClick={startGame} disabled={!canStart}>
        <FaChessKing className="icon" /> Начать игру
      </Button>
      <Button onClick={startGame960} disabled={!canStart}>
        <FaChessQueen className="icon" /> Начать игру (960)
      </Button>
    </Button.Group>
  );
};
