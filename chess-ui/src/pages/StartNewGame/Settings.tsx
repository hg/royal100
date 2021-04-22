import { Alert, Button, Form, Slider, TimePicker } from "antd";
import { formLayout } from "../../utils/forms";
import { depth } from "../../utils/consts";
import styles from "./index.module.css";
import { momentToSeconds, secondsToMoment } from "../../utils/time";
import React, { FC, useLayoutEffect } from "react";
import { GameConfig, OpponentType } from "../../game/game";
import { SliderMarks } from "antd/lib/slider";
import { IoIosPerson, MdComputer } from "react-icons/all";
import { ToggleButton } from "./ToggleButton";

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

const DepthSetting: FC<Props> = ({ config, setConfig }) => (
  <Form.Item
    label={`Уровень ${
      config.opponent === OpponentType.Computer ? "игры" : "подсказок"
    } компьютера`}
  >
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
);

const TimeSetting: FC<Props> = ({ config, setConfig }) => {
  function setMinutes(minutes: number) {
    setConfig({ ...config, totalTime: minutes * 60 });
  }

  return (
    <Form.Item label="Общее время ходов игрока" className={styles.timeControl}>
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
  );
};

const OpponentSetting: FC<Props> = ({ config, setConfig }) => (
  <Form.Item label="Противник">
    <ToggleButton
      config={config}
      setConfig={setConfig}
      configKey="opponent"
      value={OpponentType.Computer}
      icon={<MdComputer className={styles.sideIcon} />}
      title="Играть против компьютера"
    />
    <ToggleButton
      config={config}
      setConfig={setConfig}
      configKey="opponent"
      value={OpponentType.Human}
      icon={<IoIosPerson className={styles.sideIcon} />}
      title="Играть против партнёра"
    />
  </Form.Item>
);

const SideSetting: FC<Props> = ({ config, setConfig }) => (
  <Form.Item label="Играть" className="board-wrap default">
    <ToggleButton
      config={config}
      setConfig={setConfig}
      configKey="myColor"
      value="white"
      icon={<div className={`${styles.sideIcon} q-piece white`} />}
      title="Белыми"
    />
    <ToggleButton
      config={config}
      setConfig={setConfig}
      configKey="myColor"
      value="black"
      icon={<div className={`${styles.sideIcon} q-piece black`} />}
      title="Чёрными"
    />
  </Form.Item>
);

export const Settings: FC<Props> = ({ config, setConfig }) => {
  useLayoutEffect(() => {
    if (config.opponent === OpponentType.Human) {
      setConfig({ ...config, myColor: "white" });
    }
  }, [config.opponent]);

  return (
    <Form {...formLayout}>
      <OpponentSetting config={config} setConfig={setConfig} />
      <DepthSetting config={config} setConfig={setConfig} />
      <TimeSetting config={config} setConfig={setConfig} />

      {config.opponent === OpponentType.Computer && (
        <SideSetting config={config} setConfig={setConfig} />
      )}
    </Form>
  );
};
