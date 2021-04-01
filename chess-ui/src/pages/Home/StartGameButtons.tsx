import React from "react";
import { useHistory } from "react-router";
import { validateFen } from "../../utils/chess";
import { GameConfig, OpponentType } from "../../game/game";
import { routes } from "../routes";
import { Button } from "antd";
import { IoIosPerson, MdComputer } from "react-icons/all";
import { observer } from "mobx-react-lite";

interface Props {
  config: GameConfig;
  setConfig: (config: GameConfig) => void;
}

export const StartGameButtons = observer<Props>(({ config, setConfig }) => {
  const history = useHistory();
  const canStart = !config.fen || validateFen(config.fen);

  function startGame(opponent: OpponentType) {
    setConfig({ ...config, opponent });
    if (canStart && config.totalTime > 0) {
      history.push(routes.chess);
    }
  }

  return (
    <Button.Group size="large" className="footer">
      <Button
        type="primary"
        onClick={() => startGame(OpponentType.Computer)}
        disabled={!canStart}
      >
        <MdComputer className="icon" /> Играть против компьютера
      </Button>
      <Button
        onClick={() => startGame(OpponentType.Human)}
        disabled={!canStart}
      >
        <IoIosPerson className="icon" /> Играть против партнёра
      </Button>
    </Button.Group>
  );
});
