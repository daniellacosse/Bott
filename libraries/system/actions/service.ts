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
  applyParameterDefaults,
  type BottActionAbortEvent,
  type BottActionCallEvent,
  BottEvent,
  BottEventType,
  validateParameters,
} from "@bott/events";
import type { BottUser } from "@bott/model";
import {
  type BottService,
  type BottServiceSettings,
  createService,
} from "@bott/services";
import { commit, sql } from "@bott/storage";

const settings: BottServiceSettings = {
  name: "actions",
  events: new Set([
    BottEventType.ACTION_CALL,
    BottEventType.ACTION_ABORT,
    BottEventType.ACTION_START,
    BottEventType.ACTION_OUTPUT,
    BottEventType.ACTION_COMPLETE,
    BottEventType.ACTION_ERROR,
  ]),
};

const actionUser: BottUser = {
  id: "actions",
  name: "actions",
};

export const actionService: BottService = createService(
  function () {
    const controllerMap = new Map<string, AbortController>();

    this.addEventListener(
      BottEventType.ACTION_CALL,
      async (event: BottActionCallEvent) => {
        const controller = new AbortController();

        const action = this.settings.actions[event.detail.name];
        if (!action) {
          return dispatchEvent(
            new BottEvent(BottEventType.ACTION_ERROR, {
              detail: {
                id: event.detail.id,
                name: event.detail.name,
                error: new Error(`Action ${event.detail.name} not found`),
              },
              user: actionUser,
              channel: event.channel,
            }),
          );
        }

        if (controllerMap.has(event.detail.id)) {
          return this.dispatchEvent(
            new BottEvent(BottEventType.ACTION_ERROR, {
              detail: {
                id: event.detail.id,
                name: event.detail.name,
                error: new Error(
                  `Action ${event.detail.name} already in progress`,
                ),
              },
              user: actionUser,
              channel: event.channel,
            }),
          );
        }

        if (!event.channel) {
          return this.dispatchEvent(
            new BottEvent(BottEventType.ACTION_ERROR, {
              detail: {
                id: event.detail.id,
                name: event.detail.name,
                error: new Error(`Action calls require a channel`),
              },
              user: actionUser,
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
          where type = ${BottEventType.ACTION_START}
            and json_extract(detail, '$.name') = ${action.name}
            and created_at > ${oneMonthAgo.toISOString()}
        `);

            if ("error" in result) {
              throw result.error;
            }

            const count = result.reads[0]?.count as number;

            if (count >= action.limitPerMonth) {
              throw new Error(
                `Rate limit exceeded for action '${action.name}'. Limit: ${action.limitPerMonth}/month. Usage: ${count}`,
              );
            }
          }

          this.dispatchEvent(
            new BottEvent(BottEventType.ACTION_START, {
              detail: {
                id: event.detail.id,
                name: action.name,
              },
              user: actionUser,
              channel: event.channel,
            }),
          );

          let callResult: BottEvent | void;
          try {
            const iterator = action.call(
              {
                id: event.detail.id,
                signal: controller.signal,
                settings: action,
                service: this,
                user: event.user,
                channel: event.channel,
              },
              parameters,
            );

            let next = await iterator.next();
            while (!next.done) {
              const yieldedEvent = next.value;
              // Bypass readonly to contextually bind user and channel
              Object.assign(yieldedEvent, {
                user: actionUser,
                channel: event.channel,
              });
              dispatchEvent(yieldedEvent);
              next = await iterator.next();
            }
            callResult = next.value;
          } catch (e) {
            throw e;
          }

          if (callResult) {
            const resultEvent = new BottEvent(
              BottEventType.ACTION_OUTPUT,
              {
                detail: {
                  name: action.name,
                  id: event.detail.id,
                  event: callResult,
                  shouldInterpretOutput: action.shouldInterpretOutput,
                  shouldForwardOutput: action.shouldForwardOutput,
                },
                user: actionUser,
                channel: event.channel,
              },
            );
            this.dispatchEvent(resultEvent);
          }

          this.dispatchEvent(
            new BottEvent(BottEventType.ACTION_COMPLETE, {
              detail: {
                id: event.detail.id,
                name: action.name,
              },
              user: actionUser,
              channel: event.channel,
            }),
          );
        } catch (error) {
          this.dispatchEvent(
            new BottEvent(BottEventType.ACTION_ERROR, {
              detail: {
                id: event.detail.id,
                name: event.detail.name,
                error: error as Error,
              },
              user: actionUser,
              channel: event.channel,
            }),
          );
        }

        controllerMap.delete(event.detail.id);
      },
    );

    this.addEventListener(
      BottEventType.ACTION_ABORT,
      (event: BottActionAbortEvent) =>
        controllerMap.get(event.detail.id)?.abort(),
    );
  },
  settings,
);
