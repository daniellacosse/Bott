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
  BottActionResultEvent,
} from "@bott/actions";
import { BottActionEventType } from "@bott/actions";
import type { BottGlobalSettings, BottUser } from "@bott/model";
import {
  addEventListener,
  BottServiceEvent,
  type BottServiceFactory,
  dispatchEvent,
} from "@bott/service";
import { commit, sql } from "@bott/storage";
import { applyParameterDefaults, validateParameters } from "./validation.ts";

const ACTION_SERVICE_USER: BottUser = {
  id: "system:actions",
  name: "Actions",
};

export const startActionService: BottServiceFactory = (options) => {
  const { actions } = options as { actions: Record<string, BottAction> };
  const controllerMap = new Map<string, AbortController>();

  addEventListener(
    BottActionEventType.ACTION_CALL,
    async (event: BottActionCallEvent) => {
      const controller = new AbortController();

      const action = actions[event.detail.name];
      if (!action) {
        return dispatchEvent(
          new BottServiceEvent(BottActionEventType.ACTION_ERROR, {
            detail: {
              id: event.detail.id,
              name: event.detail.name,
              error: new Error(`Action ${event.detail.name} not found`),
            },
            user: ACTION_SERVICE_USER,
            channel: event.channel,
          }),
        );
      }

      if (controllerMap.has(event.detail.id)) {
        return dispatchEvent(
          new BottServiceEvent(BottActionEventType.ACTION_ERROR, {
            detail: {
              id: event.detail.id,
              name: event.detail.name,
              error: new Error(
                `Action ${event.detail.name} already in progress`,
              ),
            },
            user: ACTION_SERVICE_USER,
            channel: event.channel,
          }),
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
          where type = ${BottActionEventType.ACTION_START}
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
          new BottServiceEvent(BottActionEventType.ACTION_START, {
            detail: {
              id: event.detail.id,
              name: action.name,
            },
            user: ACTION_SERVICE_USER,
            channel: event.channel,
          }),
        );

        await action.call(
          {
            id: event.detail.id,
            signal: controller.signal,
            settings: action,
            globalSettings: options as unknown as BottGlobalSettings, // TODO: Fix
            user: ACTION_SERVICE_USER,
            channel: event.channel!,
            dispatchResult: (resultEvent: BottActionResultEvent) => {
              resultEvent.user = ACTION_SERVICE_USER;
              resultEvent.channel = event.channel;
              dispatchEvent(resultEvent);
            },
          },
          parameters,
        );

        dispatchEvent(
          new BottServiceEvent(BottActionEventType.ACTION_COMPLETE, {
            detail: {
              id: event.detail.id,
              name: action.name,
            },
            user: ACTION_SERVICE_USER,
            channel: event.channel,
          }),
        );
      } catch (error) {
        dispatchEvent(
          new BottServiceEvent(BottActionEventType.ACTION_ERROR, {
            detail: {
              id: event.detail.id,
              name: event.detail.name,
              error: error as Error,
            },
            user: ACTION_SERVICE_USER,
            channel: event.channel,
          }),
        );
      }

      controllerMap.delete(event.detail.id);
    },
  );

  addEventListener(
    BottActionEventType.ACTION_ABORT,
    (event: BottActionAbortEvent) =>
      controllerMap.get(event.detail.id)?.abort(),
  );

  return Promise.resolve({
    user: ACTION_SERVICE_USER,
    events: Object.values(BottActionEventType),
  });
};
