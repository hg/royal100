import React, { FC } from "react";
import { Button } from "antd";
import styles from "./index.module.css";
import { AiOutlineArrowLeft, AiOutlineArrowRight } from "react-icons/all";
import { hotkeys, useHotkey } from "../../../utils/hotkeys";

interface Props {
  shown: boolean;
  onToggle: () => void;
}

export const ZenButton: FC<Props> = ({ shown, onToggle }) => {
  useHotkey(hotkeys.sidebar, onToggle);

  return (
    <Button
      shape="circle"
      title={`Переключить панели (${hotkeys.sidebar})`}
      className={styles.btn}
      onClick={onToggle}
    >
      {shown ? (
        <AiOutlineArrowLeft className={styles.icon} />
      ) : (
        <AiOutlineArrowRight className={styles.icon} />
      )}
    </Button>
  );
};
