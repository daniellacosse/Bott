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
  DISCORD_TOKEN,
  ENABLED_SERVICES,
  PORT,
  STORAGE_DEPLOY_NONCE_LOCATION,
  STORAGE_ROOT,
} from "@bott/constants";
import { startDiscordService } from "@bott/discord";
import { serviceRegistry } from "@bott/service";
import { startEventStorageService } from "@bott/storage";
import * as actions from "./actions/main.ts";
import { startMainService } from "./service.ts";

if (import.meta.main) {
  // Prevent multiple deployments from conflicting with each other.
  const deploymentNonce = crypto.randomUUID();
  Deno.mkdirSync(STORAGE_ROOT, { recursive: true });
  Deno.writeTextFileSync(STORAGE_DEPLOY_NONCE_LOCATION, deploymentNonce);

  serviceRegistry.nonce = deploymentNonce;

  if (ENABLED_SERVICES.includes("eventStorage")) {
    serviceRegistry.register(
      await startEventStorageService({
        root: STORAGE_ROOT,
      }),
    );
  }

  if (ENABLED_SERVICES.includes("discord") && DISCORD_TOKEN) {
    serviceRegistry.register(
      await startDiscordService({
        // TODO(#64): Unify action infrastructure
        actions: { help: actions.help },
        identityToken: DISCORD_TOKEN,
      }),
    );
  }

  if (ENABLED_SERVICES.includes("main")) {
    serviceRegistry.register(
      await startMainService({ actions }),
    );
  }
}

// Need to respond to GCP health probe:
Deno.serve(
  { port: PORT },
  () => new Response("OK", { status: 200 }),
);
