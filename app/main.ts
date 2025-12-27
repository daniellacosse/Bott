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

import { log, PORT, SERVICE_LIST } from "@bott/common";
import { discordService } from "@bott/discord";
import BottSystem from "@bott/system";

import { actions } from "./actions/main.ts";
import { appService } from "./service.ts";
import { settings } from "./settings/main.ts";

if (import.meta.main) {
  addEventListener("unhandledrejection", (event) => {
    event.preventDefault();
    log.error("Unhandled rejection:", event.reason);
  });

  addEventListener("error", (event) => {
    event.preventDefault();
    log.error("Uncaught exception:", event.error);
  });

  const systemManager = new BottSystem.Manager({ settings, actions });

  systemManager.registerService(discordService);
  systemManager.registerService(appService);

  for (const serviceName of SERVICE_LIST) {
    systemManager.start(serviceName);
  }

  // Need to respond to GCP health probe:
  Deno.serve(
    {
      port: PORT,
      onListen: ({ port, hostname }) => {
        log.info(`main: Listening on ${hostname}:${port}`);
      },
    },
    () => new Response("OK", { status: 200 }),
  );
}
