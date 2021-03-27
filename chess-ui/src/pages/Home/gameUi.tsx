import React, { Fragment } from "react";
import { Button, Modal } from "antd";
import { ButtonProps } from "antd/lib/button";

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

export async function choosePromotion(promotions: string[]) {
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
