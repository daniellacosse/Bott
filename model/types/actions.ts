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

import type { AnyShape } from "./utility.ts";
import type { BottActionCallEvent, BottActionResultEvent } from "./events.ts";

/**
 * Defines the signature for a handler function that processes `BottActionCallEvent`s.
 * @template O - Shape of the options for the incoming request.
 * @template D - Shape of the details for the outgoing response.
 */
export type BottAction<
  O extends AnyShape = AnyShape,
  D extends AnyShape = AnyShape,
> = {
  (
    request: BottActionCallEvent<O>,
  ): Promise<BottActionResultEvent<D>>;
  /** Optional description of what the action does. */
  description?: string;
  /** Optional array of options that this action accepts. */
  options?: BottActionOption[];
};

/**
 * Enumerates the types for options in a `BottAction`.
 */
export enum BottActionOptionType {
  STRING = "string",
  INTEGER = "integer",
  BOOLEAN = "boolean",
}

/**
 * Defines the structure for an option within a `BottAction`.
 */
export type BottActionOption = {
  name: string;
  type: BottActionOptionType;
  allowedValues?: string[];
  /** Optional description of the option. */
  description?: string;
  /** Optional flag indicating if the option is required. */
  required?: boolean;
};
