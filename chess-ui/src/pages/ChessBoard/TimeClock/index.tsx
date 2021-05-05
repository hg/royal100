import { observer } from "mobx-react-lite";
import React, { Fragment } from "react";
import styles from "./index.module.css";
import { Color } from "chessgroundx/types";
import { Clock } from "../../../game/clock";
import { Progress } from "antd";
import { ProgressGradient } from "antd/lib/progress/progress";

interface Props {
  color: Color;
  clock: Clock;
}

const progressGradient: ProgressGradient = {
  from: "#e99910",
  to: "#8fea62",
};

export const TimeClock = observer(({ color, clock }: Props) => (
  <Fragment>
    <div
      className={`${styles.clock} ${
        color === "white" ? styles.white : styles.black
      }`}
    >
      {clock.remaining}
    </div>

    <Progress
      type="line"
      percent={clock.remainingPct}
      showInfo={false}
      size="small"
      strokeColor={progressGradient}
    />
  </Fragment>
));
