import { observer } from "mobx-react-lite";
import { Game } from "../../../game/game";
import React from "react";
import { TimeClock } from "../TimeClock";
import styles from "./index.module.css";
import { GameScore } from "./GameScore";
import { GameButtons } from "./GameButtons";
import { Settings } from "../GameSettings";

interface Props {
  game: Game;
  onShowSettings: () => void;
  onSet: (settings: Partial<Settings>) => void;
}

export const ControlPanel = observer<Props>(
  ({ game, onShowSettings, onSet }) => (
    <div className={styles.panel}>
      <div className={styles.clock}>
        {game.clocks.used && (
          <TimeClock color={game.topColor} clock={game.clocks[game.topColor]} />
        )}
      </div>

      <div className={styles.buttons}>
        <GameScore game={game} />
        <GameButtons
          game={game}
          onShowSettings={onShowSettings}
          onSet={onSet}
        />
      </div>

      <div className={styles.clock}>
        {game.clocks.used && (
          <TimeClock
            color={game.bottomColor}
            clock={game.clocks[game.bottomColor]}
          />
        )}
      </div>
    </div>
  )
);
