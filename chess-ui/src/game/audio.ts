import oggMove from "../assets/sounds/move.ogg";
import oggCapture from "../assets/sounds/capture.ogg";
import oggSelect from "../assets/sounds/select.ogg";
import oggConfirm from "../assets/sounds/confirm.ogg";
import oggNotify from "../assets/sounds/notify.ogg";
import oggWin from "../assets/sounds/win.ogg";
import oggLose from "../assets/sounds/lose.ogg";

export enum Track {
  Move,
  Capture,
  Select,
  Confirm,
  Notify,
  Win,
  Lose,
}

type Sounds = {
  [key in Track]?: HTMLAudioElement;
};

class Sound {
  private sounds: Sounds = {};

  constructor() {
    this.addSound(Track.Move, oggMove);
    this.addSound(Track.Capture, oggCapture);
    this.addSound(Track.Select, oggSelect);
    this.addSound(Track.Confirm, oggConfirm);
    this.addSound(Track.Notify, oggNotify);
    this.addSound(Track.Win, oggWin);
    this.addSound(Track.Lose, oggLose);
  }

  private addSound(track: Track, filename: string) {
    this.sounds[track] = new Audio(filename);
  }

  async play(track: Track) {
    const audio = this.sounds[track];
    if (!audio) {
      console.error("track not found", track);
      return;
    }
    try {
      await audio.play();
    } catch (e) {
      console.error("could not play track", track, e);
    }
  }
}

export const sound = new Sound();
