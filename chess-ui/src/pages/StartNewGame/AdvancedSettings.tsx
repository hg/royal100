import { GameConfig, UndoMove } from "../../game/game";
import { Form, Input, Radio, TimePicker } from "antd";
import { formLayout } from "../../utils/forms";
import { momentToSeconds, secondsToMoment } from "../../utils/time";
import React, { FC } from "react";

interface Props {
  config: GameConfig;
  setConfig: (config: GameConfig) => void;
}

export const AdvancedSettings: FC<Props> = ({ config, setConfig }) => (
  <Form {...formLayout}>
    <Form.Item label="Отмена ходов">
      <Radio.Group
        value={config.undo}
        onChange={(e) => setConfig({ ...config, undo: e.target.value })}
      >
        <Radio value={UndoMove.None}>Без отмены</Radio>
        <Radio value={UndoMove.Single}>Только последний ход</Radio>
        <Radio value={UndoMove.Full}>Свободный ход по истории</Radio>
      </Radio.Group>
    </Form.Item>

    <Form.Item label="Максимальное время на один ход компьютера">
      <TimePicker
        showNow={false}
        placeholder="(не больше 80% оставшегося времени)"
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
);
