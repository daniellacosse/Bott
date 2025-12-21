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
  BottChannel,
  BottEvent,
  BottGlobalSettings,
  BottUser,
  NonEmptyArray,
} from "@bott/model";

export enum BottActionEventType {
  ACTION_CALL = "action:call",
  ACTION_START = "action:start",
  ACTION_ABORT = "action:abort",
  ACTION_COMPLETE = "action:complete",
  ACTION_OUTPUT = "action:output",
  ACTION_ERROR = "action:error",
}

export type BottAction = BottActionFunction & BottActionSettings;

export type BottActionFunction = (
  this: BottActionContext,
  parameters: BottActionParameterEntry[],
) => AsyncGenerator<BottEvent, BottEvent | void, void>;

export type BottActionHandler = (
  this: BottActionContext,
  params: Record<
    string,
    BottActionParameterValue | undefined
  >,
) => AsyncGenerator<BottEvent, BottEvent | void, void>;

export type BottActionContext = {
  id: string;
  signal: AbortSignal;
  settings: BottActionSettings;
  globalSettings: BottGlobalSettings;
  user?: BottUser;
  channel?: BottChannel;
};

export type BottActionSettings = {
  name: string;
  instructions: string;
  limitPerMonth?: number;
  parameters?: NonEmptyArray<BottActionParameter>;
  shouldInterpretOutput?: boolean;
  shouldForwardOutput?: boolean;
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

export type BottActionAbortEvent = BottEvent<
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

export type BottActionOutputEvent = BottEvent<
  BottActionEventType.ACTION_OUTPUT,
  {
    name: string;
    id: string;
    event: BottEvent;
    shouldInterpretOutput?: boolean;
    shouldForwardOutput?: boolean;
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
