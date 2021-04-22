import React, { useEffect, useRef, useState } from "react";
import styles from "./index.module.css";
import { observer } from "mobx-react-lite";
import { Modal } from "antd";
import { reaction } from "mobx";
import { Game, GameConfig, GameState, LossReason } from "../../game/game";
import { MoveHistory } from "./MoveHistory";
import { ControlPanel } from "./ControlPanel";
import { sound, Track } from "../../game/audio";
import { GameSettings, useSettings } from "./GameSettings";

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
  const [settings, setSettings] = useSettings();
  const [showSettings, setShowSettings] = useState(false);

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

      const resizeHandler = () => game?.redraw();
      window.addEventListener("resize", resizeHandler);

      return () => {
        window.removeEventListener("resize", resizeHandler);
        game.stop();
      };
    }
    return undefined;
  }, [game]);

  return (
    <div className={styles.wrap}>
      {showSettings && (
        <GameSettings
          value={settings}
          onSet={(next) => setSettings({ ...settings, ...next })}
          onHide={() => setShowSettings(false)}
        />
      )}

      <div className={styles.left}>
        <ControlPanel
          game={game}
          onShowSettings={() => setShowSettings(true)}
        />
      </div>

      <div className={styles.boardWrap}>
        <div className={styles.board}>
          <div ref={ref} className={`cg-wrap ${settings.background}`} />
        </div>
      </div>

      <div className={styles.right}>
        {game && (
          <MoveHistory
            detailed={settings.history === "detailed"}
            moves={game.moves}
            canMove={game.canUndo}
            setMove={game.undoMove}
          />
        )}
      </div>
    </div>
  );
});
