import { Button, Collapse, Descriptions, Form, notification, Tabs } from "antd";
import React, { ChangeEvent, FC, Fragment, useRef, useState } from "react";
import { appName } from "../../utils/consts";
import styles from "./index.module.css";
import { GameConfig, GameState, StateType } from "../../game/game";
import { Settings } from "./Settings";
import { AdvancedSettings } from "./AdvancedSettings";
import { FaChessKing, FiSettings } from "react-icons/all";
import { StartGameButtons } from "./StartGameButtons";
import { routes } from "../routes";
import { useHistory } from "react-router";
import {
  parseState,
  SerializedClocks,
  SerializedState,
} from "../../game/state";
import { formatTime } from "../../utils/time";

interface Props {
  config: GameConfig;
  setConfig: (config: GameConfig) => void;
}

const NewGame: FC<Props> = ({ config, setConfig }) => (
  <Fragment>
    <Settings config={config} setConfig={setConfig} />

    <Collapse>
      <Collapse.Panel
        key="advanced"
        header="Дополнительные настройки"
        extra={<FiSettings className={styles.collapseIcon} />}
      >
        <AdvancedSettings config={config} setConfig={setConfig} />
      </Collapse.Panel>
    </Collapse>

    <StartGameButtons config={config} setConfig={setConfig} />
  </Fragment>
);

function stateToString(state: GameState) {
  switch (state.state) {
    case StateType.Paused:
      return "пауза";
    case StateType.Playing:
      return "идёт игра";
    case StateType.Draw:
      return "ничья";
    case StateType.Win:
      return `победа ${state.side === "white" ? "белых" : "чёрных"}`;
  }
}

function formatSideTime(clock: SerializedClocks[keyof SerializedClocks]) {
  return `${formatTime(clock.remaining)} /  ${formatTime(clock.total)}`;
}

const ContinueGame: FC<Pick<StartProps, "onLoadState">> = ({ onLoadState }) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<SerializedState>();
  const history = useHistory();

  async function onLoadSave(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.item(0);
    if (!file || !file.name.endsWith(".royal100")) {
      notification.error({ message: "Выберите файл с сохранением игры." });
      return;
    }
    const json = await file.text();
    const state = parseState(json);
    if (state) {
      setState(state);
    } else {
      const input = fileRef.current;
      if (input) {
        input.value = "";
      }
      notification.error({ message: "Не удалось загрузить сохранённую игру." });
    }
  }

  function loadGame() {
    if (state) {
      onLoadState(state);
      history.push(routes.chess);
    }
  }

  return (
    <Fragment>
      <Form.Item label="Сохранённая игра">
        <input
          ref={fileRef}
          type="file"
          accept=".royal100"
          onChange={onLoadSave}
        />
      </Form.Item>

      {state && (
        <Form.Item>
          <Descriptions bordered size="small">
            <Descriptions.Item label="Результат" span={3}>
              {stateToString(state.state)}
            </Descriptions.Item>

            <Descriptions.Item label="Всего полуходов">
              {state.moves.length}
            </Descriptions.Item>

            <Descriptions.Item label="Время белых">
              {formatSideTime(state.clocks.white)}
            </Descriptions.Item>

            <Descriptions.Item label="Время чёрных">
              {formatSideTime(state.clocks.black)}
            </Descriptions.Item>
          </Descriptions>
        </Form.Item>
      )}

      <Button.Group size="large" className="footer">
        <Button type="primary" disabled={!state} onClick={loadGame}>
          <FaChessKing className="icon" /> Продолжить игру
        </Button>
      </Button.Group>
    </Fragment>
  );
};

interface StartProps extends Props {
  onLoadState: (state: SerializedState) => void;
}

export const StartNewGame: FC<StartProps> = ({
  config,
  setConfig,
  onLoadState,
}) => (
  <div className={styles.wrap}>
    <div className={styles.form}>
      <header className={styles.header}>
        <div className={styles.appIcon} />
        {appName}
      </header>

      <Tabs centered>
        <Tabs.TabPane key="new" tab="Новая игра">
          <NewGame config={config} setConfig={setConfig} />
        </Tabs.TabPane>

        <Tabs.TabPane key="continue" tab="Продолжить игру">
          <ContinueGame onLoadState={onLoadState} />
        </Tabs.TabPane>
      </Tabs>
    </div>
  </div>
);
