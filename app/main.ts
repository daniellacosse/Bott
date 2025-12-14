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

import { startStorageService } from "@bott/storage";
import { startDiscordService } from "@bott/discord";
import { log } from "@bott/logger";
import {
  DISCORD_TOKEN,
  PORT,
  STORAGE_DEPLOY_NONCE_PATH,
  STORAGE_ROOT,
} from "@bott/constants";
import * as actions from "./actions/main.ts";
import { startMainService } from "./service.ts";

// Set up deploy check:
const deployNonce = crypto.randomUUID();
Deno.writeTextFileSync(STORAGE_DEPLOY_NONCE_PATH, deployNonce);

// 1. Start Storage
await startStorageService({
  root: STORAGE_ROOT,
  deployNonce,
});

// 2. Start Discord to get Bot Identity
const { user: botUser } = await startDiscordService({
  // TODO(#63): Unify action infrastructure
  actions: { help: actions.help },
  identityToken: DISCORD_TOKEN!,
  mount(client) {
    log.info(
      `Running bot "${client.user?.username}" at user id "<@${client.user?.id}>"`,
    );
  },
  deployNonce,
});

// 3. Start Main Application Logic
await startMainService({
  botUser,
  deployNonce,
});

// Need to respond to GCP health probe:
Deno.serve(
  { port: PORT },
  () => new Response("OK", { status: 200 }),
);
