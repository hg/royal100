import moment from "moment";

export class Clock {
  private passedSeconds = 0;
  private interval?: NodeJS.Timeout;

  private updateClock = () => {
    this.passedSeconds++;
  };

  start(): void {
    this.stop();
    this.reset();
    this.interval = setInterval(this.updateClock, 1000);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  reset(): void {
    this.passedSeconds = 0;
  }

  get passed(): number {
    return this.passedSeconds;
  }

  get passedFormatted(): string {
    return moment().seconds(this.passedSeconds).format("HH:mm:ss");
  }
}
