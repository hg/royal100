import { Alert, Form, Radio, Slider } from "antd";
import { formLayout } from "../../utils/forms";
import { depth } from "../../utils/consts";
import styles from "./index.module.css";
import React, { FC, Fragment, useLayoutEffect } from "react";
import { GameConfig, OpponentType } from "../../game/game";
import { SliderMarks } from "antd/lib/slider";
import {
  GiPerspectiveDiceSixFacesRandom,
  IoIosPerson,
  MdComputer,
} from "react-icons/all";
import { ToggleButton } from "./ToggleButton";
import { TimeControl, TimeRange } from "./TimeControl";

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
      onChange={(depth: number) => {
        setConfig({ ...config, depth });
      }}
      marks={depthMarks}
    />

    {config.depth > depth.max && (
      <Alert
        type="info"
        showIcon
        message="Глубина поиска ходов ограничена только временем."
        className={styles.depthAlert}
      />
    )}
  </Form.Item>
);

const totalRanges: TimeRange[] = [
  { seconds: 5 * 60, title: "5 минут" },
  { seconds: 15 * 60, title: "15 минут" },
  { seconds: 30 * 60, title: "полчаса" },
  { seconds: 60 * 60, title: "час" },
  { seconds: 180 * 60, title: "три часа" },
];

const plyRanges: TimeRange[] = [
  { seconds: 0, title: "нет" },
  { seconds: 5, title: "5 секунд" },
  { seconds: 10, title: "10 секунд" },
  { seconds: 15, title: "15 секунд" },
  { seconds: 30, title: "30 секунд" },
  { seconds: 60, title: "минута" },
];

const TimeControlMode: FC<Props> = ({ config, setConfig }) => (
  <Form.Item label="Контроль времени">
    <Radio.Group
      value={config.totalTime === 0}
      onChange={(e) =>
        setConfig({ ...config, totalTime: e.target.value ? 0 : 600 })
      }
    >
      <Radio value={false}>По часам</Radio>
      <Radio value={true}>Без ограничений</Radio>
    </Radio.Group>
  </Form.Item>
);

const TimeSetting: FC<Props> = ({ config, setConfig }) => (
  <Fragment>
    <TimeControlMode config={config} setConfig={setConfig} />

    {config.totalTime > 0 && (
      <Fragment>
        <TimeControl
          title="Время ходов стороны"
          value={config.totalTime}
          onChange={(totalTime) => setConfig({ ...config, totalTime })}
          ranges={totalRanges}
        />
        <TimeControl
          title="Добавление времени после хода"
          value={config.plyIncrement}
          onChange={(plyIncrement) => setConfig({ ...config, plyIncrement })}
          ranges={plyRanges}
        />
      </Fragment>
    )}
  </Fragment>
);

const OpponentSetting: FC<Props> = ({ config, setConfig }) => (
  <Form.Item label="Противник">
    <ToggleButton
      config={config}
      setConfig={setConfig}
      configKey="opponent"
      value={OpponentType.Computer}
      icon={<MdComputer className={styles.sideIcon} />}
      title="Играть c компьютером"
    />
    <ToggleButton
      config={config}
      setConfig={setConfig}
      configKey="opponent"
      value={OpponentType.Human}
      icon={<IoIosPerson className={styles.sideIcon} />}
      title="Играть с другом"
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
    <ToggleButton
      config={config}
      setConfig={setConfig}
      configKey="myColor"
      value={undefined}
      icon={<GiPerspectiveDiceSixFacesRandom className={styles.sideIcon} />}
      title="Случайными"
    />
  </Form.Item>
);

export const Settings: FC<Props> = ({ config, setConfig }) => {
  useLayoutEffect(() => {
    if (config.opponent === OpponentType.Human) {
      setConfig({ ...config, myColor: "white" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
