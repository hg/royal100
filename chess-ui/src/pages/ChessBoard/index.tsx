import React, { useEffect, useRef } from "react";
import styles from "./index.module.css";
import { observer } from "mobx-react-lite";
import { reaction } from "mobx";
import { GameConfig } from "../../game/game";
import { MoveHistory } from "./MoveHistory";
import { useSettings } from "./GameSettings";
import { useGame } from "./hooks";
import { LeftSidebar } from "./LeftSidebar";
import { onGameStateChanged } from "./endgame";

interface Props {
  config: GameConfig;
}

export const ChessBoard = observer(({ config }: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [settings, setSettings] = useSettings();
  const game = useGame(ref, config);

  useEffect(() => {
    if (game) {
      return reaction(
        () => game.state,
        (state) => onGameStateChanged(game, state)
      );
    }
  }, [game]);

  return (
    <div className={`${styles.wrap} board-wrap ${settings.pieces}`}>
      <div className={styles.left}>
        {game && (
          <LeftSidebar
            game={game}
            settings={settings}
            setSettings={setSettings}
          />
        )}
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
