export function trimPrefix(text: string, prefix: string): string {
  if (text.startsWith(prefix)) {
    return text.substring(prefix.length);
  }
  return text;
}
