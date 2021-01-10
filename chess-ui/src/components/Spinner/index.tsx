import React, { PropsWithChildren } from "react";
import { Spin } from "antd";
import { SpinProps } from "antd/lib/spin";

interface IProps extends PropsWithChildren<SpinProps> {
  loading: boolean;
}

export const Spinner = ({ loading, ...rest }: IProps) => (
  // eslint-disable-next-line react/jsx-props-no-spreading
  <Spin spinning={loading} size="large" tip="Загрузка…" {...rest} />
);
