export function sleep<T = void>(millis: number, value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), millis);
  });
}

const timeoutResult = Symbol("timeout_reached");

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    Promise.race([promise, sleep(timeoutMs, timeoutResult)]).then((result) => {
      if (result === timeoutResult) {
        reject();
      } else {
        resolve(result);
      }
    });
  });
}
