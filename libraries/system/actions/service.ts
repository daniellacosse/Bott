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
  name: "action",
};

const actionUser: BottUser = {
  id: "service:action",
  name: "action",
};

export const actionService: BottService = createService(
  function () {
    const controllerMap = new Map<string, AbortController>();

    const handleActionCall = async (callEvent: BottActionCallEvent) => {
      const controller = new AbortController();
      const callId = callEvent.id;
      const {
        name: callName,
        parameters: callParameters,
      } = callEvent.detail;
      const callLocation = callEvent.channel;

      const _dispatch = (
        type: BottEventType,
        detail: Record<string, unknown> = {},
      ) => {
        this.dispatchEvent(
          new BottEvent(type, {
            detail: {
              id: callId,
              ...detail,
            },
            user: actionUser,
            channel: callLocation,
            parent: callEvent,
          }),
        );
      };

      if (controllerMap.has(callId)) {
        return _dispatch(BottEventType.ACTION_ERROR, {
          error: new Error(
            `An action with id ${callId} is already in progress`,
          ),
        });
      }

      if (!callLocation) {
        return _dispatch(BottEventType.ACTION_ERROR, {
          error: new Error(
            `Can't call action ${callName}: missing call location`,
          ),
        });
      }

      const action = this.settings.actions[callName];
      if (!action) {
        return _dispatch(BottEventType.ACTION_ERROR, {
          error: new Error(
            `Can't call action ${callName}: there's no action with that name registered`,
          ),
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

      controllerMap.set(callEvent.id, controller);

      try {
        const parameters = applyParameterDefaults(
          action.parameters,
          callParameters,
        );

        validateParameters(action.parameters, parameters);

        _dispatch(BottEventType.ACTION_START);

        const actionOutputIterator = action.call(
          {
            id: callId,
            signal: controller.signal,
            settings: action,
            service: this,
            user: callEvent.user,
            channel: callEvent.channel,
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

      controllerMap.delete(callId);
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
