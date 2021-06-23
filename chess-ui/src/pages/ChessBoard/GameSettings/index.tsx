import React, { FC, useEffect, useLayoutEffect, useState } from "react";
import { Button, Checkbox, Form, Radio, Slider } from "antd";
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
  background: "blue" | "brown" | "metal" | "wood" | "gold";
  pieces: "default" | "merida" | "royal";
  sound: boolean;
  showSidebar: boolean;
  boardMargin: number;
  pieceScale: number;
}

const defaultSettings: Settings = {
  background: "brown",
  history: "detailed",
  pieces: "royal",
  sound: true,
  showSidebar: true,
  boardMargin: 8,
  pieceScale: 9,
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

  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      "--board-margin",
      `${settings.boardMargin}px`
    );
  }, [settings.boardMargin]);

  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      "--piece-scale",
      `${settings.pieceScale}%`
    );
  }, [settings.pieceScale]);

  return [settings, setSettings];
}

export const GameSettings: FC<Props> = ({ onHide, value, onSet }) => (
  <Form layout="vertical" className={styles.settingsForm}>
    <h1>Настройки</h1>

    <Form.Item label="Фон доски">
      <div className={styles.imageBtns}>
        <BackgroundButton onSet={onSet} type="brown" title="Корич." />
        <BackgroundButton onSet={onSet} type="gold" title="Золото" />
        <BackgroundButton onSet={onSet} type="wood" title="Дерево" />
        <BackgroundButton onSet={onSet} type="metal" title="Металл" />
        <BackgroundButton onSet={onSet} type="blue" title="Синий" />
      </div>
    </Form.Item>

    <Form.Item label="Размер доски">
      <Slider
        value={value.boardMargin}
        min={8}
        max={256}
        onChange={(boardMargin: number) => onSet({ boardMargin })}
        reverse
      />
    </Form.Item>

    <Form.Item label="Набор фигур">
      <div className={styles.imageBtns}>
        <button
          type="button"
          onClick={() => onSet({ pieces: "royal" })}
          className={`${styles.imageBtn} ${styles.royal}`}
          title="Первый набор"
        />
        <button
          type="button"
          onClick={() => onSet({ pieces: "default" })}
          className={`${styles.imageBtn} ${styles.default}`}
          title="Второй набор"
        />
        <button
          type="button"
          onClick={() => onSet({ pieces: "merida" })}
          className={`${styles.imageBtn} ${styles.merida}`}
          title="Третий набор"
        />
      </div>
    </Form.Item>

    <Form.Item label="Размер фигур">
      <Slider
        value={value.pieceScale}
        min={6}
        max={11}
        step={0.1}
        onChange={(pieceScale: number) => onSet({ pieceScale })}
      />
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
