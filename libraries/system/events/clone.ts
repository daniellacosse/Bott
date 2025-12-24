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

/**
 * cloning a BottEvent is non-trivial because structuredClone destroys File objects.
 * This function handles deep cloning while preserving File instances.
 */
// TODO: general circular reference utility
export const cloneBottEvent = <T>(
  value: T,
  memo: Map<object, object> = new Map(),
): T => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== "object") {
    return value;
  }

  if (memo.has(value)) {
    return memo.get(value) as T;
  }

  if (value instanceof File) {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }

  if (Array.isArray(value)) {
    const clone = [] as unknown as T;
    memo.set(value, clone as object);
    for (let i = 0; i < value.length; i++) {
      (clone as unknown as unknown[])[i] = cloneBottEvent(value[i], memo);
    }
    return clone;
  }

  const clone = Object.create(Object.getPrototypeOf(value)) as T;
  memo.set(value, clone as object);

  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      clone[key] = cloneBottEvent(value[key], memo);
    }
  }

  return clone;
};
