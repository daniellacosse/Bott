/**
 * @license
 * This file is part of Bott.
 *
 * This project is dual-licensed:
 * - Non-commercial use: AGPLv3 (see LICENSE file for full text).
 * - Commercial use: Proprietary License (contact D@nielLaCos.se for details).
 *
 * Copyright (C) 2025 DanielLaCos.se
 */

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
