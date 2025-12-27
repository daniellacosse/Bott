export * from "./types.ts";

import type { AnyShape } from "@bott/model";
import { createAction } from "./actions/create.ts";
import { prepareAttachmentFromFile } from "./events/attachments/prepare.ts";
import { prepareAttachmentFromUrl } from "./events/attachments/prepare.ts";
import { BottEvent } from "./events/create.ts";
import type { BottEventConstructorProperties } from "./events/create.ts";
import { getEventHistory } from "./events/storage/get.ts";
import { getEvents } from "./events/storage/get.ts";
import { upsertEvents } from "./events/storage/upsert.ts";
import { BottSystemManager } from "./manager.ts";
import { createService } from "./services/create.ts";
import type { BottEventType, ShallowBottEvent } from "./types.ts";

const createEventWrapper = <
  T extends BottEventType = BottEventType,
  D extends AnyShape = AnyShape,
>(
  type: T,
  properties: BottEventConstructorProperties<T, D>,
): BottEvent<T, D> => new BottEvent<T, D>(type, properties);

const createEventFromShallowWrapper = (
  event: ShallowBottEvent,
): Promise<BottEvent> => BottEvent.fromShallow(event);

export default {
  Manager: BottSystemManager,
  Events: {
    Storage: {
      get: getEvents,
      getHistory: getEventHistory,
      upsert: upsertEvents,
    },
    // TODO: collapse these wrappers into the actual event/create.ts, BottEventInterface becomes BottEvent
    create: createEventWrapper,
    createFromShallow: createEventFromShallowWrapper,
    Attachments: {
      prepareFromFile: prepareAttachmentFromFile,
      prepareFromUrl: prepareAttachmentFromUrl,
    },
  },
  Services: {
    create: createService,
  },
  Actions: {
    create: createAction,
  },
};
