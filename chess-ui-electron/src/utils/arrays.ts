export function intersect<T>(first: T[], second: T[]): boolean {
  return first.some((value) => second.includes(value));
}
