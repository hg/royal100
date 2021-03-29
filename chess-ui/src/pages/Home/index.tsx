import {
  Button,
  Collapse,
  Form,
  Input,
  InputNumber,
  Slider,
  TimePicker,
} from "antd";
import React, { FC } from "react";
import { Depth, Rating } from "../../utils/consts";
import { GameConfig } from "../ChessBoard/game";
import { FaChess } from "react-icons/all";
import { useHistory } from "react-router";
import { routes } from "../routes";
import styles from "./index.module.css";
import { formLayout } from "../../utils/forms";
import { SliderMarks } from "antd/lib/slider";
import { momentToSeconds, secondsToMoment } from "../../utils/time";
import { validateFen } from "../../utils/chess";

interface Props {
  config: GameConfig;
  setConfig: (config: GameConfig) => void;
}

const ratingMarks: SliderMarks = {
  [Rating.min]: "новичок",
  [Rating.amateur]: "любитель",
  [Rating.master]: "мастер",
  [Rating.grandmaster]: "гроссмейстер",
  [Rating.max]: "чемпион",
};

export const Home: FC<Props> = ({ config, setConfig }) => {
  const history = useHistory();
  const canStart = !config.fen || validateFen(config.fen);

  function startGame() {
    if (canStart && config.totalTime > 0) {
      history.push(routes.chess);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.form}>
        <h2>Королевские шахматы</h2>

        <Form {...formLayout}>
          <Form.Item label="Рейтинг игры компьютера">
            <Slider
              value={config.rating}
              min={Rating.min}
              max={Rating.max}
              onChange={(rating: number) => setConfig({ ...config, rating })}
              marks={ratingMarks}
            />
          </Form.Item>

          <Form.Item label="Общее время ходов каждого игрока">
            <TimePicker
              showNow={false}
              value={secondsToMoment(config.totalTime)}
              onChange={(time) => {
                if (time) {
                  setConfig({ ...config, totalTime: momentToSeconds(time) });
                }
              }}
            />
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
              <Form.Item label="Глубина поиска ходов">
                <InputNumber
                  value={config.depth}
                  min={Depth.min}
                  max={Depth.max}
                  placeholder="(без ограничений)"
                  className="full-width"
                  onChange={(depth) =>
                    setConfig({ ...config, depth: Number(depth) || undefined })
                  }
                />
              </Form.Item>

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

        <div className="footer">
          <Button
            size="large"
            type="primary"
            onClick={startGame}
            disabled={!canStart}
          >
            <FaChess className="icon" /> Начать игру
          </Button>
        </div>
      </div>
    </div>
  );
};
