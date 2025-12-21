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

import {
  STORAGE_FFMPEG_TIME_LIMIT_MS,
  STORAGE_FILE_DIMENSION_LIMIT,
} from "@bott/constants";
import { BottAttachmentType } from "@bott/model";
import { throwIfUnsafeFileSize } from "../validation.ts";

// Security Note: _ffmpeg is not exported and all arguments are hardcoded below.
// If this function is ever modified to accept user input, implement proper
// argument validation to prevent command injection attacks.

const _ffmpeg = async (
  args: string[],
  input: ArrayBuffer,
): Promise<BlobPart> => {
  const inputArray = new Uint8Array(input);

  throwIfUnsafeFileSize(inputArray);

  const tempInputFilePath = await Deno.makeTempFile({
    prefix: "bott_ffmpeg_in_",
  });
  const tempOutputFilePath = await Deno.makeTempFile({
    prefix: "bott_ffmpeg_out_",
  });

  try {
    await Deno.writeFile(tempInputFilePath, inputArray);

    const processedArgs = args.map((arg) => {
      switch (arg) {
        case "{{INPUT_FILE}}":
          return tempInputFilePath;
        case "{{OUTPUT_FILE}}":
          return tempOutputFilePath;
      }
      return arg;
    });

    const command = new Deno.Command("ffmpeg", {
      args: processedArgs,
      stdin: "null",
      stdout: "null",
      stderr: "piped",
      // Security: Set timeout to prevent long-running processes
      signal: AbortSignal.timeout(STORAGE_FFMPEG_TIME_LIMIT_MS),
    });

    const { success, code, stderr: ffmpegStderr } = await command
      .output();

    if (!success) {
      const errorMsg = new TextDecoder().decode(ffmpegStderr);

      throw new Error(
        `ffmpeg command failed with code "${code}".\nStderr:\n${errorMsg}`,
      );
    }

    const outputData = await Deno.readFile(tempOutputFilePath);

    throwIfUnsafeFileSize(outputData);

    return outputData;
  } finally {
    // Ensure temp files are always cleaned up
    try {
      await Deno.remove(tempInputFilePath);
    } catch {
      // Ignore cleanup errors
    }
    try {
      await Deno.remove(tempOutputFilePath);
    } catch {
      // Ignore cleanup errors
    }
  }
};

export const prepareStaticImageAsWebp = async (
  file: File,
  attachmentId: string,
): Promise<File> => {
  const args = [
    "-y",
    "-i",
    "{{INPUT_FILE}}",
    // Scale down, fitting within STORAGE_MAX_ATTACHMENT_DIMENSION box, using Lanczos for quality
    "-vf",
    `scale=${STORAGE_FILE_DIMENSION_LIMIT}:${STORAGE_FILE_DIMENSION_LIMIT}:force_original_aspect_ratio=decrease:sws_flags=lanczos`,
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
  return new File(
    [await _ffmpeg(args, await file.arrayBuffer())],
    `${attachmentId}.compressed.webp`,
    { type: BottAttachmentType.WEBP },
  );
};

export const prepareAudioAsOpus = async (
  file: File,
  attachmentId: string,
): Promise<File> => {
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
  return new File(
    [await _ffmpeg(args, await file.arrayBuffer())],
    `${attachmentId}.compressed.opus`,
    { type: BottAttachmentType.OPUS },
  );
};

export const prepareDynamicImageAsMp4 = async (
  file: File,
  attachmentId: string,
): Promise<File> => {
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
    `fps=${FRAME_RATE},scale=w='trunc(iw*min(${STORAGE_FILE_DIMENSION_LIMIT}/iw,${STORAGE_FILE_DIMENSION_LIMIT}/ih)/2)*2':h='trunc(ih*min(${STORAGE_FILE_DIMENSION_LIMIT}/iw,${STORAGE_FILE_DIMENSION_LIMIT}/ih)/2)*2':sws_flags=lanczos,format=yuv420p`,
    "-c:v",
    "libx265",
    "-an", // Strip audio.
    "-f",
    "mp4",
    "{{OUTPUT_FILE}}",
  ];

  return new File(
    [await _ffmpeg(args, await file.arrayBuffer())],
    `${attachmentId}.compressed.mp4`,
    { type: BottAttachmentType.MP4 },
  );
};
