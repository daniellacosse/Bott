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
  BottEvent as BottEventInterface,
  BottEventActionParameterRecord,
  BottEventAttachment,
  ShallowBottEvent,
} from "./types.ts";
import { BottEventType } from "./types.ts";

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

  public readonly user: BottUser;
  public attachments?: BottEventAttachment[];
  public lastProcessedAt?: Date;
  public readonly channel?: BottChannel;
  public readonly createdAt: Date;
  public readonly parent?: BottEvent;

  constructor(
    type: T,
    properties: Partial<Omit<BottEventInterface<T, D>, "type">> & {
      user: BottUser;
    },
  ) {
    super(type, { detail: properties.detail });
    this.id = properties.id ?? crypto.randomUUID();
    this.createdAt = properties.createdAt ?? new Date();
    this.lastProcessedAt = properties.lastProcessedAt;
    this.channel = properties.channel;
    this.parent = properties.parent as BottEvent | undefined;
    this.user = properties.user;
    this.attachments = properties.attachments;
  }

  toJSON(): ShallowBottEvent {
    const result: ShallowBottEvent = {
      id: this.id,
      createdAt: this.createdAt.toJSON(),
      type: this.type,
      detail: {},
      user: {
        id: this.user.id,
        name: this.user.name,
      },
    };

    switch (result.type) {
      case BottEventType.REACTION:
      case BottEventType.REPLY:
      case BottEventType.MESSAGE:
        result.detail = {
          content: this.detail.content,
        };
        break;
      case BottEventType.ACTION_CALL: {
        const parameters: Record<
          string,
          string | number | boolean | {
            name: string;
            size: number;
            type: string;
          }
        > = {};

        for (
          const [key, value] of Object.entries(
            this.detail.parameters as BottEventActionParameterRecord,
          )
        ) {
          if (value instanceof File) {
            parameters[key] = {
              name: value.name,
              size: value.size,
              type: value.type,
            };
          } else if (value) {
            parameters[key] = value;
          }
        }

        result.detail = {
          name: this.detail.name,
          parameters,
        };
        break;
      }
      case BottEventType.ACTION_OUTPUT:
        result.detail = {
          id: this.detail.id,
          event: (this.detail.event as BottEvent).toJSON(),
          shouldInterpretOutput: this.detail.shouldInterpretOutput,
          shouldForwardOutput: this.detail.shouldForwardOutput,
        };
        break;
      case BottEventType.ACTION_START:
        result.detail = {
          id: this.detail.id,
          name: this.detail.name,
        };
        break;
      case BottEventType.ACTION_ERROR: {
        const error = this.detail.error as Error;

        result.detail = {
          id: this.detail.id,
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack,
            cause: error.cause,
          },
        };
        break;
      }
      case BottEventType.ACTION_COMPLETE:
        result.detail = {
          id: this.detail.id,
        };
        break;
      case BottEventType.ACTION_ABORT:
        result.detail = {
          id: this.detail.id,
        };
        break;
    }

    if (this.parent) {
      result.parent = {
        id: this.parent.id,
        type: this.parent.type,
        detail: this.parent.detail,
        createdAt: this.parent.createdAt.toJSON(),
        lastProcessedAt: this.parent.lastProcessedAt?.toJSON(),
        user: {
          id: this.parent.user.id,
          name: this.parent.user.name,
        },
      };
    }

    if (this.channel) {
      result.channel = {
        id: this.channel.id,
        name: this.channel.name,
        description: this.channel.description,
        space: {
          id: this.channel.space.id,
          name: this.channel.space.name,
          description: this.channel.space.description,
        },
      };
    }

    if (this.attachments) {
      result.attachments = this.attachments.map((attachment) => ({
        id: attachment.id,
        type: attachment.type,
        originalSource: attachment.originalSource.toJSON(),
        raw: {
          id: attachment.raw.id,
          path: attachment.raw.path,
          file: {
            name: attachment.raw.file.name,
            size: attachment.raw.file.size,
            type: attachment.raw.file.type,
          },
        },
        compressed: {
          id: attachment.compressed.id,
          path: attachment.compressed.path,
          file: {
            name: attachment.compressed.file.name,
            size: attachment.compressed.file.size,
            type: attachment.compressed.file.type,
          },
        },
      }));
    }

    return result;
  }
}
