import { observer } from "mobx-react-lite";
import React from "react";
import styles from "./index.module.css";
import { Color } from "chessgroundx/types";
import { BsClock, BsClockFill } from "react-icons/all";
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
    <div className={styles.icon}>
      {color === "black" && <BsClock />}
      {color === "white" && <BsClockFill />}
    </div>

    <div className={styles.text}>{clock.remaining}</div>
  </div>
));
