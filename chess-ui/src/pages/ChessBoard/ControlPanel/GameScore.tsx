import { observer } from "mobx-react-lite";
import { Game } from "../../../game/game";
import { Statistic } from "antd";
import styles from "./index.module.css";
import React from "react";
import { winningChances } from "../../../utils/chess";

interface Props {
  game: Game;
}

export const GameScore = observer<Props>(({ game }) => {
  if (game.score === undefined) {
    return null;
  }

  const chances = Math.round(winningChances(game.score) * 100);

  return (
    <Statistic
      value={`${chances}%`}
      title="Перевес противника"
      className={styles.stat}
    />
  );
});
