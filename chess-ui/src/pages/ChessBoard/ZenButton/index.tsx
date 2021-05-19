import React, { FC } from "react";
import { Button } from "antd";
import styles from "./index.module.css";
import { AiOutlineArrowRight } from "react-icons/all";
import { hotkeys, useHotkey } from "../../../utils/hotkeys";

interface Props {
  onClick: () => void;
}

export const ZenButton: FC<Props> = ({ onClick }) => {
  useHotkey(hotkeys.sidebar, onClick);

  return (
    <Button
      shape="circle"
      title={`Показать панели (${hotkeys.sidebar})`}
      type="primary"
      className={styles.btn}
      onClick={onClick}
    >
      <AiOutlineArrowRight className={styles.icon} />
    </Button>
  );
};
