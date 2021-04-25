import { Color } from "chessgroundx/types";
import styles from "../pages/StartNewGame/index.module.css";
import React from "react";

interface Props {
  promotions: string[];
  color: Color;
  name: keyof typeof names;
  onClick: (name: keyof typeof names) => void;
}

const names = {
  q: "Ферзь",
  r: "Ладья",
  b: "Слон",
  n: "Конь",
};

export function Promotion({ promotions, color, name, onClick }: Props) {
  if (!promotions.includes(name)) {
    return null;
  }
  return (
    <button
      onClick={() => onClick(name)}
      title={names[name]}
      className={styles.sideButton}
    >
      <div className={`${styles.sideIcon} ${name}-piece ${color}`} />
    </button>
  );
}
