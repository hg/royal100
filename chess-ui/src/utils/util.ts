import { random } from "./random";

export function isEmpty(
  data: number | Record<string, unknown> | string | undefined | null
): boolean {
  if (!data) {
    return true;
  }
  if (typeof data === "object") {
    if (Array.isArray(data)) {
      return data.length === 0;
    }
    return Object.keys(data).length === 0;
  }
  return false;
}

export function isEven(num: number): boolean {
  return num % 2 === 0;
}

export function isOdd(num: number): boolean {
  return !isEven(num);
}

export function range(fromInclusive: number, toInclusive: number): number[] {
  const result: number[] = [];
  for (let i = fromInclusive; i <= toInclusive; ++i) {
    result.push(i);
  }
  return result;
}

export function swap<T>(data: T[], i: number, j: number): T[] {
  const first = data[i];
  data[i] = data[j];
  data[j] = first;
  return data;
}

export function pluck<T>(...arrays: T[][]): T | undefined {
  const nonEmpty = arrays.filter((arr) => arr.length);
  const arrayIndex = nonEmpty.length > 1 ? random(0, nonEmpty.length - 1) : 0;
  const array = nonEmpty[arrayIndex];
  if (!array) {
    return undefined;
  }
  const index = random(0, array.length - 1);
  return array.splice(index, 1)[0];
}

export function remove<T>(data: T[], ...items: T[]): T[] {
  for (const item of items) {
    const index = data.indexOf(item);
    if (index !== -1) {
      data.splice(index, 1);
    }
  }
  return data;
}

export function clamp(value: number, min: number, max: number) {
  if (value <= min) {
    return min;
  }
  if (value >= max) {
    return max;
  }
  return value;
}

export function sign(val: number): string {
  if (val === 0) {
    return "";
  }
  if (val < 0) {
    return "−";
  }
  return "+";
}
