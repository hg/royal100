export function isEmpty(
  data: number | object | string | undefined | null
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
