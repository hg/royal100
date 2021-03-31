import React, { useEffect, useRef, useState } from "react";
import styles from "./index.module.css";
import { observer } from "mobx-react-lite";
import { Modal } from "antd";
import { reaction } from "mobx";
import { Game, GameConfig, GameState, LossReason } from "../../game/game";
import { MoveHistory } from "./MoveHistory";
import { ControlPanel } from "./ControlPanel";

function onStateChanged(game: Game, state: GameState) {
  let reason = "";
  if (game.lossReason === LossReason.Mate) {
    reason = "мат";
  } else if (game.lossReason === LossReason.Timeout) {
    reason = "закончилось время";
  } else if (game.lossReason === LossReason.Forfeit) {
    reason = "сдача";
  }

  let message = "";
  if (state === GameState.LossWhite) {
    message = `Белые проиграли: ${reason}`;
  } else if (state === GameState.LossBlack) {
    message = `Чёрные проиграли: ${reason}`;
  } else if (state === GameState.Draw) {
    message = "Ничья";
  }

  if (message) {
    Modal.info({
      title: "Партия завершена",
      content: message,
    });
  }
}

interface Props {
  config: GameConfig;
}

export const ChessBoard = observer(({ config }: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [game, setGame] = useState<Game | undefined>(undefined);

  async function run(elem: HTMLElement) {
    const game = new Game(elem);
    setGame(game);

    reaction(
      () => game.state,
      (state) => onStateChanged(game, state)
    );
  }

  useEffect(() => {
    if (game) {
      game.newGame(config);
      return () => game.stop();
    }
    return undefined;
  }, [game]);

  useEffect(() => {
    if (ref.current) {
      run(ref.current);
    }
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.left}>
        <ControlPanel game={game} />
      </div>

      <div className={styles.boardWrap}>
        <div className={styles.board}>
          <div ref={ref} className="cg-wrap" />
        </div>
      </div>

      <div className={styles.right}>
        <MoveHistory game={game} />
      </div>
    </div>
  );
});
