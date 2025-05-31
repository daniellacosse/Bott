import type { BottAssetType } from "@bott/model";

export enum SupportedRawFileType {
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

export type AssetDataPreparer = (
  data: Uint8Array,
) => Promise<[data: Uint8Array, type: BottAssetType]>;
