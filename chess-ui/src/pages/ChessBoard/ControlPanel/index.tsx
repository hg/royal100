import { observer } from "mobx-react-lite";
import { Game } from "../../../game/game";
import { Spinner } from "../../../components/Spinner";
import React from "react";
import { TimeClock } from "../TimeClock";
import styles from "./index.module.css";
import { GameScore } from "./GameScore";
import { GameButtons } from "./GameButtons";

interface Props {
  game?: Game;
  onShowSettings: () => void;
}

export const ControlPanel = observer<Props>(({ game, onShowSettings }) => {
  if (!game) {
    return <Spinner loading />;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.clock}>
        <TimeClock color={game.topColor} clock={game.clocks[game.topColor]} />
      </div>

      <div className={styles.buttons}>
        <GameScore game={game} />
        <GameButtons game={game} onShowSettings={onShowSettings} />
      </div>

      <div className={styles.clock}>
        <TimeClock
          color={game.bottomColor}
          clock={game.clocks[game.bottomColor]}
        />
      </div>
    </div>
  );
});
