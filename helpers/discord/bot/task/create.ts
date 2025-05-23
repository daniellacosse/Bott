export type Task = {
  (signal: AbortSignal): Promise<void>;
  nonce: number;
  controller: AbortController;
};

export const createTask = (
  fn: (signal: AbortSignal) => Promise<void>,
): Task => {
  const nonce = Math.floor(Math.random() * 100000);
  const controller = new AbortController();
  return Object.assign(fn, { nonce, controller });
};
