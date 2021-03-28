import { Clock } from "../clock";
import { observer } from "mobx-react-lite";
import React from "react";
import styles from "./index.module.css";
import { Color } from "chessgroundx/types";
import { BsClock, BsClockFill } from "react-icons/all";

interface Props {
  color: Color;
  clock: Clock;
}

export const TimeClock = observer(({ color, clock }: Props) => (
  <div className={styles.clock}>
    <div className={styles.icon}>
      {color === "black" && <BsClock />}
      {color === "white" && <BsClockFill />}
    </div>

    <div className={styles.text}>{clock.remaining}</div>
  </div>
));
