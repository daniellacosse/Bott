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

import { serviceRegistry } from "@bott/service";
import { startStorageService } from "@bott/storage";
import { startDiscordService } from "@bott/discord";
import {
  DISCORD_TOKEN,
  PORT,
  STORAGE_DEPLOY_NONCE_PATH,
  STORAGE_ROOT,
} from "@bott/constants";
import * as actions from "./actions/main.ts";
import { startMainService } from "./service.ts";

const deploymentNonce = crypto.randomUUID();
Deno.writeTextFileSync(STORAGE_DEPLOY_NONCE_PATH, deploymentNonce);

serviceRegistry.nonce = deploymentNonce;

serviceRegistry.register(
  await startStorageService({
    root: STORAGE_ROOT,
  }),
);

if (DISCORD_TOKEN) {
  serviceRegistry.register(
    await startDiscordService({
      // TODO(#64): Unify action infrastructure
      actions: { help: actions.help },
      identityToken: DISCORD_TOKEN,
    }),
  );
}

serviceRegistry.register(
  await startMainService({ actions }),
);

// Need to respond to GCP health probe:
Deno.serve(
  { port: PORT },
  () => new Response("OK", { status: 200 }),
);
