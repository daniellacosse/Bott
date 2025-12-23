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

import type {
  BottEventActionParameterRecord,
  BottEventActionParameterDefinition,
  BottEvent,
} from "@bott/events";
import type { BottChannel, BottUser, NonEmptyArray } from "@bott/model";
import type { BottServiceContext } from "@bott/services";

export type BottAction = BottActionFunction & BottActionSettings;

export type BottActionFunction = (
  this: BottActionContext,
  parameters: BottEventActionParameterRecord,
) => AsyncGenerator<BottEvent, void, void>;

export type BottActionSettings = {
  instructions: string;
  limitPerMonth?: number;
  name: string;
  parameters?: NonEmptyArray<BottEventActionParameterDefinition>;
  shouldForwardOutput?: boolean;
  shouldInterpretOutput?: boolean;
};

export type BottActionContext = {
  channel?: BottChannel;
  id: string;
  service: BottServiceContext;
  settings: BottActionSettings;
  signal: AbortSignal;
  user?: BottUser;
};
