import styles from "./index.module.css";
import { momentToSeconds, secondsToMoment } from "../../utils/time";
import { FC, ReactNode } from "react";
import { Button, Form, Input, TimePicker } from "antd";

export interface TimeRange {
  seconds: number;
  title: string;
}

interface Props {
  title: ReactNode;
  value: number;
  onChange: (value: number) => void;
  ranges: TimeRange[];
}

export const TimeControl: FC<Props> = ({ title, value, onChange, ranges }) => (
  <Form.Item label={title} className={styles.timeControl}>
    <Input.Group compact>
      <TimePicker
        showNow={false}
        value={secondsToMoment(value)}
        onChange={(time) => {
          if (time) {
            onChange(momentToSeconds(time));
          }
        }}
        className={styles.timePicker}
      />
      {ranges.map((range) => (
        <Button key={range.seconds} onClick={() => onChange(range.seconds)}>
          {range.title}
        </Button>
      ))}
    </Input.Group>
  </Form.Item>
);
