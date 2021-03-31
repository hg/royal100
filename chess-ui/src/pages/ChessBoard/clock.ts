import { action, makeAutoObservable } from "mobx";

const secondsInMinute = 60;
const secondsInHour = secondsInMinute * 60;

export class Clock {
  private secs = 0;
  private interval?: ReturnType<typeof setInterval>;

  constructor() {
    makeAutoObservable(this);
  }

  private updateClock = () => {
    this.set(this.secs - 1);
  };

  get isActive(): boolean {
    return !!this.interval;
  }

  @action
  set = (value: number) => {
    if (value <= 0) {
      this.secs = 0;
      this.stop();
    } else {
      this.secs = value;
    }
  };

  continue = () => {
    this.interval = setInterval(this.updateClock, 1000);
  };

  stop = () => {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  };

  get remainingSecs(): number {
    return this.secs;
  }

  get remainingMs(): number {
    return this.remainingSecs * 1000;
  }

  get remaining(): string {
    let secs = this.remainingSecs;

    let hhrs = 0;
    if (secs >= secondsInHour) {
      hhrs = Math.floor(secs / secondsInHour);
      secs -= hhrs * secondsInHour;
    }

    let mins = 0;
    if (secs >= secondsInMinute) {
      mins = Math.floor(secs / secondsInMinute);
      secs -= mins * secondsInMinute;
    }

    const hh = hhrs.toFixed(0).padStart(2, "0");
    const mm = mins.toFixed(0).padStart(2, "0");
    const ss = secs.toFixed(0).padStart(2, "0");

    return `${hh}:${mm}:${ss}`;
  }
}
