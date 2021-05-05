import { observer } from "mobx-react-lite";
import { Game } from "../../../game/game";
import { Statistic } from "antd";
import styles from "./index.module.css";
import React from "react";
import { ScoreType, winningChances } from "../../../utils/chess";
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

export const GameScore = observer<Props>(({ game }) => {
  const score = game.gameScore;
  if (!score) {
    return null;
  }

  const scoreValue = score.value;

  let value: string;
  if (score.type === ScoreType.Mate) {
    value = `мат в ${Math.abs(scoreValue)} ${movesString(scoreValue)}`;
  } else {
    const raw = winningChances(scoreValue);
    const chances = Math.round(Math.abs(raw * 100));
    value = sign(raw) + chances + "%";
  }

  return (
    <Statistic
      value={value}
      title="Перевес противника"
      className={styles.stat}
    />
  );
});
