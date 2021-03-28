import { action, computed, observable } from "mobx";

export class Clock {
  private time = observable({ secs: 0 });
  private interval?: ReturnType<typeof setInterval>;

  @action
  private updateClock = () => {
    this.set(this.time.secs - 1);
  };

  @action
  set = (value: number) => {
    if (value <= 0) {
      this.time.secs = 0;
      this.stop();
    } else {
      this.time.secs = value;
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

  @computed
  get remainingSecs(): number {
    return this.time.secs;
  }

  @computed
  get remaining(): string {
    let secs = this.remainingSecs;

    let hhrs = 0;
    if (secs >= 60 * 60) {
      hhrs = Math.floor(secs / (60 * 60));
      secs -= hhrs * 60 * 60;
    }

    let mins = 0;
    if (secs >= 60) {
      mins = Math.floor(secs / 60);
      secs -= mins * 60;
    }

    const th = hhrs.toFixed(0).padStart(2, "0");
    const tm = mins.toFixed(0).padStart(2, "0");
    const ts = secs.toFixed(0).padStart(2, "0");

    return `${th}:${tm}:${ts}`;
  }
}
