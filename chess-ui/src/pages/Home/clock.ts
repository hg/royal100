import moment from "moment";

export class Clock {
  private remainingSeconds = 0;
  private interval?: ReturnType<typeof setInterval>;

  private updateClock = () => {
    this.remainingSeconds--;
    if (this.remainingSeconds <= 0) {
      this.remainingSeconds = 0;
      this.stop();
    }
  };

  set(value: number): void {
    if (value <= 0) {
      throw new Error("invalid time");
    }
    this.remainingSeconds = value;
  }

  continue() {
    this.interval = setInterval(this.updateClock, 1000);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  get remainingSecs(): number {
    return this.remainingSeconds;
  }

  get remaining(): string {
    return moment().seconds(this.remainingSeconds).format("HH:mm:ss");
  }
}
