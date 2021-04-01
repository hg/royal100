import { Alert, Button, Collapse, Form, Input, Slider, TimePicker } from "antd";
import React, { FC } from "react";
import { appName, depth } from "../../utils/consts";
import { IoIosPerson, MdComputer } from "react-icons/all";
import { useHistory } from "react-router";
import { routes } from "../routes";
import styles from "./index.module.css";
import { formLayout } from "../../utils/forms";
import { SliderMarks } from "antd/lib/slider";
import { momentToSeconds, secondsToMoment } from "../../utils/time";
import { validateFen } from "../../utils/chess";
import { GameConfig, OpponentType } from "../../game/game";

interface Props {
  config: GameConfig;
  setConfig: (config: GameConfig) => void;
}

const depthMarks: SliderMarks = {
  [depth.max + 1]: "∞",
  [depth.novice]: "новичок",
  [depth.amateur]: "любитель",
  [depth.master]: "мастер",
  [depth.grandmaster]: "гроссмейстер",
  [depth.champion]: "чемпион",
};

export const Home: FC<Props> = ({ config, setConfig }) => {
  const history = useHistory();
  const canStart = !config.fen || validateFen(config.fen);

  function startGame(opponent: OpponentType) {
    setConfig({ ...config, opponent });
    if (canStart && config.totalTime > 0) {
      history.push(routes.chess);
    }
  }

  function setMinutes(minutes: number) {
    setConfig({ ...config, totalTime: minutes * 60 });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.form}>
        <header className={styles.header}>
          <div className={styles.appIcon} />
          {appName}
        </header>

        <Form {...formLayout}>
          <Form.Item label="Уровень игры компьютера">
            <Slider
              min={depth.min}
              max={depth.max + 1}
              value={config.depth}
              onChange={(val: number) => {
                setConfig({
                  ...config,
                  depth: val > depth.max ? undefined : val,
                });
              }}
              marks={depthMarks}
            />

            {config.depth === undefined && (
              <Alert
                type="info"
                showIcon
                message="Глубина поиска ходов ограничена только временем."
                className={styles.depthAlert}
              />
            )}
          </Form.Item>

          <Form.Item
            label="Общее время ходов игрока"
            className={styles.timeControl}
          >
            <TimePicker
              showNow={false}
              value={secondsToMoment(config.totalTime)}
              onChange={(time) => {
                if (time) {
                  setConfig({ ...config, totalTime: momentToSeconds(time) });
                }
              }}
              className={styles.timePicker}
            />
            <Button.Group className={styles.timeButtons}>
              <Button onClick={() => setMinutes(5)}>5 минут</Button>
              <Button onClick={() => setMinutes(15)}>15 минут</Button>
              <Button onClick={() => setMinutes(30)}>полчаса</Button>
              <Button onClick={() => setMinutes(60)}>час</Button>
              <Button onClick={() => setMinutes(180)}>три часа</Button>
            </Button.Group>
          </Form.Item>

          <Form.Item label="Играть">
            <button
              onClick={() => setConfig({ ...config, myColor: "white" })}
              className={`${styles.sideButton} ${
                config.myColor === "white" && styles.active
              }`}
            >
              <div className={`${styles.sideIcon} q-piece white`} />
              Белыми
            </button>
            <button
              onClick={() => setConfig({ ...config, myColor: "black" })}
              className={`${styles.sideButton} ${
                config.myColor === "black" && styles.active
              }`}
            >
              <div className={`${styles.sideIcon} q-piece black`} />
              Чёрными
            </button>
          </Form.Item>
        </Form>

        <Collapse>
          <Collapse.Panel key="advanced" header="Расширенные настройки">
            <Form {...formLayout}>
              <Form.Item label="Максимальное время на один ход">
                <TimePicker
                  showNow={false}
                  placeholder="(не больше 80% от оставшегося времени)"
                  className="full-width"
                  value={
                    config.plyTime ? secondsToMoment(config.plyTime) : undefined
                  }
                  onChange={(time) => {
                    if (time) {
                      setConfig({ ...config, plyTime: momentToSeconds(time) });
                    }
                  }}
                />
              </Form.Item>

              <Form.Item label="Начальная позиция (в нотации FEN)">
                <Input
                  placeholder="(стандартная позиция)"
                  className="full-width"
                  value={config.fen}
                  allowClear
                  onChange={(e) =>
                    setConfig({ ...config, fen: e.target.value })
                  }
                />
              </Form.Item>
            </Form>
          </Collapse.Panel>
        </Collapse>

        <Button.Group size="large" className="footer">
          <Button
            type="primary"
            onClick={() => startGame(OpponentType.Computer)}
            disabled={!canStart}
          >
            <MdComputer className="icon" /> Играть против компьютера
          </Button>
          <Button
            onClick={() => startGame(OpponentType.Human)}
            disabled={!canStart}
          >
            <IoIosPerson className="icon" /> Играть против партнёра
          </Button>
        </Button.Group>
      </div>
    </div>
  );
};
