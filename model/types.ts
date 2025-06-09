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

export interface BottSpace {
  id: string;
  name: string;
  description?: string;
  channels?: BottChannel[];
}

export interface BottChannel {
  id: string;
  name: string;
  space: BottSpace;
  description?: string;
  // config?: {
  //   isQuiet: boolean;
  // };
}

export interface BottUser {
  id: string;
  name: string;
}

type AnyObject = Record<string, unknown>;

export enum BottInputFileType {
  MP4 = "video/mp4",
  JPEG = "image/jpeg",
  MD = "text/markdown",
  MP3 = "audio/mp3",
}

export interface BottInputFile {
  url: URL;
  data: Uint8Array;
  type: BottInputFileType;
  path: string;
  parent?: BottEvent<AnyObject>;
}

export enum BottOutputFileType {
  PNG = "image/png",
  MP4 = "video/mp4",
  WAV = "audio/wav",
  TXT = "text/plain",
}

export interface BottOutputFile {
  id: string;
  data: Uint8Array;
  type: BottOutputFileType;
  path: string;
  parent?: BottEvent<AnyObject>;
}

export enum BottEventType {
  MESSAGE = "message",
  REPLY = "reply",
  REACTION = "reaction",
  FUNCTION_REQUEST = "request",
  FUNCTION_RESPONSE = "response",
}

export interface BottEvent<
  D extends AnyObject = { content: string },
> {
  id: string;
  type: BottEventType;
  details: D;
  timestamp: Date;
  channel?: BottChannel;
  parent?: BottEvent<AnyObject>;
  user?: BottUser;
  files?: BottInputFile[] | BottOutputFile[];
}

export type AnyBottEvent = BottEvent<AnyObject>;
