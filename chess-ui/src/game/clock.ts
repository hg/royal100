import { action, computed, makeObservable, observable } from "mobx";

const secondsInMinute = 60;
const secondsInHour = secondsInMinute * 60;
const updateInterval = 500;

export class Clock {
  @observable private msec = 0;
  @observable private total = 0;
  private interval?: ReturnType<typeof setInterval>;
  private lastMs?: number;

  constructor() {
    makeObservable(this);
  }

  @action.bound
  private updateClock() {
    const now = performance.now();
    const passedMs = now - (this.lastMs || 0);
    this.lastMs = now;
    this.setInternal(this.msec - passedMs);
  }

  @computed
  get isActive(): boolean {
    return !!this.interval;
  }

  @action.bound
  add(ms: number) {
    this.setInternal(this.msec + ms, this.total + ms);
  }

  @action.bound
  set(ms: number) {
    this.setInternal(ms, ms);
  }

  @action.bound
  private setInternal(ms: number, total?: number) {
    if (ms <= 0) {
      this.msec = 0;
      this.stop();
    } else {
      this.msec = ms;
    }
    if (total) {
      this.total = total;
    }
  }

  @action.bound
  continue() {
    this.lastMs = performance.now();
    this.interval = setInterval(this.updateClock, updateInterval);
  }

  @action.bound
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.lastMs = undefined;
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
  get remainingPct(): number {
    if (this.total === 0) {
      return 0;
    }
    return Math.round((this.msec / this.total) * 100);
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

    if (secs === 60) {
      secs = 0;
    }

    const hh = hhrs.toFixed(0).padStart(2, "0");
    const mm = mins.toFixed(0).padStart(2, "0");
    const ss = secs.toFixed(0).padStart(2, "0");

    if (hhrs === 0) {
      return `${mm}:${ss}`;
    } else {
      return `${hh}:${mm}:${ss}`;
    }
  }
}
