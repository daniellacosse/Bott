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

import type {
  BottAction,
  BottActionCallEvent,
  BottActionCancelEvent as BottActionAbortEvent,
} from "@bott/actions";
import { BottEventType, type BottGlobalSettings } from "@bott/model";
import {
  addEventListener,
  dispatchEvent,
  BottEvent,
  type BottServiceFactory,
} from "@bott/service";
import { commit, sql } from "@bott/storage";
import { validateParameters, applyParameterDefaults } from "./validation.ts";

export const startActionService: BottServiceFactory = (options) => {
  const { actions } = options as { actions: Record<string, BottAction> };
  const controllerMap = new Map<string, AbortController>();

  addEventListener(
    BottEventType.ACTION_CALL,
    async (event: BottActionCallEvent) => {
      const controller = new AbortController();

      const action = actions[event.detail.name];
      if (!action) {
        return dispatchEvent(
          BottEventType.ACTION_ERROR,
          {
            id: event.detail.id,
            name: event.detail.name,
            error: new Error(`Action ${event.detail.name} not found`),
          },
          {
            user: event.user,
            channel: event.channel,
          },
        );
      }

      if (controllerMap.has(event.detail.id)) {
        return dispatchEvent(
          BottEventType.ACTION_ERROR,
          {
            id: event.detail.id,
            name: event.detail.name,
            error: new Error(
              `Action ${event.detail.name} already in progress`,
            ),
          },
          {
            user: event.user,
            channel: event.channel,
          },
        );
      }

      controllerMap.set(event.detail.id, controller);

      try {
        let parameters = event.detail.parameters;

        if (action.parameters) {
          parameters = applyParameterDefaults(
            action.parameters,
            event.detail.parameters,
          );
          validateParameters(action.parameters, parameters);
        }

        if (action.limitPerMonth) {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

          const result = commit(sql`
          select count(*) as count
          from events
          where type = ${BottEventType.ACTION_START}
            and json_extract(detail, '$.name') = ${action.name}
            and created_at > ${oneMonthAgo.toISOString()}
        `);

          if ("error" in result) {
            throw result.error;
          }

          // deno-lint-ignore no-explicit-any
          const count = (result.reads[0] as any).count;

          if (count >= action.limitPerMonth) {
            throw new Error(
              `Rate limit exceeded for action '${action.name}'. Limit: ${action.limitPerMonth}/month. Usage: ${count}`,
            );
          }
        }

        dispatchEvent(
          BottEventType.ACTION_START,
          {
            id: event.detail.id,
            name: action.name,
          },
          {
            user: event.user,
            channel: event.channel,
          },
        );

        await action(parameters, {
          id: event.detail.id,
          signal: controller.signal,
          settings: action,
          globalSettings: options as unknown as BottGlobalSettings, // TODO: Fix
        });

        dispatchEvent(
          BottEventType.ACTION_COMPLETE,
          {
            id: event.detail.id,
            name: action.name,
          },
          {
            user: event.user,
            channel: event.channel,
          },
        );
      } catch (error) {
        dispatchEvent(
          BottEventType.ACTION_ERROR,
          {
            id: event.detail.id,
            name: event.detail.name,
            error: error as Error,
          },
          {
            user: event.user,
            channel: event.channel,
          },
        );
      }

      controllerMap.delete(event.detail.id);
    },
  );

  addEventListener(
    BottEventType.ACTION_ABORT,
    (event: BottActionAbortEvent) =>
      controllerMap.get(event.detail.id)?.abort(),
  );

  return Promise.resolve({
    user: {
      id: "system:actions",
      name: "Actions",
    },
  });
};
