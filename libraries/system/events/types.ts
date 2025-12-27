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

import type { AnyShape, BottChannel, BottUser } from "@bott/model";

/**
 * Enumerates the different types of events that can occur in Bott.
 */
export enum BottEventType {
  MESSAGE = "message",
  REPLY = "reply",
  REACTION = "reaction",
  ACTION_CALL = "action:call",
  ACTION_START = "action:start",
  ACTION_ABORT = "action:abort",
  ACTION_COMPLETE = "action:complete",
  ACTION_OUTPUT = "action:output",
  ACTION_ERROR = "action:error",
}

/**
 * Represents a generic event in Bott.
 */
export interface BottEvent<
  T extends BottEventType = BottEventType,
  D extends AnyShape = AnyShape,
> extends CustomEvent<D> {
  id: string;
  type: T;
  detail: D;
  createdAt: Date;
  lastProcessedAt?: Date;
  user: BottUser;
  channel?: BottChannel;
  parent?: BottEvent;
  attachments?: BottEventAttachment[];
  toJSON(): ShallowBottEvent;
}

/**
 * Represents an attachment associated with a BottEvent.
 */
export type BottEventAttachment = {
  id: string;
  type: BottEventAttachmentType;
  parent: BottEvent;
  originalSource: URL;
  raw: {
    id: string;
    path: string;
    file: File;
  };
  compressed: {
    id: string;
    path: string;
    file: File;
  };
};

/**
 * Enumerates the different types of attachments that can be associated with a BottEvent.
 */
export enum BottEventAttachmentType {
  PDF = "application/pdf",
  GIF = "image/gif",
  HTML = "text/html",
  JPEG = "image/jpeg",
  MD = "text/markdown",
  MP3 = "audio/mpeg",
  MP4 = "video/mp4",
  OPUS = "audio/opus",
  PNG = "image/png",
  TXT = "text/plain",
  WAV = "audio/x-wav",
  WEBP = "image/webp",
}

/**
 * Represents a shallow version of a BottEvent, containing only the most basic information. This version is safe to serialize and is used for communication between different parts of the application.
 */
export type ShallowBottEvent = {
  id: string;
  type: BottEventType;
  detail: AnyShape;
  createdAt: string;
  lastProcessedAt?: string;
  channel?: {
    id: string;
    name: string;
    description?: string;
    space: {
      id: string;
      name: string;
      description?: string;
    };
  };
  parent?: ShallowBottEvent;
  user: {
    id: string;
    name: string;
  };
  attachments?: ShallowBottAttachment[];
};

export type ShallowBottAttachment = {
  id: string;
  type: BottEventAttachmentType;
  originalSource: string;
  raw: {
    id: string;
    path: string;
    file: {
      name: string;
      size: number;
      type: string;
    };
  };
  compressed: {
    id: string;
    path: string;
    file: {
      name: string;
      size: number;
      type: string;
    };
  };
};

export type BottMessageEvent = BottEvent<BottEventType.MESSAGE, {
  content: string;
}>;

export type BottReplyEvent = BottEvent<BottEventType.REPLY, {
  content: string;
}>;

export type BottReactionEvent = BottEvent<BottEventType.REACTION, {
  content: string;
}>;

// The Action Events probably belong it @bott/actions?, however
// having them here simplifies things greatly.

// All of the libraries/system modules (and to a lesser extent the whole app)
// are currently _loosely_ coupled, so I'll take the simplicity over the correctness.

export type BottEventActionParameterValue = string | number | boolean | File;

type _ParameterDefinitionBase = {
  name: string;
  description?: string;
  required?: boolean;
};

type _StringParameterDefinition = _ParameterDefinitionBase & {
  type: "string";
  allowedValues?: string[];
  defaultValue?: string;
};

type _NonStringParameterDefinition = _ParameterDefinitionBase & {
  type: "number" | "boolean" | "file";
  allowedValues?: never;
  defaultValue?: number | boolean | File;
};

export type BottEventActionParameterDefinition =
  | _StringParameterDefinition
  | _NonStringParameterDefinition;

export type BottEventActionParameterRecord = Record<
  string,
  BottEventActionParameterValue | undefined
>;

export type BottActionCallEvent = BottEvent<BottEventType.ACTION_CALL, {
  name: string;
  parameters: BottEventActionParameterRecord;
}>;

export type BottActionStartEvent = BottEvent<BottEventType.ACTION_START, {
  name: string; // required for rate limiting
  id: string;
}>;

export type BottActionOutputEvent = BottEvent<BottEventType.ACTION_OUTPUT, {
  id: string;
  event: BottEvent;
  shouldInterpretOutput?: boolean;
  shouldForwardOutput?: boolean;
}>;

export type BottActionErrorEvent = BottEvent<BottEventType.ACTION_ERROR, {
  id: string;
  error: Error;
}>;

export type BottActionCompleteEvent = BottEvent<BottEventType.ACTION_COMPLETE, {
  id: string;
}>;

export type BottActionAbortEvent = BottEvent<BottEventType.ACTION_ABORT, {
  id: string;
}>;
