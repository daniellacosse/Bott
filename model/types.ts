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

/**
 * Represents a generic shape for an object, typically used as a constraint
 * for event details or request options where the specific structure can vary.
 */
export type AnyShape = Record<string, unknown>;

/**
 * Defines the structure for a "Space" in Bott.
 * A Space is a top-level container, similar to a server or guild in Discord.
 */
export interface BottSpace {
  id: string;
  name: string;
  description?: string;
  /** Optional array of channels belonging to this space. */
  channels?: BottChannel[];
}

/**
 * Defines the structure for a "Channel" in Bott.
 * A Channel is a specific communication context within a Space, like a text channel.
 */
export interface BottChannel {
  id: string;
  name: string;
  /** The space this channel belongs to. */
  space: BottSpace;
  /** Optional description or topic of the channel. */
  description?: string;
  // config?: {
  //   isQuiet: boolean;
  // };
}

/**
 * Defines the structure for a "User" in Bott.
 * Represents an individual interacting with the bot.
 */
export interface BottUser {
  id: string;
  name: string;
}

/**
 * Enumerates the different types of files that can be associated with a BottEvent.
 */
export enum BottFileType {
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
 * Convenience map for looking up an extension based on its file type.
 */
export const BOTT_FILE_TYPE_LOOKUP = Object.fromEntries(
  Object.entries(BottFileType).map(([key, value]) => [value, key]),
);

/**
 * Defines the structure for file data, which can be either a direct `Uint8Array`
 * or a path to the file, along with its `BottFileType`.
 */
export type BottFileData = {
  data: Uint8Array;
  type: BottFileType;
};

/**
 * Defines the structure for a "File" in Bott.
 * Represents a file attachment associated with an event.
 */
export interface BottFile {
  id: string;
  source?: URL;
  raw?: BottFileData;
  compressed?: BottFileData;
  parent?: BottEvent<AnyShape>;
}

/**
 * Enumerates the different types of events that can occur in Bott.
 */
export enum BottEventType {
  /** A standard message event. */
  MESSAGE = "message",
  /** A reply to a previous message. */
  REPLY = "reply",
  /** A reaction (e.g., emoji) to a previous message. */
  REACTION = "reaction",
  /** An event representing a request for Bott to perform an action (e.g., a command). */
  REQUEST = "request",
  /** An event representing Bott's response to a request. */
  RESPONSE = "response",
}

/**
 * Generic interface for all events within Bott.
 * @template D - Shape of the `details` object, defaults to `{ content: string }`.
 * @template T - The specific `BottEventType`, defaults to `BottEventType`.
 */
export interface BottEvent<
  D extends AnyShape = { content: string },
  T extends BottEventType = BottEventType,
> {
  id: string;
  type: T;
  details: D;
  /** Timestamp of when the event occurred. */
  timestamp: Date;
  /** Optional channel where the event took place. */
  channel?: BottChannel;
  /** Optional parent event, e.g., the message being replied or reacted to. */
  parent?: BottEvent<AnyShape>;
  /** Optional user who triggered or is associated with the event. */
  user?: BottUser;
  /** Optional array of files associated with the event. */
  files?: BottFile[];
}

/**
 * A BottEvent with `AnyShape` for its details, allowing for any event structure.
 */
export type AnyBottEvent = BottEvent<AnyShape>;

/**
 * Represents a specific type of `BottEvent` for requests (e.g., slash commands).
 * @template O - Shape of the `options` object for the request.
 */
export type BottRequestEvent<O extends AnyShape> = BottEvent<
  { name: string; options: O },
  BottEventType.REQUEST
>;

/**
 * Enumerates the types for options in a `BottRequest`.
 */
export enum BottRequestOptionType {
  STRING = "string",
  INTEGER = "integer",
  BOOLEAN = "boolean",
}

/**
 * Defines the structure for an option within a `BottRequest`.
 */
export type BottRequestOption = {
  name: string;
  type: BottRequestOptionType;
  allowedValues?: string[];
  /** Optional description of the option. */
  description?: string;
  /** Optional flag indicating if the option is required. */
  required?: boolean;
};

/**
 * Represents a specific type of `BottEvent` for responses to requests.
 * @template D - Shape of the `details` object for the response, defaults to `{ content: string }`.
 */
export type BottResponseEvent<D extends AnyShape = { content: string }> =
  BottEvent<
    D,
    BottEventType.RESPONSE
  >;

/**
 * Defines the signature for a handler function that processes `BottRequestEvent`s.
 * @template O - Shape of the options for the incoming request.
 * @template D - Shape of the details for the outgoing response, defaults to `{ content: string }`.
 */
export type BottRequestHandler<
  O extends AnyShape,
  D extends AnyShape = { content: string },
> = {
  (
    request: BottRequestEvent<O>,
  ):
    | BottResponseEvent<D>
    | Promise<BottResponseEvent<D>>;
  /** Optional description of what the request handler does. */
  description?: string;
  /** Optional array of options that this handler accepts. */
  options?: BottRequestOption[];
};
