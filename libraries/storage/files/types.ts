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

import type { BottInputFileType } from "@bott/model";

export enum SupportedRawFileType {
  // GIF = "image/gif",
  HTML = "text/html",
  // MP4 = "video/mp4",
  // PDF = "application/pdf",
  PNG = "image/png",
  JPEG = "image/jpeg",
  TXT = "text/plain",
  // WAV = "audio/wav",
  // MP3 = "audio/mp3",
}

export type InputFileDataTransformer = (
  data: Uint8Array,
) => Promise<[data: Uint8Array, type: BottInputFileType]>;
