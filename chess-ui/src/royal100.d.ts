declare function Royal100(): PromiseLike<RoyalEngine>;

declare type MessageListener = (line: string) => void;

declare interface RoyalEngine {
  ready: PromiseLike<void>;
  print(line: string): void;
  addMessageListener(listener: MessageListener): void;
  removeMessageListener(listener: MessageListener): void;
  terminate(): void;
  postMessage(message: string): void;
  postRun(): void;
}
