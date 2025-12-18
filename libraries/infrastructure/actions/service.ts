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
  type BottActionCallEvent,
  type BottActionCancelEvent as BottActionAbortEvent,
  type BottGlobalSettings,
  BottEventType,
  type BottServiceFactory,
} from "@bott/model";
import { BottEvent } from "@bott/service";
import { addEventListener } from "@bott/service";
import { _validateParameters } from "./validation.ts";

export const startActionService: BottServiceFactory = (options) => {
  const { actions } = options as { actions: Record<string, BottAction> };
  const controllerMap = new Map<string, AbortController>();

  addEventListener(BottEventType.ACTION_CALL, async (event: BottActionCallEvent) => {
    const controller = new AbortController();

    const action = actions[event.detail.name];
    if (!action) {
      globalThis.dispatchEvent(
        new BottEvent(BottEventType.ACTION_ERROR, {
          detail: {
            id: event.detail.id,
            error: new Error(`Action ${event.detail.name} not found`),
          },
        }),
      );
      return;
    }

    if (controllerMap.has(event.detail.id)) {
      globalThis.dispatchEvent(
        new BottEvent(BottEventType.ACTION_ERROR, {
          detail: {
            id: event.detail.id,
            error: new Error(`Action ${event.detail.name} already in progress`),
          },
        }),
      );
      return;
    }

    controllerMap.set(event.detail.id, controller);

    try {
      if (action.parameters) {
        _validateParameters(action.parameters, event.detail.parameters);
      }

      globalThis.dispatchEvent(
        new BottEvent(BottEventType.ACTION_START, {
          detail: {
            id: event.detail.id,
            name: action.name,
          },
        }),
      );

      await action(event.detail.parameters, {
        signal: controller.signal,
        settings: action,
        globalSettings: options as unknown as BottGlobalSettings, // TODO: Fix
      });

      globalThis.dispatchEvent(
        new BottEvent(BottEventType.ACTION_COMPLETE, {
          detail: {
            id: event.detail.id,
            name: action.name,
          },
        }),
      );
    } catch (error) {
      globalThis.dispatchEvent(
        new BottEvent(BottEventType.ACTION_ERROR, {
          detail: {
            id: event.detail.id,
            error: error as Error,
          },
        }),
      );
    }

    controllerMap.delete(event.detail.id);
  });

  addEventListener(BottEventType.ACTION_ABORT, (event: BottActionAbortEvent) =>
    controllerMap.get(event.detail.id)?.abort()
  );

  return Promise.resolve({
    user: {
      id: "system:actions",
      name: "Actions",
    },
  });
};

