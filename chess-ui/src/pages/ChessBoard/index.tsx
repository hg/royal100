import React, { Fragment, useEffect, useRef, useState } from "react";
import styles from "./index.module.css";
import { Game, GameConfig, GameState, LossReason } from "./game";
import { observer } from "mobx-react-lite";
import { TimeClock } from "./TimeClock";
import { Button, message, Modal, notification } from "antd";
import {
  AiOutlineArrowDown,
  BiHelpCircle,
  BsArrowUpRight,
  FaChess,
  FaChessKnight,
  FiFlag,
  GiStopSign,
  HiOutlineRefresh,
} from "react-icons/all";
import { reaction } from "mobx";
import { useHistory } from "react-router";
import { routes } from "../routes";
import { clipboard } from "electron";

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

interface Props {
  config: GameConfig;
}

export const ChessBoard = observer(({ config }: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [game, setGame] = useState<Game | null>(null);

  async function run(elem: HTMLElement) {
    const game = new Game(elem);
    setGame(game);

    reaction(
      () => game.state,
      (state) => onStateChanged(game, state)
    );
  }

  const history = useHistory();

  function startNewGame() {
    history.push(routes.home);
  }

  useEffect(() => {
    if (game) {
      game.newGame(config);
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
        notification.info({
          message: `Попробуйте ${move.from}—${move.to}`,
        });
      }
    }
  }

  function copyFen(num: number, fen: string) {
    notification.success({
      message: `Нотация хода №${num} скопирована в буфер обмена`,
    });
    clipboard.writeText(fen);
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
              disabled={!(game.isMyTurn && !game.isThinking)}
            >
              <BiHelpCircle className="icon" /> Подсказка
            </Button>

            <Button
              size="large"
              type="primary"
              block
              danger
              onClick={() => game?.stopThinking()}
              disabled={!game.isThinking}
            >
              <GiStopSign className="icon" /> Остановить обдумывание
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

            <Button
              size="large"
              block
              onClick={startNewGame}
              disabled={game.isPlaying}
            >
              <FaChess className="icon" /> Новая партия
            </Button>
          </Fragment>
        )}
      </div>

      <div className={styles.boardWrap}>
        <div className={styles.board}>
          <div ref={ref} className="cg-wrap" />
        </div>
      </div>

      <div className={styles.right}>
        <h3>История ходов</h3>

        <table className={styles.historyTable}>
          <thead>
            <tr>
              <th>№</th>
              <th title="Фигура">
                <FaChessKnight />
              </th>
              <th title="Из позиции">
                <BsArrowUpRight />
              </th>
              <th title="В позицию">
                <AiOutlineArrowDown />
              </th>
              <th title="Взятие">
                <HiOutlineRefresh />
              </th>
            </tr>
          </thead>

          <tbody>
            {game?.moves.map((move, index) => (
              <tr
                key={index}
                title="Скопировать позицию в нотации FEN"
                role="button"
                onClick={() => copyFen(index + 1, move.fen)}
              >
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
  );
});
