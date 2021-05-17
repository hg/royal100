import { Modal } from "antd";
import { ReactNode } from "react";

export function confirmMsg(content: ReactNode): Promise<void> {
  return new Promise((resolve, reject) => {
    Modal.confirm({
      type: "warning",
      title: "Внимание",
      content,
      onOk: () => resolve(),
      onCancel: () => reject(),
    });
  });
}
