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

import { BOTT_SERVICE } from "@bott/constants";

import { BottEventType, type BottServiceFactory } from "@bott/model";
import { addEventListener, BottEvent } from "@bott/service";

export const startAppService: BottServiceFactory = () => {
  const triggerEventGenerationPipeline = (
    event: BottEvent,
  ) => {
    if (!event.channel) return;
    if (!event.user) return;
    if (
      event.type === BottEventType.ACTION_COMPLETE &&
      event.detail.name === "simulateResponseForChannel"
    ) return;

    globalThis.dispatchEvent(
      new BottEvent(BottEventType.ACTION_CALL, {
        detail: {
          id: crypto.randomUUID(),
          name: "simulateResponseForChannel",
          parameters: [{
            name: "channelId",
            value: event.channel.id,
          }],
        },
        user: BOTT_SERVICE.user,
        channel: event.channel,
      }),
    );
  };

  addEventListener(BottEventType.MESSAGE, triggerEventGenerationPipeline);
  addEventListener(BottEventType.REPLY, triggerEventGenerationPipeline);
  addEventListener(BottEventType.REACTION, triggerEventGenerationPipeline);
  addEventListener(
    BottEventType.ACTION_COMPLETE,
    triggerEventGenerationPipeline,
  );
  addEventListener(BottEventType.ACTION_ERROR, triggerEventGenerationPipeline);

  return Promise.resolve(BOTT_SERVICE);
};
