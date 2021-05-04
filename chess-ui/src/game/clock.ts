import { action, computed, makeObservable, observable } from "mobx";

const secondsInMinute = 60;
const secondsInHour = secondsInMinute * 60;
const updateInterval = 250;

export class Clock {
  @observable
  private msec = 0;
  private interval?: ReturnType<typeof setInterval>;

  constructor() {
    makeObservable(this);
  }

  @action.bound
  private updateClock() {
    this.set(this.msec - updateInterval);
  }

  @computed
  get isActive(): boolean {
    return !!this.interval;
  }

  @action.bound
  add(ms: number) {
    this.set(this.msec + ms);
  }

  @action.bound
  set(ms: number) {
    if (ms <= 0) {
      this.msec = 0;
      this.stop();
    } else {
      this.msec = ms;
    }
  }

  @action.bound
  continue() {
    this.interval = setInterval(this.updateClock, updateInterval);
  }

  @action.bound
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  @computed
  get remainingSecs(): number {
    return this.remainingMs / 1000;
  }

  @computed
  get remainingMs(): number {
    return this.msec;
  }

  @computed
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

    if (hh === "00") {
      return `${mm}:${ss}`;
    } else {
      return `${hh}:${mm}:${ss}`;
    }
  }
}
