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

import { createAction } from "@bott/actions";
import type { BottAction, BottActionSettings } from "@bott/actions";
import {
  ACTION_RATE_LIMIT_SONGS,
  APP_USER,
  GEMINI_SONG_MODEL,
} from "@bott/constants";
import { BottEvent, BottEventType } from "@bott/events";
import { prepareAttachmentFromFile } from "@bott/storage";
import { delay } from "@std/async";

import { geminiStudio } from "../client.ts";
import { generateFilename } from "./common.ts";

const settings: BottActionSettings = {
  name: "song",
  instructions:
    "Generate a song based on the prompt. Duration is fixed to 15 seconds.",
  limitPerMonth: ACTION_RATE_LIMIT_SONGS,
  shouldForwardOutput: true,
  parameters: [{
    name: "prompt",
    type: "string",
    description: "Description of the music/song to generate",
    required: true,
  }],
};

const SONG_DURATION_SECONDS = 15;
const BYTES_PER_SECOND = 192_000; // 48000 Hz * 2 channels * 2 bytes/sample

// Pre-calculated WAV header for 15 seconds of 48kHz stereo 16-bit audio
// deno-fmt-ignore
const WAV_HEADER = new Uint8Array([82, 73, 70, 70, 36, 242, 43, 0, 87, 65, 86, 69, 102, 109, 116, 32, 16, 0, 0, 0, 1, 0, 2, 0, 128, 187, 0, 0, 0, 238, 2, 0, 4, 0, 16, 0, 100, 97, 116, 97, 0, 242, 43, 0]);

const SONG_FILE_SIZE = WAV_HEADER.length +
  Math.floor(BYTES_PER_SECOND * SONG_DURATION_SECONDS);
const SECOND_TO_MS = 1000;

export const songAction: BottAction = createAction(
  async function* ({ prompt }) {
    if (!GEMINI_SONG_MODEL) {
      throw new Error(
        "Gemini song model is not configured. Please ensure `GEMINI_SONG_MODEL` is set in your environment.",
      );
    }

    const promptString = prompt as string;

    // Pre-allocate the entire file buffer
    const fileData = new Uint8Array(SONG_FILE_SIZE);
    fileData.set(WAV_HEADER);

    let writeOffset = WAV_HEADER.length;
    const stream = await geminiStudio.live.music.connect({
      model: GEMINI_SONG_MODEL,
      callbacks: {
        onmessage: (message) => {
          if (!message.serverContent?.audioChunks) {
            return;
          }

          console.debug("Song job progress", message);

          for (const chunk of message.serverContent.audioChunks) {
            for (const char of atob(chunk?.data ?? "")) {
              if (writeOffset >= SONG_FILE_SIZE) break;
              fileData[writeOffset] = char.charCodeAt(0);
              writeOffset++;
            }
          }
        },
      },
    });

    await stream.setWeightedPrompts({
      weightedPrompts: [{
        text: promptString,
      }],
    });

    await stream.play();

    await delay(SONG_DURATION_SECONDS * SECOND_TO_MS, { signal: this.signal });

    stream.stop();

    if (this.signal.aborted) {
      return;
    }

    const file = new File(
      [fileData],
      generateFilename("wav", promptString),
      { type: "audio/wav" },
    );

    const resultEvent = new BottEvent(
      BottEventType.MESSAGE,
      {
        user: APP_USER,
        channel: this.channel,
      },
    );

    resultEvent.attachments = [
      await prepareAttachmentFromFile(
        file,
        resultEvent,
      ),
    ];

    yield resultEvent;
  },
  settings,
);
