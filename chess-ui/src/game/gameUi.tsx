import React, { Fragment } from "react";
import { Modal } from "antd";
import { ButtonProps } from "antd/lib/button";
import { sound, Track } from "./audio";
import { Color } from "chessgroundx/types";
import { Promotion } from "./Promotion";

const propsHide: ButtonProps = {
  style: { display: "none" },
};

export function confirmPrincessPromotion(): Promise<boolean> {
  sound.play(Track.Confirm);

  return new Promise((resolve) => {
    Modal.confirm({
      title: "Превращение принцессы в королеву",
      content: (
        <Fragment>
          <p>Ваша королева была взята.</p>
          <p>Желаете превратить принцессу в королеву?</p>
        </Fragment>
      ),
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}

export async function choosePromotion(side: Color, promotions: string[]) {
  sound.play(Track.Confirm);

  return new Promise((resolve) => {
    function done(promotion: string) {
      modal.destroy();
      resolve(promotion);
    }

    const modal = Modal.confirm({
      title: "Выберите фигуру",
      centered: true,
      closable: false,
      okCancel: false,
      cancelButtonProps: propsHide,
      okButtonProps: propsHide,
      content: (
        <div style={{ textAlign: "center" }}>
          <Promotion
            promotions={promotions}
            color={side}
            name="q"
            onClick={done}
          />
          <Promotion
            promotions={promotions}
            color={side}
            name="r"
            onClick={done}
          />
          <Promotion
            promotions={promotions}
            color={side}
            name="b"
            onClick={done}
          />
          <Promotion
            promotions={promotions}
            color={side}
            name="n"
            onClick={done}
          />
        </div>
      ),
    });
  });
}
