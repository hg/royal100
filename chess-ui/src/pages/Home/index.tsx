import { Button, Form, Select, Slider, TimePicker } from "antd";
import React, { FC } from "react";
import { Rating } from "../../utils/consts";
import { GameConfig } from "../ChessBoard/game";
import { FaChess } from "react-icons/all";
import { useHistory } from "react-router";
import { routes } from "../routes";
import styles from "./index.module.css";
import moment from "moment";
import { formLayout } from "../../utils/forms";

const { Option } = Select;

interface Props {
  config: GameConfig;
  setConfig: (config: GameConfig) => void;
}

export const Home: FC<Props> = ({ config, setConfig }) => {
  const history = useHistory();

  function startGame() {
    if (config.totalTime > 0) {
      history.push(routes.chess);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.form}>
        <h2>Королевские шахматы</h2>

        <Form {...formLayout}>
          <Form.Item label="Рейтинг компьютера">
            <Slider
              value={config.rating}
              min={Rating.min}
              max={Rating.max}
              onChange={(rating: number) => setConfig({ ...config, rating })}
            />
          </Form.Item>

          <Form.Item label="Общее время ходов каждого игрока">
            <TimePicker
              showNow={false}
              value={moment.utc(config.totalTime * 1000)}
              onChange={(time) => {
                if (time) {
                  setConfig({
                    ...config,
                    totalTime:
                      time.hours() * 60 * 60 +
                      time.minutes() * 60 +
                      time.seconds(),
                  });
                }
              }}
            />
          </Form.Item>

          <Form.Item label="Играть">
            <Select
              value={config.myColor}
              onSelect={(myColor) => setConfig({ ...config, myColor })}
            >
              <Option value="white">Белыми</Option>
              <Option value="black">Чёрными</Option>
            </Select>
          </Form.Item>
        </Form>

        <Button size="large" type="primary" onClick={startGame}>
          <FaChess /> Начать игру
        </Button>
      </div>
    </div>
  );
};
