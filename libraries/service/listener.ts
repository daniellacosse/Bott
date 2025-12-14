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

import { STORAGE_DEPLOY_NONCE_PATH } from "@bott/constants";
import type { BottEvent, BottEventType, BottService } from "@bott/model";
import { serviceRegistry } from "./registry.ts";
import { log } from "@bott/logger";

const _getCurrentDeployNonce = () => {
  try {
    return Deno.readTextFileSync(STORAGE_DEPLOY_NONCE_PATH);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null;
    }
    throw error;
  }
};

export const addEventListener = <E extends BottEvent>(
  eventType: BottEventType,
  handler: (event: E, service?: BottService) => unknown | Promise<unknown>,
): void => {
  globalThis.addEventListener(eventType, async (event) => {
    const bottEvent = event as E;

    if (serviceRegistry.nonce !== _getCurrentDeployNonce()) return;

    try {
      await handler(bottEvent, serviceRegistry.get(bottEvent.user?.id ?? ""));
    } catch (error) {
      log.warn("Failed to handle event", error);
    }
  });
};
