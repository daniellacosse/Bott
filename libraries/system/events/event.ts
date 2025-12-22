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
import type {
  BottEventAttachment,
  BottEvent as BottEventInterface,
  BottEventType,
} from "./types.ts";

/**
 * Represents a generic event in Bott.
 */
export class BottEvent<
  T extends BottEventType = BottEventType,
  D extends AnyShape = AnyShape,
> extends CustomEvent<D> implements BottEventInterface<T, D> {
  public readonly id: string;

  // CustomEvent.type is readonly, so we need to override it to make it writable
  public override get type(): T {
    return super.type as T;
  }

  public attachments?: BottEventAttachment[];
  public lastProcessedAt?: Date;
  public readonly channel?: BottChannel;
  public readonly createdAt: Date;
  public readonly parent?: BottEvent;
  public readonly user?: BottUser;

  constructor(
    type: T,
    {
      id,
      detail,
      createdAt,
      lastProcessedAt,
      channel,
      parent,
      user,
      attachments,
    }: Partial<Omit<BottEventInterface<T, D>, "type">>,
  ) {
    super(type, { detail });
    this.id = id ?? crypto.randomUUID();
    this.createdAt = createdAt ?? new Date();
    this.lastProcessedAt = lastProcessedAt;
    this.channel = channel;
    this.parent = parent as BottEvent | undefined;
    this.user = user;
    this.attachments = attachments;
  }

  toJSON(): Record<string, unknown> {
    return {
      type: this.type,
      detail: this.detail,
      id: this.id,
      createdAt: this.createdAt,
      lastProcessedAt: this.lastProcessedAt,
      channel: this.channel,
      parent: this.parent,
      user: this.user,
      attachments: this.attachments,
    };
  }
}

export type BottMessageEvent = BottEvent<BottEventType.MESSAGE, {
  content: string;
}>;

export type BottReplyEvent = BottEvent<BottEventType.REPLY, {
  content: string;
}>;

export type BottReactionEvent = BottEvent<BottEventType.REACTION, {
  content: string;
}>;


export type BottEventActionParameterValue = string | number | boolean | File;

type _ParameterBase = {
  name: string;
  description?: string;
  required?: boolean;
};

type _NonFileParameter = _ParameterBase & {
  type: "string" | "number" | "boolean";
  allowedValues?: (string | number | boolean)[];
  defaultValue?: string | number | boolean;
};

type _FileParameter = _ParameterBase & {
  type: "file";
  defaultValue?: File;
};

export type BottEventActionParameter =
  | _NonFileParameter
  | _FileParameter;

export type BottEventActionParameterEntry = {
  name: string;
  value: BottEventActionParameterValue;
  type: BottEventActionParameter["type"];
};

export type BottActionCallEvent = BottEvent<BottEventType.ACTION_CALL, {
  id: string;
  name: string;
  parameters: BottEventActionParameterEntry[];
}>;

export type BottActionStartEvent = BottEvent<BottEventType.ACTION_START, {
  name: string;
  id: string;
}>;

export type BottActionOutputEvent = BottEvent<BottEventType.ACTION_OUTPUT, {
  name: string;
  id: string;
  event: BottEvent;
  shouldInterpretOutput?: boolean;
  shouldForwardOutput?: boolean;
}>;


export type BottActionErrorEvent = BottEvent<BottEventType.ACTION_ERROR, {
  name: string;
  id: string;
  error: Error;
}>;

export type BottActionCompleteEvent = BottEvent<BottEventType.ACTION_COMPLETE, {
  name: string;
  id: string;
}>;

export type BottActionAbortEvent = BottEvent<BottEventType.ACTION_ABORT, {
  name: string;
  id: string;
}>;

