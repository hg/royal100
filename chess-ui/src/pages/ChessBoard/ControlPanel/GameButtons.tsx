import { Game } from "../../../game/game";
import { Button, message, Modal, notification, Popconfirm } from "antd";
import {
  AiOutlineArrowLeft,
  AiOutlineRollback,
  AiOutlineSave,
  BiHelpCircle,
  BsArrowsMove,
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
import { hotkeys } from "../../../utils/hotkeys";
import styles from "./index.module.css";
import { useKeyboardControl } from "./keyboard";
import { Hotkey } from "../../../components/Hotkey";

interface Props {
  game: Game;
}

interface ButtonsProps extends Props {
  onShowSettings: () => void;
  onSet: (settings: Partial<Settings>) => void;
}

const resignMsg = "Вы действительно хотите сдаться?";

const Resign: FC<Props> = ({ game }) => {
  const confirmResignation = useCallback(
    () => confirmMsg(resignMsg).then(game.resign),
    [game]
  );

  return (
    <Popconfirm title={resignMsg} onConfirm={game.resign}>
      <Button size="large" type="primary" danger block>
        <Hotkey hotkey={hotkeys.resign} action={confirmResignation}>
          <FiFlag className="icon" /> Сдаться
        </Hotkey>
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

  return (
    <Fragment>
      {game.isMyTurn && (
        <Button size="large" type="primary" block onClick={getHint}>
          <Hotkey hotkey={hotkeys.hint} action={getHint}>
            <BiHelpCircle className="icon" /> Подсказка
          </Hotkey>
        </Button>
      )}

      {game.canUndoLastMove && (
        <Button size="large" block onClick={game.undoLastMove}>
          <Hotkey hotkey={hotkeys.undoMove} action={game.undoLastMove}>
            <AiOutlineRollback className="icon" /> Отменить ход
          </Hotkey>
        </Button>
      )}

      <Resign game={game} />

      {game.canAskForDraw && (
        <Button size="large" block onClick={askForDraw}>
          <Hotkey hotkey={hotkeys.askDraw} action={askForDraw}>
            <FaRegHandPeace className="icon" /> Предложить ничью
          </Hotkey>
        </Button>
      )}
    </Fragment>
  );
});

const ThinkingButtons: FC<{ game: Game }> = ({ game }) => (
  <Button size="large" type="primary" block danger onClick={game.stopThinking}>
    <Hotkey hotkey={hotkeys.stopThinking} action={game.stopThinking}>
      <GiStopSign className="icon" /> Остановить поиск
    </Hotkey>
  </Button>
);

const ActiveGameButtons = observer<Props>(({ game }) =>
  game.isThinking ? (
    <ThinkingButtons game={game} />
  ) : (
    <WaitingModeButtons game={game} />
  )
);

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

const PlayingButtons: FC<Pick<ButtonsProps, "onSet" | "game">> = ({
  game,
  onSet,
}) => {
  const sidebar = useCallback(() => onSet({ showSidebar: false }), [onSet]);

  return (
    <Fragment>
      <ActiveGameButtons game={game} />

      <Button size="large" block onClick={game.showMoves}>
        <Hotkey hotkey={hotkeys.showMoves} action={game.showMoves}>
          <BsArrowsMove className="icon" /> Возможные ходы
        </Hotkey>
      </Button>

      <Button size="large" block onClick={sidebar}>
        <Hotkey hotkey={hotkeys.sidebar} action={sidebar}>
          <AiOutlineArrowLeft className="icon" /> Скрыть
        </Hotkey>
      </Button>
    </Fragment>
  );
};

const NonPlayingButtons: FC = () => {
  const history = useHistory();
  const newGame = useCallback(() => history.push(routes.home), [history]);

  return (
    <Button size="large" block onClick={newGame}>
      <Hotkey hotkey={hotkeys.newGame} action={newGame}>
        <FaChess className="icon" /> Новая партия
      </Hotkey>
    </Button>
  );
};

export const GameButtons = observer<ButtonsProps>(
  ({ game, onShowSettings, onSet }) => {
    const history = useHistory();
    const saveGame = useCallback(() => save(game, history), [game, history]);
    const combo = useKeyboardControl(game);

    return (
      <Fragment>
        {game.isPlaying ? (
          <PlayingButtons game={game} onSet={onSet} />
        ) : (
          <NonPlayingButtons />
        )}

        <Button size="large" block onClick={onShowSettings}>
          <Hotkey hotkey={hotkeys.settings} action={onShowSettings}>
            <FiSettings className="icon" /> Настройки
          </Hotkey>
        </Button>

        <Button size="large" block onClick={saveGame}>
          <Hotkey hotkey={hotkeys.saveGame} action={saveGame}>
            <AiOutlineSave className="icon" /> Отложить игру
          </Hotkey>
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
