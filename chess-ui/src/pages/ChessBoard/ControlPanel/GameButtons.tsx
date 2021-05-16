import { Game } from "../../../game/game";
import { Button, message, Modal, notification, Popconfirm } from "antd";
import {
  AiOutlineArrowLeft,
  AiOutlineSave,
  BiHelpCircle,
  FaChess,
  FaRegHandPeace,
  FiFlag,
  FiSettings,
  GiStopSign,
} from "react-icons/all";
import React, { FC, Fragment } from "react";
import { observer } from "mobx-react-lite";
import { useHistory } from "react-router";
import { routes } from "../../routes";
import { Settings } from "../GameSettings";
import { saveFile } from "../../../utils/file";

interface Props {
  game: Game;
}

interface ButtonsProps extends Props {
  onShowSettings: () => void;
  onSet: (settings: Partial<Settings>) => void;
}

async function getHint(game: Game) {
  const move = await game.getHint();
  if (!move) {
    message.error({ content: "Хороших ходов нет" });
  } else {
    notification.info({
      message: `Попробуйте ${move.from}—${move.to}`,
    });
  }
}

async function askForDraw(game: Game) {
  const success = await game.askForDraw();
  if (!success) {
    Modal.error({ title: "Компьютер отказался принимать ничью." });
  }
}

const Resign: FC<Props> = ({ game }) => {
  return (
    <Popconfirm
      title="Вы действительно хотите сдаться?"
      onConfirm={game.resign}
    >
      <Button size="large" type="primary" danger block>
        <FiFlag className="icon" /> Сдаться
      </Button>
    </Popconfirm>
  );
};

const WaitingModeButtons = observer<Props>(({ game }) => (
  <Fragment>
    <Button
      size="large"
      type="primary"
      block
      onClick={() => getHint(game)}
      disabled={!game.isMyTurn}
    >
      <BiHelpCircle className="icon" /> Подсказка
    </Button>

    <Resign game={game} />

    {game.canAskForDraw && (
      <Button size="large" danger block onClick={() => askForDraw(game)}>
        <FaRegHandPeace className="icon" /> Предложить ничью
      </Button>
    )}
  </Fragment>
));

const ActiveGameButtons = observer<Props>(({ game }) =>
  game.isThinking ? (
    <Button
      size="large"
      type="primary"
      block
      danger
      onClick={game.stopThinking}
    >
      <GiStopSign className="icon" /> Остановить поиск
    </Button>
  ) : (
    <WaitingModeButtons game={game} />
  )
);

export const GameButtons = observer<ButtonsProps>(
  ({ game, onShowSettings, onSet }) => {
    const history = useHistory();
    const startNewGame = () => history.push(routes.home);

    async function save(game: Game) {
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

    return (
      <Fragment>
        {game.isPlaying ? (
          <Fragment>
            <ActiveGameButtons game={game} />
            <Button
              size="large"
              block
              onClick={() => onSet({ showSidebar: false })}
            >
              <AiOutlineArrowLeft className="icon" /> Скрыть
            </Button>
          </Fragment>
        ) : (
          <Button size="large" block onClick={startNewGame}>
            <FaChess className="icon" /> Новая партия
          </Button>
        )}

        <Button size="large" block onClick={onShowSettings}>
          <FiSettings className="icon" /> Настройки
        </Button>

        <Button size="large" block onClick={() => save(game)}>
          <AiOutlineSave className="icon" /> Отложить игру
        </Button>
      </Fragment>
    );
  }
);
