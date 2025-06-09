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
