import { Game } from "../../../game/game";
import { Button, message, notification } from "antd";
import { BiHelpCircle, FaChess, FiFlag, GiStopSign } from "react-icons/all";
import React, { Fragment } from "react";
import { observer } from "mobx-react-lite";
import { useHistory } from "react-router";
import { routes } from "../../routes";

interface Props {
  game: Game;
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

const ActiveGameButtons = observer<Props>(({ game }) =>
  game.isThinking ? (
    <Button
      size="large"
      type="primary"
      block
      danger
      onClick={() => game?.stopThinking()}
    >
      <GiStopSign className="icon" /> Остановить поиск
    </Button>
  ) : (
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

      <Button
        size="large"
        type="primary"
        danger
        block
        onClick={() => game.forfeit()}
        disabled={!game.isPlaying}
      >
        <FiFlag className="icon" /> Сдаться
      </Button>
    </Fragment>
  )
);

export const GameButtons = observer<Props>(({ game }) => {
  const history = useHistory();
  const startNewGame = () => history.push(routes.home);

  return game.isPlaying ? (
    <ActiveGameButtons game={game} />
  ) : (
    <Button size="large" block onClick={startNewGame}>
      <FaChess className="icon" /> Новая партия
    </Button>
  );
});
