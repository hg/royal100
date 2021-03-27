import React, { useEffect, useRef } from "react";
import styles from "./index.module.css";
import { Game } from "./game";

export function Home() {
  const ref = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Game | null>(null);

  async function run() {
    if (ref.current) {
      const game = new Game(ref.current);
      await game.newGame({
        myColor: "white",
      });
      gameRef.current = game;
    }
  }

  useEffect(() => {
    run();
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.board}>
        <div ref={ref} className="cg-wrap" />
      </div>
    </div>
  );
}
