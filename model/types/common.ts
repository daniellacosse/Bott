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
 * Represents a generic shape for an object, typically used as a constraint
 * for event details or request options where the specific structure can vary.
 */
export type AnyShape = Record<string, unknown>;

/**
 * Represents a non-empty array of elements of type T.
 */
export type NonEmptyArray<T> = [T, ...Array<T>];
