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

import {
  type AnyShape,
  type BottActionCallEvent,
  type BottActionCompleteEvent,
  type BottChannel,
  type BottEvent as BottEventInterface,
  type BottEventAttachment,
  BottEventType,
  type BottUser,
} from "@bott/model";

/**
 * Represents a generic event in Bott.
 */
export class BottEvent<
  T extends BottEventType = BottEventType,
  D extends AnyShape = AnyShape,
> extends CustomEvent<D> implements BottEventInterface<T, D> {
  override type: T;
  id: string;
  createdAt: Date;
  lastProcessedAt?: Date;
  channel?: BottChannel;
  parent?: BottEvent;
  user?: BottUser;
  attachments?: BottEventAttachment[];

  constructor(type: T, eventInitDict?: {
    detail?: D;
    channel?: BottChannel;
    parent?: BottEvent;
    user?: BottUser;
    attachments?: BottEventAttachment[];
  }) {
    super(type, eventInitDict);
    this.type = type;
    this.id = crypto.randomUUID();
    this.createdAt = new Date();
    this.channel = eventInitDict?.channel;
    this.parent = eventInitDict?.parent;
    this.user = eventInitDict?.user;
    this.attachments = eventInitDict?.attachments;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      type: this.type,
      detail: this.detail,
      createdAt: this.createdAt,
      lastProcessedAt: this.lastProcessedAt,
      channel: this.channel,
      parent: this.parent,
      user: this.user,
      attachments: this.attachments,
    };
  }
}

export function isBottActionCallEvent(
  event: BottEventInterface,
): event is BottActionCallEvent {
  return event.type === BottEventType.ACTION_CALL;
}

export function isBottActionCompleteEvent(
  event: BottEventInterface,
): event is BottActionCompleteEvent {
  return event.type === BottEventType.ACTION_COMPLETE;
}
