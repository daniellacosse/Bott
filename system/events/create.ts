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
  BottEventInterface,
  BottEventActionParameterRecord,
  BottEventAttachment,
  ShallowBottEvent,
} from "../types.ts";
import { BottEventType } from "../types.ts";

type BottEventConstructorProperties<
  T extends BottEventType,
  D extends AnyShape,
> = Partial<Omit<BottEventInterface<T, D>, "type" | "parent">> & {
  user: BottUser;
  parent?: BottEventInterface;
};

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
  public readonly parent?: BottEventInterface;

  constructor(
    type: T,
    properties: BottEventConstructorProperties<T, D>,
  ) {
    super(type, { detail: properties.detail });
    this.id = properties.id ?? crypto.randomUUID();
    this.createdAt = properties.createdAt ?? new Date();
    this.lastProcessedAt = properties.lastProcessedAt;
    this.channel = properties.channel;
    this.parent = properties.parent;
    this.user = properties.user;
    this.attachments = properties.attachments;
  }

  toJSON(): ShallowBottEvent {
    const result: ShallowBottEvent = {
      id: this.id,
      createdAt: this.createdAt.toJSON(),
      type: this.type,
      parent: this.parent?.toJSON(),
      detail: {},
      user: {
        id: this.user.id,
        name: this.user.name,
      },
    };

    if (this.detail) {
      switch (result.type) {
        case BottEventType.REACTION:
        case BottEventType.REPLY:
        case BottEventType.MESSAGE:
          result.detail = {
            content: this.detail.content,
          };
          break;
        case BottEventType.ACTION_CALL:
          {
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
                (this.detail.parameters as BottEventActionParameterRecord) ??
                {},
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
          }
          break;
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
        case BottEventType.ACTION_ABORT:
          result.detail = {
            id: this.detail.id,
          };
          break;
        default:
          throw new Error("Invalid event type");
      }
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

  static async fromShallow<T extends BottEventType, D extends AnyShape>(
    shallow: ShallowBottEvent,
  ): Promise<BottEvent<T, D>> {
    // Recursively hydrate parent if present
    const parent = shallow.parent
      ? await BottEvent.fromShallow(shallow.parent as ShallowBottEvent)
      : undefined;

    let detail: unknown;
    switch (shallow.type) {
      case BottEventType.MESSAGE:
      case BottEventType.REACTION:
      case BottEventType.REPLY:
        detail = {
          content: shallow.detail.content,
        };
        break;
      case BottEventType.ACTION_CALL:
        detail = {
          name: shallow.detail.name,
          parameters: {
            ...(shallow.detail.parameters as BottEventActionParameterRecord),
          },
        };
        break;
      case BottEventType.ACTION_OUTPUT:
        detail = {
          id: shallow.detail.id,
          event: await BottEvent.fromShallow(
            shallow.detail.event as ShallowBottEvent,
          ),
          shouldInterpretOutput: shallow.detail.shouldInterpretOutput,
          shouldForwardOutput: shallow.detail.shouldForwardOutput,
        };
        break;
      case BottEventType.ACTION_START:
        detail = {
          id: shallow.detail.id,
          name: shallow.detail.name,
        };
        break;
      case BottEventType.ACTION_ERROR: {
        const { message, ...options } = shallow.detail.error as Error;

        detail = {
          id: shallow.detail.id,
          error: new Error(message, options),
        };
        break;
      }
      case BottEventType.ACTION_COMPLETE:
      case BottEventType.ACTION_ABORT:
        detail = {
          id: shallow.detail.id,
        };
        break;
      default:
        throw new Error("Invalid event type");
    }

    const event = new BottEvent(shallow.type as T, {
      id: shallow.id,
      detail: detail as D,
      createdAt: new Date(shallow.createdAt),
      lastProcessedAt: shallow.lastProcessedAt
        ? new Date(shallow.lastProcessedAt)
        : undefined,
      user: shallow.user,
      channel: shallow.channel,
      parent,
    });

    if (shallow.attachments) {
      event.attachments = [];
      for (const attachment of shallow.attachments) {
        event.attachments.push({
          id: attachment.id,
          type: attachment.type,
          originalSource: new URL(attachment.originalSource),
          parent: event,
          raw: {
            id: attachment.raw.id,
            path: attachment.raw.path,
            file: new File(
              [await Deno.readFile(attachment.raw.path)],
              attachment.raw.file.name,
              { type: attachment.raw.file.type },
            ),
          },
          compressed: {
            id: attachment.compressed.id,
            path: attachment.compressed.path,
            file: new File(
              [await Deno.readFile(attachment.compressed.path)],
              attachment.compressed.file.name,
              { type: attachment.compressed.file.type },
            ),
          },
        });
      }
    }

    return event;
  }
}
