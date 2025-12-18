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

import type { BottEvent, BottEventType } from "./events.ts";
import type { NonEmptyArray } from "./utility.ts";
import type { BottGlobalSettings } from "./settings.ts";

export type BottAction = BottActionFunction & BottActionSettings;

export type BottActionFunction = (
  parameters: BottActionParameterEntry[],
  context: BottActionContext,
) => Promise<void>;

export type BottActionContext = {
  signal: AbortSignal;
  settings: BottActionSettings;
  globalSettings: BottGlobalSettings;
};

export type BottActionSettings = {
  name: string;
  instructions: string;
  parameters?: NonEmptyArray<BottActionParameter>
};

export type BottActionParameterValue = string | number | boolean | File;

export type BottActionParameter = {
  name: string;
  type: "string" | "number" | "boolean" | "file";
  allowedValues?: BottActionParameterValue[];
  description?: string;
  required?: boolean;
};

export type BottActionParameterEntry = {
  name: string;
  value: BottActionParameterValue;
}

export type BottActionCallEvent = BottEvent<
  BottEventType.ACTION_CALL,
  {
    id: string;
    name: string;
    parameters: BottActionParameterEntry[];
  }
>;

export type BottActionStartEvent = BottEvent<
  BottEventType.ACTION_START,
  {
    name: string;
    id: string;
  }
>;

export type BottActionCancelEvent = BottEvent<
  BottEventType.ACTION_ABORT,
  {
    name: string;
    id: string;
  }
>;

export type BottActionCompleteEvent = BottEvent<
  BottEventType.ACTION_COMPLETE,
  {
    name: string;
    id: string;
  }
>;

export type BottActionErrorEvent = BottEvent<
  BottEventType.ACTION_ERROR,
  {
    name: string;
    id: string;
    error: Error;
  }
>;
