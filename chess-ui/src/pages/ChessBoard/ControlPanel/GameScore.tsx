import { observer } from "mobx-react-lite";
import { Game } from "../../../game/game";
import { Statistic } from "antd";
import styles from "./index.module.css";
import React from "react";
import { Score, ScoreType } from "../../../utils/chess";
import { sign } from "../../../utils/util";

interface Props {
  game: Game;
}

function movesString(moves: number): string {
  const abs = Math.abs(moves);
  if (abs === 1) {
    return "ход";
  }
  if (abs < 5) {
    return "хода";
  }
  return "ходов";
}

function formatScore({ type, value }: Score) {
  if (type === ScoreType.Mate) {
    return `мат в ${Math.abs(value)} ${movesString(value)}`;
  } else {
    return `${sign(value)}${Math.abs(value)}%`;
  }
}

export const GameScore = observer<Props>(({ game }) => {
  const score = game.gameScore;

  return score ? (
    <Statistic
      value={formatScore(score)}
      title="Перевес противника"
      className={styles.stat}
    />
  ) : null;
});
