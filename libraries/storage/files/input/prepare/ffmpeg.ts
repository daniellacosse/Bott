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

import { BottInputFileType } from "@bott/model";
import type { InputFileDataTransformer } from "../../types.ts";

const _ffmpeg = async (
  args: string[],
  input: Uint8Array,
): Promise<Uint8Array> => {
  const process = new Deno.Command("ffmpeg", {
    args,
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  const stdinWriter = process.stdin.getWriter();
  await stdinWriter.write(input);
  await stdinWriter.close();

  const { success, code, stdout: result, stderr: error } = await process
    .output();

  if (!success) {
    throw new Error(
      `ffmpeg command failed with code "${code}".\nStderr:\n${
        new TextDecoder().decode(error)
      }`,
    );
  }

  return result;
};

const MAX_DIMENSION = 240;

export const prepareStaticImageAsJpeg: InputFileDataTransformer = async (
  data,
) => {
  const args = [
    "-i",
    "pipe:0",
    "-vf",
    `scale=${MAX_DIMENSION}:${MAX_DIMENSION}:force_original_aspect_ratio=decrease:sws_flags=lanczos`, // Scale down, fitting within MAX_DIMENSION box
    "-frames:v",
    "1", // Ensure only one frame (static image)
    "-c:v",
    "mjpeg", // Use the MJPEG codec for JPEG output
    "-q:v",
    "25", // Quality scale for MJPEG (2-31, higher value = more compression, lower quality)
    "-pix_fmt",
    "yuvj420p", // Common pixel format for JPEG compatibility
    "-f",
    "image2",
    "pipe:1", // Output to stdout
  ];
  return [await _ffmpeg(args, data), BottInputFileType.JPEG];
};

export const prepareAudioAsMp3: InputFileDataTransformer = async (
  data,
) => {
  const DURATION_SECONDS = 60;

  const args = [
    "-nostdin", // Prevent ffmpeg from reading interactive commands from stdin, fixing the hanging issue.
    "-i",
    "pipe:0", // Input from stdin.
    "-stats",
    "-t",

    String(DURATION_SECONDS), // Limit the output duration to 60 seconds.
    "-vn", // No video output; strip any video stream.
    "-c:a",
    "libmp3lame", // Use the LAME MP3 encoder (high quality and standard).
    "-b:a",
    "32k", // Set audio bitrate to 32 kbps (low, good for voice).
    "-ar",
    "22050", // Set audio sampling rate to 22.05 kHz.
    "-ac",
    "1", // Set audio channels to 1 (mono).
    "-f",
    "mp3", // Output format: MP3.
    "pipe:1", // Output to stdout.
  ];

  return [await _ffmpeg(args, data), BottInputFileType.MP3];
};

export const prepareDynamicImageAsMp4: InputFileDataTransformer = async (
  data,
) => {
  const DURATION_SECONDS = 30;
  const FRAME_RATE = 15;

  const args = [
    "-nostdin",
    "-i",
    "pipe:0", // Input from stdin.
    "-stats",
    "-t",
    String(DURATION_SECONDS), // Limit the output duration to 60 seconds (for long/looping GIFs).
    "-vf",
    // Video filtergraph:
    // 1. fps: Set a constant frame rate for video compatibility.
    // 2. scale: The same scaling logic as your static image.
    // 3. format: Convert to a pixel format universally compatible with video players.
    `fps=${FRAME_RATE},scale=${MAX_DIMENSION}:${MAX_DIMENSION}:force_original_aspect_ratio=decrease:sws_flags=lanczos,format=yuv420p`,
    "-c:v",
    "libx265", // Use H.265 video encoder.
    "-an", // No audio output; strip any audio stream.
    "-movflags",
    "+faststart", // Crucial for web video: moves the metadata to the front of the file for faster playback.
    "-f",
    "mp4", // Output format: MP4.
    "pipe:1", // Output to stdout.
  ];

  return [await _ffmpeg(args, data), BottInputFileType.MP4];
};
