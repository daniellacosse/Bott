import { join } from "jsr:@std/path";

export const ROOT_FILE_PATH = Deno.env.get("ROOT_FILE_PATH") ?? "./output";

export const ROOT_GEN_FILE_PATH = join(ROOT_FILE_PATH, "gen");

export const VIDEO_GEN_FILE_PATH = join(ROOT_GEN_FILE_PATH, "video");
export const AUDIO_GEN_FILE_PATH = join(ROOT_GEN_FILE_PATH, "audio");
export const PHOTO_GEN_FILE_PATH = join(ROOT_GEN_FILE_PATH, "photo");
export const TEXT_GEN_FILE_PATH = join(ROOT_GEN_FILE_PATH, "text");

export const STORAGE_BUCKET_URL = Deno.env.get("STORAGE_BUCKET_URL") ??
  `file://${ROOT_FILE_PATH}`;

export const prompt2fileName = (prompt: string) =>
  prompt.replaceAll(/\s+/g, "-").slice(0, 20);
