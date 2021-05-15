import { Game, GameState, StateType, WinReason } from "../../game/game";
import { sound, Track } from "../../game/audio";
import { Modal } from "antd";

export function onGameStateChanged(game: Game, state: GameState) {
  let reason = "";
  let playSound = false;
  let message = "";

  if (state.state === StateType.Win) {
    switch (state.reason) {
      case WinReason.Mate:
        reason = "мат";
        break;
      case WinReason.Timeout:
        reason = "закончилось время";
        break;
      case WinReason.Resign:
        reason = "сдача";
        break;
    }
    switch (state.side) {
      case "white":
        message = `Белые победили: ${reason}`;
        break;
      case "black":
        message = `Чёрные победили: ${reason}`;
        break;
    }
    playSound = true;
  } else if (state.state === StateType.Draw) {
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
