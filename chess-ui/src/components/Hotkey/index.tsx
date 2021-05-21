import { FC, Fragment } from "react";
import { useHotkey } from "../../utils/hotkeys";
import styles from "./index.module.css";

interface Props {
  title?: string;
  hotkey: string;
  action: () => void;
}

export const Hotkey: FC<Props> = ({ hotkey, action, title, children }) => {
  useHotkey(hotkey, action);

  return (
    <Fragment>
      {children} <kbd className={styles.hotkey}>{title || hotkey}</kbd>
    </Fragment>
  );
};
