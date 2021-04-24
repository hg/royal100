import { observer } from "mobx-react-lite";
import React from "react";
import styles from "./index.module.css";
import { Color } from "chessgroundx/types";
import { Clock } from "../../../game/clock";

interface Props {
  color: Color;
  clock: Clock;
}

export const TimeClock = observer(({ color, clock }: Props) => (
  <div
    className={`${styles.clock} ${
      color === "white" ? styles.white : styles.black
    }`}
  >
    {clock.remaining}
  </div>
));
