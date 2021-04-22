import React, { FC, useEffect, useState } from "react";
import { Form, Modal, Radio } from "antd";
import { formLayout } from "../../../utils/forms";
import { localStore } from "../../../utils/store";

interface Props {
  value: Settings;
  onSet: (settings: Partial<Settings>) => void;
  onHide: () => void;
}

export interface Settings {
  history: "compact" | "detailed";
  background: "wood" | "marble";
}

const defaultSettings: Settings = {
  background: "wood",
  history: "detailed",
};

export function useSettings() {
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
        <Radio.Group
          value={value.background}
          onChange={(e) => onSet({ background: e.target.value })}
        >
          <Radio value="wood">Дерево</Radio>
          <Radio value="marble">Мрамор</Radio>
        </Radio.Group>
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
