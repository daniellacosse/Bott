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

import { validateFilePath } from "../../security.ts";
import { BottFileType } from "@bott/model";

/*
 * SECURITY NOTE: The _ffmpeg function uses hardcoded, static argument templates
 * that do not accept user input directly. This design prevents command injection
 * attacks. Future developers should maintain this practice:
 * - Keep FFmpeg arguments static and predefined
 * - Use template placeholders ({{INPUT_FILE}}, {{OUTPUT_FILE}}) for file paths
 * - Never concatenate user input directly into FFmpeg arguments
 * - Validate file paths continue to use secure temporary file generation
 */

const _ffmpeg = async (
  args: string[],
  input: Uint8Array,
): Promise<Uint8Array> => {
  // Generate secure temporary file paths with proper validation
  const tempDir = "/tmp";
  const tempInputFilePath = await Deno.makeTempFile({
    prefix: "bott_ffmpeg_in_",
    suffix: ".input",
  });
  const tempOutputFilePath = await Deno.makeTempFile({
    prefix: "bott_ffmpeg_out_",
    suffix: ".output",
  });

  try {
    // Validate temp file paths are in safe location
    validateFilePath(tempInputFilePath, tempDir);
    validateFilePath(tempOutputFilePath, tempDir);

    await Deno.writeFile(tempInputFilePath, input);

    // Replace template placeholders with actual file paths
    const ffmpegArgs = args.map((arg) => {
      switch (arg) {
        case "{{INPUT_FILE}}":
          return tempInputFilePath;
        case "{{OUTPUT_FILE}}":
          return tempOutputFilePath;
        default:
          return arg;
      }
    });

    console.debug("[DEBUG] Executing FFmpeg with args:", ffmpegArgs);

    const command = new Deno.Command("ffmpeg", {
      args: ffmpegArgs,
      stdin: "null",
      stdout: "null",
      stderr: "piped",
    });

    const { success, code, stderr: ffmpegStderr } = await command
      .output();

    if (!success) {
      const errorMsg = new TextDecoder().decode(ffmpegStderr);

      throw new Error(
        `ffmpeg command failed with code "${code}".\nStderr:\n${errorMsg}`,
      );
    }

    return Deno.readFile(tempOutputFilePath);
  } finally {
    // Securely clean up temporary files
    try {
      await Deno.remove(tempInputFilePath);
    } catch {
      // Ignore errors during cleanup
    }
    try {
      await Deno.remove(tempOutputFilePath);
    } catch {
      // Ignore errors during cleanup
    }
  }
};

const MAX_DIMENSION = 480;

export const prepareStaticImageAsWebp = async (
  data: Uint8Array,
) => {
  const args = [
    "-y",
    "-i",
    "{{INPUT_FILE}}",
    // Scale down, fitting within MAX_DIMENSION box, using Lanczos for quality
    "-vf",
    `scale=${MAX_DIMENSION}:${MAX_DIMENSION}:force_original_aspect_ratio=decrease:sws_flags=lanczos`,
    "-frames:v",
    "1", // Ensure only one frame (static image)
    "-c:v",
    "libwebp", // Use WebP codec
    "-lossless",
    "1", // Enable lossless compression for maximum detail preservation
    "-compression_level",
    "6", // 0 (fastest) to 6 (smallest file, slowest encoding for lossless)
    "-preset",
    "text", // Optimize for images with text
    "-f",
    "webp", // Output format container
    "{{OUTPUT_FILE}}",
  ];
  return { data: await _ffmpeg(args, data), type: BottFileType.WEBP };
};

export const prepareAudioAsOpus = async (
  data: Uint8Array,
) => {
  const DURATION_SECONDS = 60;

  const args = [
    "-y",
    "-i",
    "{{INPUT_FILE}}",
    "-t",
    String(DURATION_SECONDS),
    "-vn", // Strip video.
    "-c:a",
    "libopus", // Use Opus codec
    "-b:a",
    "16k", // Target bitrate 16kbps (very aggressive for Opus)
    "-ar",
    "16000", // Sampling rate: 16kHz.
    "-ac",
    "1", // Mono audio.
    "-application",
    "audio", // Optimize for general audio content
    "-f",
    "opus", // Output format
    "{{OUTPUT_FILE}}",
  ];
  return { data: await _ffmpeg(args, data), type: BottFileType.OPUS };
};

export const prepareDynamicImageAsMp4 = async (
  data: Uint8Array,
) => {
  const DURATION_SECONDS = 30;
  const FRAME_RATE = 15;

  const args = [
    "-y",
    "-i",
    "{{INPUT_FILE}}",
    "-t",
    String(DURATION_SECONDS),
    // Pixel dimensions must be even.
    "-vf",
    `fps=${FRAME_RATE},scale=w='trunc(iw*min(${MAX_DIMENSION}/iw,${MAX_DIMENSION}/ih)/2)*2':h='trunc(ih*min(${MAX_DIMENSION}/iw,${MAX_DIMENSION}/ih)/2)*2':sws_flags=lanczos,format=yuv420p`,
    "-c:v",
    "libx265",
    "-an", // Strip audio.
    "-f",
    "mp4",
    "{{OUTPUT_FILE}}",
  ];

  return { data: await _ffmpeg(args, data), type: BottFileType.MP4 };
};
