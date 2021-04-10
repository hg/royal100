import { Collapse } from "antd";
import React, { FC } from "react";
import { appName } from "../../utils/consts";
import styles from "./index.module.css";
import { GameConfig } from "../../game/game";
import { Settings } from "./Settings";
import { AdvancedSettings } from "./AdvancedSettings";
import { StartGameButtons } from "./StartGameButtons";

interface Props {
  config: GameConfig;
  setConfig: (config: GameConfig) => void;
}

export const StartNewGame: FC<Props> = ({ config, setConfig }) => (
  <div className={styles.wrap}>
    <div className={styles.form}>
      <header className={styles.header}>
        <div className={styles.appIcon} />
        {appName}
      </header>

      <Settings config={config} setConfig={setConfig} />

      <Collapse>
        <Collapse.Panel key="advanced" header="Расширенные настройки">
          <AdvancedSettings config={config} setConfig={setConfig} />
        </Collapse.Panel>
      </Collapse>

      <StartGameButtons config={config} />
    </div>
  </div>
);
