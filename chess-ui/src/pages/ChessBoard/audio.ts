import { getAudioPath } from "../../utils/system";

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
    this.sounds[Track.Move] = new Audio(getAudioPath("move.ogg"));
    this.sounds[Track.Capture] = new Audio(getAudioPath("capture.ogg"));
  }

  play(track: Track) {
    this.sounds[track]?.play();
  }
}

export const sound = new Sound();
