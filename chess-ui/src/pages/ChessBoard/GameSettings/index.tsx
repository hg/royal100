import React, { FC, useEffect, useState } from "react";
import { Button, Checkbox, Form, Radio } from "antd";
import { localStore } from "../../../utils/store";
import styles from "./index.module.css";
import { BackgroundButton } from "./BackgroundButton";
import { sound } from "../../../game/audio";
import { StateSetter } from "../../../types";
import { AiOutlineClose } from "react-icons/all";

interface Props {
  onHide: () => void;
  value: Settings;
  onSet: (settings: Partial<Settings>) => void;
}

export interface Settings {
  history: "compact" | "detailed";
  background: "blue" | "brown" | "metal" | "wood";
  pieces: "default" | "merida";
  sound: boolean;
  showSidebar: boolean;
}

const defaultSettings: Settings = {
  background: "brown",
  history: "detailed",
  pieces: "merida",
  sound: true,
  showSidebar: true,
};

export function useSettings(): [Settings, StateSetter<Settings>] {
  const [settings, setSettings] = useState<Settings>(() => {
    const stored = localStore.get<Settings>("game/settings");
    return { ...defaultSettings, ...stored };
  });

  useEffect(() => {
    localStore.set("game/settings", settings);
  }, [settings]);

  useEffect(() => {
    sound.toggle(settings.sound);
  }, [settings.sound]);

  return [settings, setSettings];
}

export const GameSettings: FC<Props> = ({ onHide, value, onSet }) => (
  <Form layout="vertical">
    <h1>Настройки</h1>

    <Form.Item label="Фон доски">
      <div className={styles.imageBtns}>
        <BackgroundButton onSet={onSet} type="blue" title="Синий" />
        <BackgroundButton onSet={onSet} type="brown" title="Коричневый" />
        <BackgroundButton onSet={onSet} type="metal" title="Металл" />
        <BackgroundButton onSet={onSet} type="wood" title="Дерево" />
      </div>
    </Form.Item>

    <Form.Item label="Набор фигур">
      <div className={styles.imageBtns}>
        <button
          type="button"
          onClick={() => onSet({ pieces: "default" })}
          className={`${styles.imageBtn} ${styles.default}`}
          title="Первый набор"
        />
        <button
          type="button"
          onClick={() => onSet({ pieces: "merida" })}
          className={`${styles.imageBtn} ${styles.merida}`}
          title="Второй набор"
        />
      </div>
    </Form.Item>

    <Form.Item label="Звук">
      <Checkbox
        checked={value.sound}
        onChange={(e) => onSet({ sound: e.target.checked })}
      >
        Включить звук
      </Checkbox>
    </Form.Item>

    <Form.Item label="История ходов">
      <Radio.Group
        value={value.history}
        onChange={(e) => onSet({ history: e.target.value })}
      >
        <Radio value="detailed">Подробная запись</Radio>
        <Radio value="compact">Компактная запись</Radio>
      </Radio.Group>
    </Form.Item>

    <Button type="primary" block size="large" onClick={onHide}>
      <AiOutlineClose className="icon" /> Закрыть
    </Button>
  </Form>
);
