import React, { Fragment } from "react";
import { Button, Modal } from "antd";
import { ButtonProps } from "antd/lib/button";
import { sound, Track } from "./audio";

const names = {
  q: "Ферзь",
  r: "Ладья",
  b: "Слон",
  n: "Конь",
};

interface Props {
  promotions: string[];
  name: keyof typeof names;
  onClick: (name: string) => void;
}

function Promotion({ promotions, name, onClick }: Props) {
  if (!promotions.includes(name)) {
    return null;
  }
  return (
    <Button block onClick={() => onClick(name)}>
      {names[name]}
    </Button>
  );
}

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

export async function choosePromotion(promotions: string[]) {
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
        <Fragment>
          <Promotion promotions={promotions} name="q" onClick={done} />
          <Promotion promotions={promotions} name="r" onClick={done} />
          <Promotion promotions={promotions} name="b" onClick={done} />
          <Promotion promotions={promotions} name="n" onClick={done} />
        </Fragment>
      ),
    });
  });
}
