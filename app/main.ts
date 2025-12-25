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

import { actionService } from "@bott/actions";
import { PORT, SERVICE_LIST } from "@bott/constants";
import { discordService } from "@bott/discord";
import { log } from "@bott/log";
import { BottServicesManager } from "@bott/services";
import { eventStorageService } from "@bott/storage";

import { appService } from "./service/main.ts";
import { settings } from "./settings/main.ts";
// import { testSettings } from "./settings/main.ts";

if (import.meta.main) {
  const servicesManager = new BottServicesManager(settings);
  // const servicesManager = new BottServicesManager(testSettings);

  servicesManager.register(eventStorageService);
  servicesManager.register(discordService);
  servicesManager.register(actionService);
  servicesManager.register(appService);

  for (const serviceName of SERVICE_LIST) {
    servicesManager.start(serviceName);
  }
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
