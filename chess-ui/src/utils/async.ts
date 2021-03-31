export function sleep<T = void>(millis: number, value?: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), millis);
  });
}

const timeoutResult = Symbol("timeout_reached");

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const result = await Promise.race([
      promise,
      sleep(timeoutMs, timeoutResult),
    ]);
    if (result === timeoutResult) {
      reject();
    } else {
      resolve(result);
    }
  });
}
