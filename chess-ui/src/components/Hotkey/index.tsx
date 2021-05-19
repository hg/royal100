import { FC, Fragment } from "react";
import { useHotkey } from "../../utils/hotkeys";
import styles from "./index.module.css";

interface Props {
  hotkey: string;
  action: () => void;
}

export const Hotkey: FC<Props> = ({ hotkey, action, children }) => {
  useHotkey(hotkey, action);

  return (
    <Fragment>
      {children} <span className={styles.hotkey}>{hotkey}</span>
    </Fragment>
  );
};
