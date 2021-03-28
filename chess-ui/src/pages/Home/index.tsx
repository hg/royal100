import React, { Fragment, useEffect, useRef, useState } from "react";
import styles from "./index.module.css";
import { Game, GameState, LossReason } from "./game";
import { Skill } from "../../utils/consts";
import { observer } from "mobx-react-lite";
import { TimeClock } from "./TimeClock";
import { Button, message, Modal } from "antd";
import { BiHelpCircle, FaChess, FiFlag } from "react-icons/all";
import { reaction } from "mobx";

function onStateChanged(game: Game, state: GameState) {
  let reason = "";
  if (game.lossReason === LossReason.Mate) {
    reason = "мат";
  } else if (game.lossReason === LossReason.Timeout) {
    reason = "закончилось время";
  } else if (game.lossReason === LossReason.Forfeit) {
    reason = "сдача";
  }

  let message = "";
  if (state === GameState.LossWhite) {
    message = `Белые проиграли: ${reason}`;
  } else if (state === GameState.LossBlack) {
    message = `Чёрные проиграли: ${reason}`;
  } else if (state === GameState.Draw) {
    message = "Ничья";
  }

  if (message) {
    Modal.info({
      title: "Партия завершена",
      content: message,
    });
  }
}

export const Home = observer(() => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [game, setGame] = useState<Game | null>(null);

  async function startNewGame() {
    if (game) {
      await game.newGame({
        myColor: "white",
        skill: Skill.min,
        totalTime: 3600,
        plyTime: 300,
      });
    }
  }

  async function run(elem: HTMLElement) {
    const game = new Game(elem);
    setGame(game);

    reaction(
      () => game.state,
      (state) => onStateChanged(game, state)
    );
  }

  useEffect(() => {
    if (game) {
      startNewGame();
    }
  }, [game]);

  useEffect(() => {
    if (ref.current) {
      run(ref.current);
    }
  }, []);

  async function getHint() {
    if (game) {
      const move = await game.getHint();
      if (!move) {
        message.error({ content: "Хороших ходов нет" });
      } else {
        message.success({ content: `Попробуйте ${move.from}—${move.to}` });
      }
    }
  }

  function forfeit() {
    game?.forfeit();
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.left}>
        {game && (
          <Fragment>
            <TimeClock color="white" clock={game.clocks.white} />
            <TimeClock color="black" clock={game.clocks.black} />

            <Button
              size="large"
              type="primary"
              block
              onClick={getHint}
              disabled={!game.isMyTurn}
            >
              <BiHelpCircle /> Подсказка
            </Button>

            <Button
              size="large"
              type="primary"
              danger
              block
              onClick={forfeit}
              disabled={!game.isPlaying}
            >
              <FiFlag /> Сдаться
            </Button>

            <Button
              size="large"
              block
              onClick={startNewGame}
              disabled={game.isPlaying}
            >
              <FaChess /> Новая партия
            </Button>
          </Fragment>
        )}
      </div>

      <div className={styles.board}>
        <div ref={ref} className="cg-wrap" />
      </div>

      <div className={styles.right}>
        <h3>История ходов</h3>

        <div>
          <table className={styles.historyTable}>
            <thead>
              <tr>
                <th>№</th>
                <th title="Фигура">Ф</th>
                <th title="Из позиции">Из</th>
                <th title="В позицию">В</th>
                <th title="Взятие">Вз</th>
              </tr>
            </thead>

            <tbody>
              {game?.moves.map((move, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    <div
                      className={`${move.piece?.role} ${move.color} ${styles.piece} ${styles.movePiece}`}
                    />
                  </td>
                  <td>{move.from}</td>
                  <td>{move.to}</td>
                  <td>
                    {move.captured && (
                      <div
                        className={`${move.captured.role} ${move.captured.color} ${styles.piece}`}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
