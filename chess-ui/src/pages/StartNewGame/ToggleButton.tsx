import React, { ReactElement } from "react";
import { GameConfig } from "../../game/game";
import styles from "./index.module.css";
import { StateSetter } from "../../types";

interface Props {
  config: GameConfig;
  setConfig: StateSetter<GameConfig>;
  configKey: keyof GameConfig;
  value: GameConfig[keyof GameConfig];
  icon: ReactElement;
  title: string;
}

export const ToggleButton = ({
  config,
  setConfig,
  configKey,
  value,
  icon,
  title,
}: Props) => (
  <button
    onClick={() => setConfig({ ...config, [configKey]: value })}
    className={`${styles.sideButton} ${
      config[configKey] === value && styles.active
    }`}
  >
    <div className={styles.sideButtonContent}>
      {icon} {title}
    </div>
  </button>
);
