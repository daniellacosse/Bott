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
> {
  id: string;
  type: T;
  detail: D;
  createdAt: Date;
  lastProcessedAt?: Date;
  channel?: BottChannel;
  parent?: BottEvent;
  user?: BottUser;
  attachments?: BottEventAttachment[];
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
