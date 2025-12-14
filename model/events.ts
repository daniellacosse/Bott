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

export type { BottChannel, BottUser } from "./types/entities.ts";
export { BottEventType } from "./types/events.ts";

import type { BottChannel, BottUser } from "./types/entities.ts";
import { BottEventType } from "./types/events.ts";
import type {
  BottActionCallEvent,
  BottActionResultEvent,
  BottEvent as BottEventInterface,
  BottEventAttachment,
} from "./types/events.ts";
import type { AnyShape } from "./types/utility.ts";

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

export function isBottActionResultEvent(
  event: BottEventInterface,
): event is BottActionResultEvent {
  return event.type === BottEventType.ACTION_RESULT;
}
