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
  type AnyShape,
  BottEventType,
  type BottRequestHandler,
} from "@bott/model";
import { createInfoEmbed } from "@bott/discord";

export const help: BottRequestHandler<AnyShape, AnyShape> = Object.assign(
  function help() {
    return {
      id: crypto.randomUUID(),
      type: BottEventType.RESPONSE as const,
      // user: this.user,
      details: {
        embeds: [createInfoEmbed("Help Menu", {
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
            { name: "/help", value: "Display this Help Menu." },
          ],
          footer: "@Bott written by DanielLaCos.se ᛫ Powered by Google Gemini",
        })],
      },
      timestamp: new Date(),
    };
  },
  {
    description: "Get help with @Bott.",
  },
);
