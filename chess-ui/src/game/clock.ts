import { action, computed, makeObservable, observable } from "mobx";
import { formatTime } from "../utils/time";

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
  set(ms: number, total?: number) {
    this.setInternal(ms, total ?? ms);
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
  get totalMs(): number {
    return this.total;
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
    return formatTime(this.remainingMs);
  }
}
