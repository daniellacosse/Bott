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
  AnyShape,
  BottChannel,
  BottSettings,
  BottUser,
  NonEmptyArray,
} from "@bott/model";

// =============================================================================
// Events
// =============================================================================

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
 * Represents a generic event in Bott.
 */
export interface BottEventInterface<
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
  parent?: BottEventInterface;
  attachments?: BottEventAttachment[];
  toJSON(): ShallowBottEvent;
}

/**
 * Represents an attachment associated with a BottEvent.
 */
export type BottEventAttachment = {
  id: string;
  type: BottEventAttachmentType;
  parent: BottEventInterface;
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
 * Represents a shallow version of a BottEvent, containing only the most basic information.
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
    description?: string;
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

export type BottMessageEvent = BottEventInterface<BottEventType.MESSAGE, {
  content: string;
}>;

export type BottReplyEvent = BottEventInterface<BottEventType.REPLY, {
  content: string;
}>;

export type BottReactionEvent = BottEventInterface<BottEventType.REACTION, {
  content: string;
}>;

export type BottActionParameterValue = string | number | boolean | File;

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

export type BottActionParameterDefinition =
  | _StringParameterDefinition
  | _NonStringParameterDefinition;

export type BottActionParameterRecord = Record<
  string,
  BottActionParameterValue | undefined
>;

export type BottActionCallEvent = BottEventInterface<
  BottEventType.ACTION_CALL,
  {
    name: string;
    parameters: BottActionParameterRecord;
  }
>;

export type BottActionStartEvent = BottEventInterface<
  BottEventType.ACTION_START,
  {
    name: string;
    id: string;
  }
>;

export type BottActionOutputEvent = BottEventInterface<
  BottEventType.ACTION_OUTPUT,
  {
    id: string;
    event: BottEventInterface;
    shouldInterpretOutput?: boolean;
    shouldForwardOutput?: boolean;
  }
>;

export type BottActionErrorEvent = BottEventInterface<
  BottEventType.ACTION_ERROR,
  {
    id: string;
    error: Error;
  }
>;

export type BottActionCompleteEvent = BottEventInterface<
  BottEventType.ACTION_COMPLETE,
  {
    id: string;
  }
>;

export type BottActionAbortEvent = BottEventInterface<
  BottEventType.ACTION_ABORT,
  {
    id: string;
  }
>;

// =============================================================================
// Actions
// =============================================================================

export type BottAction = BottActionFunction & BottActionSettings;

export type BottActionFunction = (
  this: BottActionContext,
  parameters: BottActionParameterRecord,
) => AsyncGenerator<BottEventInterface, void, void>;

export type BottActionSettings = {
  instructions: string;
  limitPerMonth?: number;
  name: string;
  parameters?: NonEmptyArray<BottActionParameterDefinition>;
  shouldForwardOutput?: boolean;
  shouldInterpretOutput?: boolean;
};

export type BottActionContext = {
  channel?: BottChannel;
  id: string;
  service: BottSystemContext;
  settings: BottActionSettings;
  signal: AbortSignal;
  user?: BottUser;
};

// =============================================================================
// Services
// =============================================================================

export type BottService = BottServiceFunction & BottServiceSettings;

export interface BottServiceFunction {
  (this: BottServiceContext): void | Promise<void>;
}

export interface BottServiceSettings {
  name: string;
  user?: BottUser;
}

export interface BottServiceContext {
  settings: Required<BottServiceSettings>;
  system: BottSystemContext;
  dispatchEvent: (event: BottEventInterface) => void;
  addEventListener<E extends BottEventInterface>(
    type: E["type"],
    listener: (event: E, context?: BottServiceContext) => unknown,
  ): void;
  removeEventListener<E extends BottEventInterface>(
    type: E["type"],
    listener: (event: E, context?: BottServiceContext) => unknown,
  ): void;
}

// =============================================================================
// System
// =============================================================================

export interface BottSystemContext {
  nonce: string;
  services: Record<string, BottService>;
  actions: Record<string, BottAction>;
  settings: BottSettings;
}
