import moment, { Moment } from "moment";

const secondsInMinute = 60;
const secondsInHour = secondsInMinute * 60;

export function secondsToMoment(time: number): Moment {
  return moment.utc(time * 1000);
}

export function momentToSeconds(time: Moment): number {
  return time.hours() * 60 * 60 + time.minutes() * 60 + time.seconds();
}

export function secToMs(sec: number): number {
  return sec * 1000;
}

export function formatTime(ms: number): string {
  let secs = ms / 1000;

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
