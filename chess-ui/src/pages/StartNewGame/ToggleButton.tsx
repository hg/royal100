import { GameConfig } from "../../game/game";
import React, { ReactElement } from "react";
import styles from "./index.module.css";

interface Props {
  config: GameConfig;
  setConfig: (config: GameConfig) => void;
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
    <div>{icon}</div>
    {title}
  </button>
);
