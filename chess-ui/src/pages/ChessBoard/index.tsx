import React, { useCallback, useEffect, useRef } from "react";
import styles from "./index.module.css";
import { observer } from "mobx-react-lite";
import { reaction } from "mobx";
import { GameConfig } from "../../game/game";
import { MoveHistory } from "./MoveHistory";
import { useSettings } from "./GameSettings";
import { useGame } from "./hooks";
import { LeftSidebar } from "./LeftSidebar";
import { onGameStateChanged } from "./endgame";
import { ZenButton } from "./ZenButton";
import { SerializedState } from "../../game/state";
import { ChessHelpButton } from "./ChessHelp/ChessHelpButton";

interface Props {
  config: GameConfig;
  state?: SerializedState;
}

export const ChessBoard = observer(({ config, state }: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [settings, setSettings] = useSettings();
  const game = useGame(ref, config, state);
  const showSidebar = settings.showSidebar || !game?.isPlaying;

  useEffect(() => {
    if (game) {
      return reaction(
        () => game.state,
        () => onGameStateChanged(game)
      );
    }
  }, [game]);

  const toggleSidebar = useCallback(
    () => setSettings((old) => ({ ...old, showSidebar: !old.showSidebar })),
    [setSettings]
  );

  return (
    <div className={`${styles.wrap} board-wrap ${settings.pieces}`}>
      {showSidebar && (
        <aside className={styles.leftSidebar}>
          {game && (
            <LeftSidebar
              game={game}
              settings={settings}
              setSettings={setSettings}
            />
          )}
        </aside>
      )}

      <div className={styles.floatingButtons}>
        <ZenButton shown={showSidebar} onToggle={toggleSidebar} />
        <ChessHelpButton />
      </div>

      <main className={`${styles.boardWrap} ${settings.background}`}>
        <div
          className={`${styles.board} ${settings.background} ${
            settings.showSidebar ? "" : styles.zen
          }`}
        >
          <div ref={ref} className={`cg-wrap ${settings.background}`} />
        </div>
      </main>

      {showSidebar && (
        <aside className={styles.rightSidebar}>
          {game && (
            <MoveHistory
              detailed={settings.history === "detailed"}
              moves={game.moves}
              canMove={game.canUndo}
              setMove={game.undoMove}
              current={game.currentMove}
            />
          )}
        </aside>
      )}
    </div>
  );
});
