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
  type BottAction,
  type BottActionResultEvent,
  BottEventType,
} from "@bott/model";
import { BottEvent } from "@bott/service";
import { createInfoEmbed } from "@bott/discord";
import { log } from "@bott/log";

// Lazy-loaded version with caching
let version: string | undefined;

async function getVersion(): Promise<string> {
  if (version !== undefined) {
    return version;
  }

  try {
    const configText = await Deno.readTextFile(
      new URL("../deno.jsonc", import.meta.url),
    );
    const appDenoConfig = JSON.parse(configText);
    version = appDenoConfig.version || "unknown";
  } catch (error) {
    log.error("Failed to read version from deno.jsonc:", error);
    version = "unknown";
  }

  return version;
}

export const help: BottAction = Object.assign(
  async function help() {
    const currentVersion = await getVersion();
    return new BottEvent(BottEventType.ACTION_RESULT, {
      detail: {
        embeds: [
          createInfoEmbed("Help Menu", {
            fields: [
              {
                name: "About",
                value:
                  "@Bott (they/them) is a helpful agent that responds to your messages and generates media for you: essay, songs, photos and videos.",
              },
              {
                name: "Limitations",
                value:
                  "Currently, @Bott can read urls and photos when responding. They may sometimes say things that are not correct.",
              },
              { name: "/help", value: "Display this help menu." },
            ],
            footer:
              `v${currentVersion} ᛫ Under development ᛫ written by DanielLaCos.se`,
          }),
        ],
      },
    }) as BottActionResultEvent;
  },
  {
    description: "Get help with @Bott.",
  },
);
