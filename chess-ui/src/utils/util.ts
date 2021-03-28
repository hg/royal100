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
