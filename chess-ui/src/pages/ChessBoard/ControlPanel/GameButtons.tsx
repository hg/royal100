import { Game } from "../../../game/game";
import { Button, message, Modal, notification, Popconfirm } from "antd";
import {
  AiOutlineArrowLeft,
  AiOutlineRollback,
  AiOutlineSave,
  BiHelpCircle,
  FaChess,
  FaRegHandPeace,
  FiFlag,
  FiSettings,
  GiStopSign,
} from "react-icons/all";
import React, { FC, Fragment, useCallback } from "react";
import { observer } from "mobx-react-lite";
import { useHistory } from "react-router";
import { routes } from "../../routes";
import { Settings } from "../GameSettings";
import { saveFile } from "../../../utils/file";
import { confirmMsg } from "../../../utils/dialogs";
import { useHotkey } from "../../../utils/hotkeys";
import styles from "./index.module.css";
import { useKeyboardControl } from "./keyboard";

interface Props {
  game: Game;
}

interface ButtonsProps extends Props {
  onShowSettings: () => void;
  onSet: (settings: Partial<Settings>) => void;
}

const resignMsg = "Вы действительно хотите сдаться?";

const Resign: FC<Props> = ({ game }) => {
  useHotkey("KeyR", () => confirmMsg(resignMsg).then(game.resign));

  return (
    <Popconfirm title={resignMsg} onConfirm={game.resign}>
      <Button size="large" type="primary" danger block>
        <FiFlag className="icon" /> Сдаться (R)
      </Button>
    </Popconfirm>
  );
};

const WaitingModeButtons = observer<Props>(({ game }) => {
  const askForDraw = useCallback(async () => {
    if (game.canAskForDraw) {
      const success = await game.askForDraw();
      if (!success) {
        Modal.error({ title: "Компьютер отказался принимать ничью." });
      }
    }
  }, [game]);

  const getHint = useCallback(async () => {
    const move = await game.getHint();
    if (!move) {
      message.error({ content: "Хороших ходов нет" });
    } else {
      notification.info({ message: `Попробуйте ${move.from}—${move.to}` });
    }
  }, [game]);

  useHotkey("KeyV", getHint);
  useHotkey("KeyU", game.undoLastMove);
  useHotkey("KeyT", askForDraw);

  return (
    <Fragment>
      <Button
        size="large"
        type="primary"
        block
        onClick={getHint}
        disabled={!game.isMyTurn}
      >
        <BiHelpCircle className="icon" /> Подсказка (V)
      </Button>

      {game.canUndoLastMove && (
        <Button size="large" block onClick={game.undoLastMove}>
          <AiOutlineRollback className="icon" /> Отменить ход (U)
        </Button>
      )}

      <Resign game={game} />

      {game.canAskForDraw && (
        <Button size="large" block onClick={askForDraw}>
          <FaRegHandPeace className="icon" /> Предложить ничью (T)
        </Button>
      )}
    </Fragment>
  );
});

const ActiveGameButtons = observer<Props>(({ game }) => {
  useHotkey("KeyW", game.stopThinking);

  return game.isThinking ? (
    <Button
      size="large"
      type="primary"
      block
      danger
      onClick={game.stopThinking}
    >
      <GiStopSign className="icon" /> Остановить поиск (W)
    </Button>
  ) : (
    <WaitingModeButtons game={game} />
  );
});

async function save(game: Game, history: ReturnType<typeof useHistory>) {
  const state = JSON.stringify(game.serialize());
  saveFile(state);

  game.stop();
  history.replace(routes.home);

  notification.success({
    message: "Игра сохранена",
    description:
      "Загрузите сохранение на главном экране, чтобы продолжить игру.",
    duration: 10,
  });
}

export const GameButtons = observer<ButtonsProps>(
  ({ game, onShowSettings, onSet }) => {
    const history = useHistory();
    const newGame = useCallback(() => history.push(routes.home), [history]);
    const saveGame = useCallback(() => save(game, history), [game, history]);
    const sidebar = useCallback(() => onSet({ showSidebar: false }), [onSet]);
    const combo = useKeyboardControl(game);

    useHotkey("KeyS", onShowSettings);
    useHotkey("KeyQ", saveGame);
    useHotkey("KeyZ", sidebar);
    useHotkey("KeyN", newGame);

    return (
      <Fragment>
        {game.isPlaying ? (
          <Fragment>
            <ActiveGameButtons game={game} />

            <Button size="large" block onClick={sidebar}>
              <AiOutlineArrowLeft className="icon" /> Скрыть (Z)
            </Button>
          </Fragment>
        ) : (
          <Button size="large" block onClick={newGame}>
            <FaChess className="icon" /> Новая партия (N)
          </Button>
        )}

        <Button size="large" block onClick={onShowSettings}>
          <FiSettings className="icon" /> Настройки (S)
        </Button>

        <Button size="large" block onClick={saveGame}>
          <AiOutlineSave className="icon" /> Отложить игру (Q)
        </Button>

        {combo.file || combo.rank ? (
          <div className={styles.keys}>
            {combo.file}
            {combo.rank}
          </div>
        ) : null}
      </Fragment>
    );
  }
);
