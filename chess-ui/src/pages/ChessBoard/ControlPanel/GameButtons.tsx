import { Game } from "../../../game/game";
import { Button, message, Modal, notification } from "antd";
import {
  AiOutlineArrowLeft,
  BiHelpCircle,
  FaChess,
  FaRegHandPeace,
  FiFlag,
  FiSettings,
  GiStopSign,
} from "react-icons/all";
import React, { Fragment } from "react";
import { observer } from "mobx-react-lite";
import { useHistory } from "react-router";
import { routes } from "../../routes";
import { confirm } from "../../../utils/dialogs";
import { Settings } from "../GameSettings";

interface Props {
  game: Game;
}

interface ButtonsProps extends Props {
  onShowSettings: () => void;
  onSet: (settings: Partial<Settings>) => void;
}

async function getHint(game: Game) {
  if (game) {
    const move = await game.getHint();
    if (!move) {
      message.error({ content: "Хороших ходов нет" });
    } else {
      notification.info({
        message: `Попробуйте ${move.from}—${move.to}`,
      });
    }
  }
}

const WaitingModeButtons = observer<Props>(({ game }) => {
  async function askForDraw() {
    const success = await game.askForDraw();
    if (!success) {
      Modal.error({ title: "Компьютер отказался принимать ничью." });
    }
  }

  async function forfeit() {
    await confirm("Вы действительно хотите сдаться?");
    game.forfeit();
  }

  return (
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

      <Button size="large" type="primary" danger block onClick={forfeit}>
        <FiFlag className="icon" /> Сдаться
      </Button>

      {game.canAskForDraw && (
        <Button size="large" danger block onClick={askForDraw}>
          <FaRegHandPeace className="icon" /> Предложить ничью
        </Button>
      )}
    </Fragment>
  );
});

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
      </Fragment>
    );
  }
);
