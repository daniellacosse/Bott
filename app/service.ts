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

import { BottActionEventType } from "@bott/actions";
import { BOTT_USER } from "@bott/constants";
import { BottEventType } from "@bott/model";
import {
  addEventListener,
  BottServiceEvent,
  type BottServiceFactory,
  dispatchEvent,
} from "@bott/service";

export const startAppService: BottServiceFactory = () => {
  const triggerEventGenerationPipeline = (
    event: BottServiceEvent,
  ) => {
    if (!event.channel) return;
    if (!event.user) return;
    if (
      event.type === BottActionEventType.ACTION_COMPLETE &&
      event.detail.name === "simulateResponseForChannel"
    ) return;

    dispatchEvent(
      new BottServiceEvent(
        BottActionEventType.ACTION_CALL,
        {
          detail: {
            id: crypto.randomUUID(),
            name: "simulateResponseForChannel",
            parameters: [{
              name: "channelId",
              value: event.channel.id,
            }],
          },
          user: event.user,
          channel: event.channel,
        },
      ),
    );
  };

  addEventListener(BottEventType.MESSAGE, triggerEventGenerationPipeline);
  addEventListener(BottEventType.REPLY, triggerEventGenerationPipeline);
  addEventListener(BottEventType.REACTION, triggerEventGenerationPipeline);
  addEventListener(
    BottActionEventType.ACTION_COMPLETE,
    triggerEventGenerationPipeline,
  );
  addEventListener(
    BottActionEventType.ACTION_ERROR,
    triggerEventGenerationPipeline,
  );

  return Promise.resolve({
    user: BOTT_USER,
    events: [BottActionEventType.ACTION_CALL],
  });
};
