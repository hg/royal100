import { observer } from "mobx-react-lite";
import { Game } from "../../../game/game";
import { Statistic } from "antd";
import styles from "./index.module.css";
import React from "react";

interface Props {
  game: Game;
}

export const GameScore = observer<Props>(({ game }) => (
  <Statistic
    value={game.score || "?"}
    title="Перевес противника"
    className={styles.stat}
  />
));
