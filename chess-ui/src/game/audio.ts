import { getAudioPath } from "../utils/system";

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
    this.addSound(Track.Move, "move.ogg");
    this.addSound(Track.Capture, "capture.ogg");
    this.addSound(Track.Select, "select.ogg");
    this.addSound(Track.Confirm, "confirm.ogg");
    this.addSound(Track.Notify, "notify.ogg");
    this.addSound(Track.Win, "win.ogg");
    this.addSound(Track.Lose, "lose.ogg");
  }

  private addSound(track: Track, filename: string) {
    this.sounds[track] = new Audio(getAudioPath(filename));
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
