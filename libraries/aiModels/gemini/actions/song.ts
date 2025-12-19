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

import { Buffer } from "node:buffer";

import { createAction } from "@bott/actions";
import type { BottAction, BottActionSettings } from "@bott/actions";
import {
  GEMINI_SONG_MODEL,
  RATE_LIMIT_MUSIC,
  SONG_GENERATION_DURATION_SECONDS,
} from "@bott/constants";
import { BottEventType } from "@bott/model";
import { dispatchEvent } from "@bott/service";
import { prepareAttachmentFromFile } from "@bott/storage";

import _gemini from "../client.ts";

const settings: BottActionSettings = {
  name: "song",
  instructions: "Generate a song based on the prompt.",
  limitPerMonth: RATE_LIMIT_MUSIC,
  parameters: [{
    name: "prompt",
    type: "string",
    description: "Description of the music/song to generate",
    required: true,
  }, {
    name: "duration",
    type: "number",
    description: "Duration of the song in seconds",
    defaultValue: SONG_GENERATION_DURATION_SECONDS,
    required: false,
  }],
};

// Helper to write a WAV header for the raw PCM data
export function writeWavHeader(
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number,
  dataLength: number,
): Buffer {
  const buffer = Buffer.alloc(44);
  // RIFF chunk descriptor
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4); // ChunkSize
  buffer.write("WAVE", 8);
  // fmt sub-chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // ByteRate
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34);
  // data sub-chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);
  return buffer;
}

export const songAction: BottAction = createAction(
  async (parameters, _context) => {
    const prompt = parameters.find((p) => p.name === "prompt")?.value as string;
    const duration = parameters.find((p) => p.name === "duration")
      ?.value as number;

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    const audioBuffer: Buffer[] = [];

    // 1. Initialize the Live Session for Music
    // @ts-expect-error: Client type definition might not yet have deep property 'music'
    const session = await _gemini.aio.live.music.connect({
      model: GEMINI_SONG_MODEL,
      config: {
        responseModalities: ["AUDIO"],
      },
    });

    // 2. Set up the listener to collect chunks
    session.on("audio", (chunk: { data: string }) => {
      // chunk.data is usually a base64 string or buffer of raw PCM
      const pcmData = Buffer.from(chunk.data, "base64");
      audioBuffer.push(pcmData);
    });

    // 3. Send the Prompt to start the music
    await session.setWeightedPrompts([{
      text: prompt,
      weight: 1.0,
    }]);

    // Start playback in the session
    await session.play();

    // 4. Wait for the desired duration, then stop
    await new Promise((resolve) => setTimeout(resolve, duration * 1000));

    // Stop and close
    await session.pause();
    session.disconnect();

    // 5. Combine chunks and save as WAV
    const allPcmData = Buffer.concat(audioBuffer);
    const wavHeader = writeWavHeader(48000, 2, 16, allPcmData.length); // Lyria is 48kHz Stereo 16-bit
    const finalWav = Buffer.concat([wavHeader, allPcmData]);

    const file = new File([finalWav], "song.wav", { type: "audio/wav" });

    // TODO: create result event, attach file, then dispatch
    const attachment = await prepareAttachmentFromFile(
      file,
      _context.id,
    );

    dispatchEvent(
      BottEventType.ACTION_RESULT,
      {
        id: _context.id,
        name: "song",
        result: {
          attachment,
          prompt,
          duration,
        },
      },
    );
  },
  settings,
);
