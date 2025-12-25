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

import { type BottEvent, BottEventType } from "@bott/events";
import { log } from "@bott/log";
import { resolveOutputEvents } from "../../common/events.ts";
import { getEventSchema } from "../../common/getSchema.ts";
import { queryGemini } from "../../common/queryGemini.ts";
import type { EventPipelineProcessor } from "../types.ts";

const systemPrompt = await Deno.readTextFile(
  new URL("./systemPrompt.md", import.meta.url),
);

// Copied from queryGemini.ts. TODO: dedupe
const _formatTimestampAsRelative = (
  timestamp: Date | string | undefined,
): string | undefined => {
  if (!timestamp) {
    return undefined;
  }

  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  } else {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  }
};

export const patchOutput: EventPipelineProcessor = async function () {
  if (!this.data.output.length) {
    return;
  }

  const reactions = this.data.output.filter(
    (event) =>
      event.type === BottEventType.REACTION ||
      event.type === BottEventType.ACTION_CALL,
  );

  const nonReactions = this.data.output.filter(
    (event) =>
      event.type !== BottEventType.REACTION &&
      event.type !== BottEventType.ACTION_CALL,
  );

  const eventsToPatch = nonReactions.map((event) => {
    const {
      attachments: _attachments,
      parent: _parent,
      channel: _channel,
      detail: _detail,
      createdAt,
      ...rest
    } = event;

    let parent;

    if (_parent) {
      // @ts-ignore: safe
      parent = {
        ..._parent,
        createdAt: _formatTimestampAsRelative(_parent.createdAt),
      };

      // @ts-ignore: safe
      delete parent.parent;
      // @ts-ignore: safe
      delete parent.attachments;
    }

    const metadata = this.evaluationState.get(event);

    return {
      ...rest,
      createdAt: _formatTimestampAsRelative(createdAt),
      parent,
      detail: _detail,
      _pipelineEvaluationMetadata: {
        outputReasons: metadata?.outputReasons?.map(({ name }) => name),
        ratings: metadata?.ratings,
      },
    };
  });

  let patchedEvents: BottEvent[] = [];

  if (eventsToPatch.length) {
    log.debug(this.action.id, eventsToPatch);

    // TODO: allow to be set as "user" event dynamically
    // treat as user input to avoid "continuation" bias
    patchedEvents = await queryGemini<BottEvent[]>(
      JSON.stringify(eventsToPatch),
      {
        systemPrompt,
        responseSchema: getEventSchema(this.action.service.settings),
        pipeline: this,
        useIdentity: false,
      },
    );
  }

  this.data.output = [...patchedEvents, ...reactions];

  this.data.output = await resolveOutputEvents(this);

  log.debug(this.data.output);

  // Trusted Patching:
  // Since this step is explicitly designed to fix issues, we treat its output as "trusted".
  // We automatically inject all active output reasons as "passed" for these events,
  // bypassing the need for a re-evaluation loop.
  for (const event of this.data.output) {
    this.evaluationState.set(event, {
      outputReasons: this.action.service.app.reasons.output,
    });
  }
};
