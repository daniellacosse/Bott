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
  GIF = "image/gif",
  HTML = "text/html",
  MP4 = "video/mp4",
  // PDF = "application/pdf",
  PNG = "image/png",
  JPEG = "image/jpeg",

  WAV = "audio/x-wav",
  MP3 = "audio/mpeg",
  TXT = "text/plain",
}

export type InputFileDataTransformer = (
  data: Uint8Array,
) => Promise<[data: Uint8Array, type: BottInputFileType]>;
