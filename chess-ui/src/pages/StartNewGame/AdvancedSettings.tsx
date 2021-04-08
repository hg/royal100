import { observer } from "mobx-react-lite";
import { GameConfig } from "../../game/game";
import { Form, Input, TimePicker } from "antd";
import { formLayout } from "../../utils/forms";
import { momentToSeconds, secondsToMoment } from "../../utils/time";
import React from "react";

interface Props {
  config: GameConfig;
  setConfig: (config: GameConfig) => void;
}

export const AdvancedSettings = observer<Props>(({ config, setConfig }) => (
  <Form {...formLayout}>
    <Form.Item label="Максимальное время на один ход">
      <TimePicker
        showNow={false}
        placeholder="(не больше 80% от оставшегося времени)"
        className="full-width"
        value={config.plyTime ? secondsToMoment(config.plyTime) : undefined}
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
        onChange={(e) => setConfig({ ...config, fen: e.target.value })}
      />
    </Form.Item>
  </Form>
));
