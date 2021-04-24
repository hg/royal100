import React, { FC } from "react";
import styles from "./index.module.css";
import { Settings } from "./index";

interface Props {
  type: Settings["background"];
  onSet: (settings: Partial<Settings>) => void;
  title: string;
}

function cssClass(type: Props["type"]) {
  switch (type) {
    case "wood":
      return styles.wood;
    case "marble":
      return styles.marble;
    case "metal":
      return styles.metal;
    case "maple":
      return styles.maple;
    case "green":
      return styles.green;
  }
}

export const BackgroundButton: FC<Props> = ({ title, type, onSet }) => (
  <button
    type="button"
    onClick={() => onSet({ background: type })}
    className={`${styles.imageBtn} ${cssClass(type)}`}
  >
    <span className={styles.title}>{title}</span>
  </button>
);
