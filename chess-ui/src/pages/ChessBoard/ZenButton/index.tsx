import React, { FC } from "react";
import { Button } from "antd";
import styles from "./index.module.css";
import { AiOutlineArrowRight } from "react-icons/all";

interface Props {
  onClick: () => void;
}

export const ZenButton: FC<Props> = ({ onClick }) => (
  <Button
    shape="circle"
    title="Показать панели"
    type="primary"
    className={styles.btn}
    onClick={onClick}
  >
    <AiOutlineArrowRight className={styles.icon} />
  </Button>
);
