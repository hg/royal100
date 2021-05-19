import React, { FC } from "react";
import { Button } from "antd";
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
      onClick={onToggle}
    >
      {shown ? (
        <AiOutlineArrowLeft className="icon-float" />
      ) : (
        <AiOutlineArrowRight className="icon-float" />
      )}
    </Button>
  );
};
