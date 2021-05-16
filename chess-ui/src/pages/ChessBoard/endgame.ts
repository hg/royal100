import {
  DrawReason,
  Game,
  GameState,
  StateType,
  WinReason,
} from "../../game/game";
import { sound, Track } from "../../game/audio";
import { Modal } from "antd";

export function formatGameResult(
  state: GameState,
  hasWon: boolean
): { message: string; reason: string; track?: Track } {
  let reason = "";
  let message = "";
  let track: Track | undefined = undefined;

  if (state.state === StateType.Win) {
    if (state.side === "white") {
      message = "Белые победили";
    } else {
      message = "Чёрные победили";
    }
    if (state.reason === WinReason.Mate) {
      reason = "мат";
    } else if (state.reason === WinReason.Timeout) {
      reason = "закончилось время";
    } else if (state.reason === WinReason.Resign) {
      reason = "сдача";
    }
    track = hasWon ? Track.Win : Track.Lose;
  }

  if (state.state === StateType.Draw) {
    message = "Ничья";
    if (state.reason === DrawReason.Agreement) {
      reason = "по соглашению игроков";
    } else if (state.reason === DrawReason.Stalemate) {
      reason = "пат";
    } else if (state.reason === DrawReason.HalfMoves) {
      reason = "50 полуходов";
    }
  }

  return { message, reason, track };
}

export function onGameStateChanged(game: Game) {
  const { message, reason, track } = formatGameResult(game.state, game.hasWon);

  if (track) {
    sound.play(track);
  }
  if (message) {
    Modal.info({
      title: "Партия завершена",
      content: `${message}: ${reason}`,
    });
  }
}
