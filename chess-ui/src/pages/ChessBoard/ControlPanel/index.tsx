import { observer } from "mobx-react-lite";
import { Game } from "../../../game/game";
import { Spinner } from "../../../components/Spinner";
import React, { Fragment } from "react";
import { TimeClock } from "../TimeClock";
import { Button, message, notification, Statistic } from "antd";
import { BiHelpCircle, FaChess, FiFlag, GiStopSign } from "react-icons/all";
import { useHistory } from "react-router";
import { routes } from "../../routes";
import styles from "./index.module.css";

interface Props {
  game?: Game;
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

export const ControlPanel = observer<Props>(({ game }) => {
  const history = useHistory();

  if (!game) {
    return <Spinner loading />;
  }

  function startNewGame() {
    history.push(routes.home);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.clock}>
        <TimeClock color={game.topColor} clock={game.clocks[game.topColor]} />
      </div>

      <div className={styles.buttons}>
        <Statistic
          value={game?.score || "?"}
          title="Перевес противника"
          className={styles.stat}
        />

        {game.isPlaying ? (
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
                disabled={!(game.isMyTurn && !game.isThinking)}
              >
                <BiHelpCircle className="icon" /> Подсказка
              </Button>

              <Button
                size="large"
                type="primary"
                danger
                block
                onClick={() => game?.forfeit()}
                disabled={!game.isPlaying}
              >
                <FiFlag className="icon" /> Сдаться
              </Button>
            </Fragment>
          )
        ) : (
          <Button size="large" block onClick={startNewGame}>
            <FaChess className="icon" /> Новая партия
          </Button>
        )}
      </div>

      <div className={styles.clock}>
        <TimeClock
          color={game.bottomColor}
          clock={game.clocks[game.bottomColor]}
        />
      </div>
    </div>
  );
});
