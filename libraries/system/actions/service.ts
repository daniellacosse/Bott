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

    const handleActionCall = async (event: BottActionCallEvent) => {
      const controller = new AbortController();
      const { id: actionCallId, name: actionCallName, parameters: actionCallParameters } =
        event.detail;
      const actionCallLocation = event.channel;

      const _dispatch = (
        type: BottEventType,
        detail: Record<string, unknown> = {},
      ) => {
        this.dispatchEvent(
          new BottEvent(type, {
            detail: {
              id: actionCallId,
              ...detail,
            },
            user: actionUser,
            channel: actionCallLocation,
            parent: event,
          }),
        );
      };

      if (controllerMap.has(actionCallId)) {
        return _dispatch(BottEventType.ACTION_ERROR, {
          error: new Error(
            `actionService: An action with id ${actionCallId} is already in progress`,
          ),
        });
      }

      if (!actionCallLocation) {
        return _dispatch(BottEventType.ACTION_ERROR, {
          error: new Error(`actionService: Can't call action ${actionCallName}: missing call location`),
        });
      }

      const action = this.settings.actions[actionCallName];
      if (!action) {
        return _dispatch(BottEventType.ACTION_ERROR, {
          error: new Error(`actionService: Can't call action ${actionCallName}: there's no action with that name registered`),
        });
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
          return _dispatch(BottEventType.ACTION_ERROR, {
            error: result.error,
          });
        }

        const count = result.reads[0]?.count ?? 0;

        if (count >= action.limitPerMonth) {
          return _dispatch(BottEventType.ACTION_ERROR, {
            error: new Error(
              `Rate limit exceeded for action '${action.name}'. Limit: ${action.limitPerMonth}/month. Usage: ${count}`,
            ),
          });
        }
      }

      controllerMap.set(actionCallId, controller);

      try {
        const parameters = applyParameterDefaults(
          action.parameters,
          actionCallParameters,
        );

        validateParameters(action.parameters, parameters);

        _dispatch(BottEventType.ACTION_START);

        const actionOutputIterator = action.call(
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

        for await (const event of actionOutputIterator) {
          _dispatch(BottEventType.ACTION_OUTPUT, {
            event,
            shouldInterpretOutput: action.shouldInterpretOutput,
            shouldForwardOutput: action.shouldForwardOutput,
          });
        }

        _dispatch(BottEventType.ACTION_COMPLETE);
      } catch (error) {
        _dispatch(BottEventType.ACTION_ERROR, {
          error: error as Error,
        });
      }

      controllerMap.delete(event.detail.id);
    };

    this.addEventListener(
      BottEventType.ACTION_CALL,
      handleActionCall,
    );

    this.addEventListener(
      BottEventType.ACTION_ABORT,
      (event: BottActionAbortEvent) =>
        controllerMap.get(event.detail.id)?.abort(),
    );
  },
  settings,
);
