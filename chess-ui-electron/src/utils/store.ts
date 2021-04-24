const lsPrefix = "local-store:";

function buildKey(key: string): string {
  return `${lsPrefix}${key}`;
}

export const localStore = {
  set<T>(key: string, value: T): string {
    const json = JSON.stringify(value);
    localStorage.setItem(buildKey(key), json);
    return json;
  },

  get<T>(key: string): T | null {
    const json = localStorage.getItem(buildKey(key));
    if (json) {
      try {
        return JSON.parse(json);
      } catch (e) {
        console.error("could not parse localStorage data", key, json);
      }
    }
    return null;
  },
};
