import React, { FC, useEffect, useState } from "react";
import { Form, Modal, Radio } from "antd";
import { formLayout } from "../../../utils/forms";
import { localStore } from "../../../utils/store";
import styles from "./index.module.css";
import { BackgroundButton } from "./BackgroundButton";

interface Props {
  value: Settings;
  onSet: (settings: Partial<Settings>) => void;
  onHide: () => void;
}

export interface Settings {
  history: "compact" | "detailed";
  background: "wood" | "marble" | "metal" | "maple" | "green";
  pieces: "default" | "merida";
}

const defaultSettings: Settings = {
  background: "wood",
  history: "detailed",
  pieces: "merida",
};

export function useSettings(): [Settings, (value: Settings) => void] {
  const [settings, setSettings] = useState<Settings>(() => {
    const stored = localStore.get<Settings>("game/settings");
    return { ...defaultSettings, ...stored };
  });

  useEffect(() => {
    localStore.set("game/settings", settings);
  }, [settings]);

  return [settings, setSettings];
}

export const GameSettings: FC<Props> = ({ onHide, value, onSet }) => (
  <Modal visible onCancel={onHide} footer={null}>
    <Form {...formLayout}>
      <Form.Item label="Фон доски">
        <div className={styles.imageBtns}>
          <BackgroundButton onSet={onSet} type="wood" title="Дерево" />
          <BackgroundButton onSet={onSet} type="maple" title="Клён" />
          <BackgroundButton onSet={onSet} type="marble" title="Мрамор" />
          <BackgroundButton onSet={onSet} type="green" title="Зелёный мрамор" />
          <BackgroundButton onSet={onSet} type="metal" title="Металл" />
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

      <Form.Item label="История ходов">
        <Radio.Group
          value={value.history}
          onChange={(e) => onSet({ history: e.target.value })}
        >
          <Radio value="detailed">Подробная запись</Radio>
          <Radio value="compact">Компактная запись</Radio>
        </Radio.Group>
      </Form.Item>
    </Form>
  </Modal>
);
