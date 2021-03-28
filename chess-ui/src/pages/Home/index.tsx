import React, { Fragment, useEffect, useRef, useState } from "react";
import styles from "./index.module.css";
import { Game } from "./game";
import { Skill } from "../../utils/consts";
import { observer } from "mobx-react-lite";
import { TimeClock } from "./TimeClock";
import { Button, message } from "antd";
import { BiHelpCircle } from "react-icons/all";

export const Home = observer(() => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [hintThinking, setHintThinking] = useState(false);

  async function run(elem: HTMLElement) {
    const game = new Game(elem);
    await game.newGame({
      myColor: "white",
      skill: Skill.min,
      totalTime: 3600,
      plyTime: 300,
    });
    setGame(game);
  }

  useEffect(() => {
    if (ref.current) {
      run(ref.current);
    }
  }, []);

  async function getHint() {
    if (game) {
      setHintThinking(true);
      try {
        const move = await game.getHint();
        if (!move) {
          message.error({ content: "Хороших ходов нет" });
        } else {
          message.success({ content: `Попробуйте ${move.from}—${move.to}` });
        }
      } finally {
        setHintThinking(false);
      }
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.left}>
        {game && (
          <Fragment>
            <TimeClock color="white" clock={game.clocks.white} />
            <TimeClock color="black" clock={game.clocks.black} />

            <Button
              block
              type="primary"
              onClick={getHint}
              disabled={hintThinking}
            >
              <BiHelpCircle /> Подсказка
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
