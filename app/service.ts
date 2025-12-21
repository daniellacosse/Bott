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
  const channelSimulations = new Map<string, string>();

  const callResponseSimulation = (event: BottServiceEvent) => {
    if (event.channel) {
      const currentSimulationId = channelSimulations.get(event.channel.id);

      if (currentSimulationId) {
        dispatchEvent(
          new BottServiceEvent(
            BottActionEventType.ACTION_ABORT,
            {
              detail: {
                id: currentSimulationId,
                name: "simulateResponseForChannel",
              },
              user: BOTT_USER,
            },
          ),
        );
      }
    }

    const id = crypto.randomUUID();

    if (event.channel) {
      channelSimulations.set(event.channel.id, id);
    }

    dispatchEvent(
      new BottServiceEvent(
        BottActionEventType.ACTION_CALL,
        {
          ...event,
          detail: {
            id,
            name: "simulateResponseForChannel",
          },
        },
      ),
    );
  };

  const cleanupSimulation = (event: BottServiceEvent) => {
    if (!event.channel) return;

    const currentId = channelSimulations.get(event.channel.id);
    if (currentId === event.detail.id) {
      channelSimulations.delete(event.channel.id);
    }
  };

  addEventListener(BottActionEventType.ACTION_COMPLETE, cleanupSimulation);
  addEventListener(BottActionEventType.ACTION_ERROR, cleanupSimulation);

  const triggerResponseIfNotSelf = (
    event: BottServiceEvent,
  ) => {
    if (!event.user || event.user.id === BOTT_USER.id) return;

    // Prevent loops: don't respond to our own errors/aborts for simulation
    if (event.type === BottActionEventType.ACTION_ERROR && event.detail.name === "simulateResponseForChannel") return;

    callResponseSimulation(event);
  };

  addEventListener(BottEventType.MESSAGE, triggerResponseIfNotSelf);
  addEventListener(BottEventType.REPLY, triggerResponseIfNotSelf);
  addEventListener(BottEventType.REACTION, triggerResponseIfNotSelf);
  addEventListener(
    BottActionEventType.ACTION_ERROR,
    triggerResponseIfNotSelf,
  );

  addEventListener(BottActionEventType.ACTION_OUTPUT, (event) => {
    const outputEvent = event.detail.event as BottServiceEvent;

    if (event.detail.shouldInterpretOutput) {
      callResponseSimulation(outputEvent);
    }

    if (event.detail.shouldForwardOutput) {
      dispatchEvent(outputEvent);
    }
  });


  return Promise.resolve({
    user: BOTT_USER,
    events: [BottActionEventType.ACTION_CALL],
  });
};
