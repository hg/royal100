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
    case "blue":
      return styles.blue;
    case "brown":
      return styles.brown;
    case "gold":
      return styles.gold;
    case "metal":
      return styles.metal;
    case "wood":
      return styles.wood;
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
