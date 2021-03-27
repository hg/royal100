import React, { Fragment, useEffect, useRef, useState } from "react";
import styles from "./index.module.css";
import { Game } from "./game";
import { Skill } from "../../utils/consts";
import { observer } from "mobx-react-lite";

export const Home = observer(() => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [game, setGame] = useState<Game | null>(null);

  async function run() {
    if (ref.current) {
      const game = new Game(ref.current);
      await game.newGame({
        myColor: "white",
        skill: Skill.max,
        totalTime: 3600,
        plyTime: 300,
      });
      setGame(game);
    }
  }

  useEffect(() => {
    run();
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.left}>
        <p>clock 1</p>
        <p>clock 2</p>
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
