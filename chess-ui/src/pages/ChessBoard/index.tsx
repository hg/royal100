import React, { useEffect, useRef, useState } from "react";
import styles from "./index.module.css";
import { observer } from "mobx-react-lite";
import { Modal, notification } from "antd";
import { reaction } from "mobx";
import { Game, GameConfig, GameState, LossReason } from "../../game/game";
import { MoveHistory } from "./MoveHistory";
import { ControlPanel } from "./ControlPanel";
import { sound, Track } from "../../game/audio";

function onStateChanged(game: Game, state: GameState) {
  let reason = "";
  if (game.lossReason === LossReason.Mate) {
    reason = "мат";
  } else if (game.lossReason === LossReason.Timeout) {
    reason = "закончилось время";
  } else if (game.lossReason === LossReason.Forfeit) {
    reason = "сдача";
  }

  let playSound = false;
  let message = "";

  if (state === GameState.LossWhite) {
    message = `Белые проиграли: ${reason}`;
    playSound = true;
  } else if (state === GameState.LossBlack) {
    message = `Чёрные проиграли: ${reason}`;
    playSound = true;
  } else if (state === GameState.Draw) {
    message = "Ничья";
  }

  if (message) {
    Modal.info({
      title: "Партия завершена",
      content: message,
    });

    if (playSound) {
      if (game.hasWon) {
        sound.play(Track.Win);
      } else {
        sound.play(Track.Lose);
      }
    }
  }
}

interface Props {
  config: GameConfig;
}

export const ChessBoard = observer(({ config }: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [game, setGame] = useState<Game | undefined>(undefined);

  function run(elem: HTMLElement) {
    const game = new Game(elem);
    setGame(game);

    const disposer = reaction(
      () => game.state,
      (state) => onStateChanged(game, state)
    );

    return () => {
      disposer();
      game.dispose();
    };
  }

  useEffect(() => {
    if (ref.current) {
      return run(ref.current);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (game) {
      game.newGame(config);
      return game.stop;
    }
    return undefined;
  }, [game]);

  function setMove(moveNumber: number) {
    if (game?.canUndo(moveNumber) === true) {
      game.setMove(moveNumber);
    } else {
      notification.error({
        message: "Нельзя вернуться к выбранному ходу.",
      });
    }
  }

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
        <MoveHistory undo={game?.undo} moves={game?.moves} onRevert={setMove} />
      </div>
    </div>
  );
});
