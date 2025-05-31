import type { BottFileType } from "../types.ts";

export enum BottFileSourceType {
  // GIF = "image/gif",
  HTML = "text/html",
  // MP4 = "video/mp4",
  // PDF = "application/pdf",
  // PNG = "image/png",
  // JPEG = "image/jpeg",
  // TXT = "text/plain",
  // WAV = "audio/wav",
  // MP3 = "audio/mp3",
}

export type SourceFileDataSanitizer = (
  data: Uint8Array,
) => Promise<[data: Uint8Array, type: BottFileType]>;
