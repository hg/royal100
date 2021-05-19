import { Button, Collapse, Descriptions, Form, notification, Tabs } from "antd";
import React, {
  ChangeEvent,
  FC,
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { appName } from "../../utils/consts";
import styles from "./index.module.css";
import { GameConfig, GameState } from "../../game/game";
import { Settings } from "./Settings";
import { AdvancedSettings } from "./AdvancedSettings";
import {
  AiOutlineCloudUpload,
  AiOutlinePlusSquare,
  FaChessKing,
  FiSettings,
} from "react-icons/all";
import { StartGameButtons } from "./StartGameButtons";
import { routes } from "../routes";
import { useHistory } from "react-router";
import {
  parseState,
  SerializedClocks,
  SerializedState,
} from "../../game/state";
import { formatTime } from "../../utils/time";
import { StateSetter } from "../../types";
import { formatGameResult } from "../ChessBoard/endgame";

interface Props {
  config: GameConfig;
  setConfig: StateSetter<GameConfig>;
}

const NewGame: FC<Props> = ({ config, setConfig }) => (
  <Fragment>
    <Settings config={config} setConfig={setConfig} />

    <Collapse>
      <Collapse.Panel
        key="advanced"
        header="Дополнительные настройки"
        extra={<FiSettings className="icon-collapse" />}
      >
        <AdvancedSettings config={config} setConfig={setConfig} />
      </Collapse.Panel>
    </Collapse>

    <StartGameButtons config={config} setConfig={setConfig} />
  </Fragment>
);

function stateToString(state: GameState) {
  const { message, reason } = formatGameResult(state, false);
  return `${message}: ${reason}`;
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
  onLoadState: (state?: SerializedState) => void;
}

export const StartNewGame: FC<StartProps> = ({
  config,
  setConfig,
  onLoadState,
}) => {
  useLayoutEffect(() => {
    onLoadState(undefined);
  }, [onLoadState]);

  return (
    <div className={styles.wrap}>
      <div className={styles.form}>
        <header className={styles.header}>
          <div className={styles.appIcon} />
          {appName}
        </header>

        <Tabs centered type="card">
          <Tabs.TabPane
            key="new"
            tab={
              <>
                <AiOutlinePlusSquare className="icon" /> Новая игра
              </>
            }
          >
            <NewGame config={config} setConfig={setConfig} />
          </Tabs.TabPane>

          <Tabs.TabPane
            key="continue"
            tab={
              <>
                <AiOutlineCloudUpload className="icon" />
                Продолжить игру
              </>
            }
          >
            <ContinueGame onLoadState={onLoadState} />
          </Tabs.TabPane>
        </Tabs>
      </div>
    </div>
  );
};
