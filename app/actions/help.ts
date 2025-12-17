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

// Read version from app/deno.jsonc
const appDenoConfig = JSON.parse(
  await Deno.readTextFile(new URL("../deno.jsonc", import.meta.url)),
);
const version = appDenoConfig.version || "unknown";

export const help: BottAction = Object.assign(
  function help() {
    return Promise.resolve(
      new BottEvent(BottEventType.ACTION_RESULT, {
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
                `v${version} ᛫ Under development ᛫ written by DanielLaCos.se`,
            }),
          ],
        },
      }) as BottActionResultEvent,
    );
  },
  {
    description: "Get help with @Bott.",
  },
);
