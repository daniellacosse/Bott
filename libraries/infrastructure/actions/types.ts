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

import type { BottEvent } from "@bott/model";
import type { BottGlobalSettings } from "@bott/model";
import type { NonEmptyArray } from "@bott/model";

export enum BottActionEventType {
  ACTION_CALL = "action:call",
  ACTION_START = "action:start",
  ACTION_ABORT = "action:abort",
  ACTION_COMPLETE = "action:complete",
  ACTION_RESULT = "action:result",
  ACTION_ERROR = "action:error",
}

export type BottAction = BottActionFunction & BottActionSettings;

export type BottActionFunction = (
  this: BottActionContext,
  parameters: BottActionParameterEntry[],
) => Promise<void>;

export type BottActionHandler = (
  this: BottActionContext,
  params: Record<
    string,
    BottActionParameterValue | undefined
  >,
) => Promise<void>;

export type BottActionContext = {
  id: string;
  signal: AbortSignal;
  settings: BottActionSettings;
  globalSettings: BottGlobalSettings;
};

export type BottActionSettings = {
  name: string;
  instructions: string;
  limitPerMonth?: number;
  parameters?: NonEmptyArray<BottActionParameter>;
};

export type BottActionParameterValue = string | number | boolean | File;

type BottActionParameterBase = {
  name: string;
  description?: string;
  required?: boolean;
};

type BottActionParameterWithAllowedValues = BottActionParameterBase & {
  type: "string" | "number" | "boolean";
  allowedValues?: (string | number | boolean)[];
  defaultValue?: string | number | boolean;
};

type BottActionParameterFile = BottActionParameterBase & {
  type: "file";
  defaultValue?: File;
};

export type BottActionParameter =
  | BottActionParameterWithAllowedValues
  | BottActionParameterFile;

export type BottActionParameterEntry = {
  name: string;
  value: BottActionParameterValue;
};

export type BottActionCallEvent = BottEvent<
  BottActionEventType.ACTION_CALL,
  {
    id: string;
    name: string;
    parameters: BottActionParameterEntry[];
  }
>;

export type BottActionStartEvent = BottEvent<
  BottActionEventType.ACTION_START,
  {
    name: string;
    id: string;
  }
>;

export type BottActionCancelEvent = BottEvent<
  BottActionEventType.ACTION_ABORT,
  {
    name: string;
    id: string;
  }
>;

export type BottActionCompleteEvent = BottEvent<
  BottActionEventType.ACTION_COMPLETE,
  {
    name: string;
    id: string;
  }
>;

export type BottActionResultEvent = BottEvent<
  BottActionEventType.ACTION_RESULT,
  {
    name: string;
    id: string;
    result: unknown;
  }
>;

export type BottActionErrorEvent = BottEvent<
  BottActionEventType.ACTION_ERROR,
  {
    name: string;
    id: string;
    error: Error;
  }
>;
