import { observer } from "mobx-react-lite";
import { Alert, Button, Form, Slider, TimePicker } from "antd";
import { formLayout } from "../../utils/forms";
import { depth } from "../../utils/consts";
import styles from "./index.module.css";
import { momentToSeconds, secondsToMoment } from "../../utils/time";
import React from "react";
import { GameConfig } from "../../game/game";
import { SliderMarks } from "antd/lib/slider";

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

const DepthSetting = observer<Props>(({ config, setConfig }) => (
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
));

const TimeSetting = observer<Props>(({ config, setConfig }) => {
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
});

const SideSetting = observer<Props>(({ config, setConfig }) => (
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
));

export const Settings = observer<Props>(({ config, setConfig }) => (
  <Form {...formLayout}>
    <DepthSetting config={config} setConfig={setConfig} />
    <TimeSetting config={config} setConfig={setConfig} />
    <SideSetting config={config} setConfig={setConfig} />
  </Form>
));
