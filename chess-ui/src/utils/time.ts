import moment, { Moment } from "moment";

export function secondsToMoment(time: number): Moment {
  return moment.utc(time * 1000);
}

export function momentToSeconds(time: Moment): number {
  return time.hours() * 60 * 60 + time.minutes() * 60 + time.seconds();
}

export function secToMs(sec: number): number {
  return sec * 1000;
}
