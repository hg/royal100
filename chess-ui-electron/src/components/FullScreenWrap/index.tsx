import React, { PropsWithChildren } from "react";
import styles from "./index.module.css";

export const FullScreenWrap = ({
  children,
}: PropsWithChildren<Record<string, unknown>>) => (
  <div className={styles.wrap}>{children}</div>
);
