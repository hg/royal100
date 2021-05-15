import { swap } from "./util";

export function random(fromInclusive: number, toInclusive: number): number {
  const min = Math.ceil(fromInclusive);
  const max = Math.floor(toInclusive);
  const rand = Math.random() * (max - min + 1) + min;
  return Math.floor(rand);
}

// Fisher-Yates
export function shuffle<T>(data: T[]): T[] {
  const up = data.length - 1;
  for (let i = 0; i < up; ++i) {
    const j = random(i, up);
    swap(data, i, j);
  }
  return data;
}
