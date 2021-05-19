import { Button, Modal } from "antd";
import { hotkeys, useHotkey } from "../../../utils/hotkeys";
import { AiOutlineQuestionCircle } from "react-icons/all";
import React, { FC, Fragment, useCallback, useState } from "react";
import { ChessHelp } from "./index";

export const ChessHelpButton: FC = () => {
  const [show, setShow] = useState(false);
  const toggle = useCallback(() => setShow((old) => !old), []);

  useHotkey(hotkeys.help, toggle);

  return (
    <Fragment>
      <Modal visible={show} onCancel={toggle} footer={null} width={1000}>
        <ChessHelp />
      </Modal>

      <Button
        shape="circle"
        title={`Показать справку (${hotkeys.help})`}
        onClick={toggle}
      >
        <AiOutlineQuestionCircle className="icon-float" />
      </Button>
    </Fragment>
  );
};
