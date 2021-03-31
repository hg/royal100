import { getAudioPath } from "../utils/system";

export enum Track {
  Move,
  Capture,
}

type Sounds = {
  [key in Track]?: HTMLAudioElement;
};

class Sound {
  private sounds: Sounds = {};

  constructor() {
    this.addSound(Track.Move, "move.ogg");
    this.addSound(Track.Capture, "capture.ogg");
  }

  private addSound(track: Track, filename: string) {
    this.sounds[track] = new Audio(getAudioPath(filename));
  }

  play(track: Track) {
    this.sounds[track]?.play();
  }
}

export const sound = new Sound();
