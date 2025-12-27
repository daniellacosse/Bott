import { APP_USER } from "@bott/common";
import type { ShallowBottAttachment, ShallowBottEvent } from "@bott/system";
import {
  BottEventType,
} from "@bott/system";
import type { EventPipelineContext } from "../../../actions/response/pipeline/types.ts";
import type { GeminiEventSkeleton } from "../types.ts";

export const skeletonToShallowEvent = (
  skeleton: GeminiEventSkeleton,
  pipeline: EventPipelineContext,
): ShallowBottEvent => {
  let parent: ShallowBottEvent | undefined;
  if ("parent" in skeleton) {
    parent = pipeline.data.input.find((inputEvent) =>
      inputEvent.id === skeleton.parent?.id
    );
  }

  const detail = skeleton.detail;
  if (
    skeleton.type === BottEventType.ACTION_CALL && "parameters" in detail &&
    detail.parameters !== undefined
  ) {
    const action = pipeline.action.service.actions?.[detail.name];
    for (const parameter of action?.parameters ?? []) {
      if (parameter.type !== "file") {
        continue;
      }

      const attachmentId = detail.parameters?.[parameter.name] as string;

      let foundAttachment: ShallowBottAttachment | undefined;
      for (const event of pipeline.data.input) {
        if (!("attachments" in event.detail)) continue;

        for (
          const attachment
          of (event.detail.attachments as ShallowBottAttachment[])
        ) {
          if (attachment.id === attachmentId) {
            foundAttachment = attachment;
            break;
          }
        }
      }

      if (!foundAttachment) {
        throw new Error(`Attachment ${attachmentId} not found`);
      }

      detail.parameters[parameter.name] = new File(
        [Deno.readFileSync(foundAttachment.raw.path)],
        foundAttachment.raw.file.name,
        { type: foundAttachment.type },
      );
    }
  }

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    type: skeleton.type,
    detail: skeleton.detail,
    user: {
      id: APP_USER.id,
      name: APP_USER.name,
    }, // this.action.user?
    channel: {
      id: pipeline.action.channel?.id,
      name: pipeline.action.channel?.name,
      description: pipeline.action.channel?.description,
      space: {
        id: pipeline.action.channel?.space.id,
        name: pipeline.action.channel?.space.name,
        description: pipeline.action.channel?.space.description,
      },
    },
    parent,
  } as ShallowBottEvent;
};