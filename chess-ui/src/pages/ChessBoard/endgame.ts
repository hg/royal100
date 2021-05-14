import { Game, GameState, LossReason } from "../../game/game";
import { sound, Track } from "../../game/audio";
import { Modal } from "antd";

export function onGameStateChanged(game: Game, state: GameState) {
  let reason = "";
  if (game.lossReason === LossReason.Mate) {
    reason = "мат";
  } else if (game.lossReason === LossReason.Timeout) {
    reason = "закончилось время";
  } else if (game.lossReason === LossReason.Resign) {
    reason = "сдача";
  }

  let playSound = false;
  let message = "";

  if (state === GameState.LossWhite) {
    message = `Белые проиграли: ${reason}`;
    playSound = true;
  } else if (state === GameState.LossBlack) {
    message = `Чёрные проиграли: ${reason}`;
    playSound = true;
  } else if (state === GameState.Draw) {
    message = "Ничья";
  }

  if (message) {
    Modal.info({
      title: "Партия завершена",
      content: message,
    });

    if (playSound) {
      if (game.hasWon) {
        sound.play(Track.Win);
      } else {
        sound.play(Track.Lose);
      }
    }
  }
}
