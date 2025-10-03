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
  AnyShape,
  BottAction,
  BottActionCallEvent,
  BottChannel,
  BottEvent,
  BottGlobalSettings,
  BottUser,
} from "@bott/model";
import { log } from "@bott/logger";
import { addEventData } from "@bott/storage";

import pipeline, { type EventPipelineContext } from "./pipeline/main.ts";

export async function* generateEvents<O extends AnyShape>(
  inputEvents: BottEvent<AnyShape>[],
  context: {
    abortSignal: AbortSignal;
    user: BottUser;
    channel: BottChannel;
    actions: Record<string, BottAction<O, AnyShape>>;
    settings: BottGlobalSettings;
  },
): AsyncGenerator<
  | BottEvent<{ content: string; scores?: Record<string, number> }>
  | BottActionCallEvent<O>
> {
  let pipelineContext: EventPipelineContext = {
    data: {
      input: inputEvents,
      output: [],
    },
    ...context,
  };

  for (const processor of pipeline) {
    pipelineContext = await processor(pipelineContext);
  }

  _debugLogPipelineData(pipelineContext.data);

  try {
    // Update the newly scored events
    await addEventData(...pipelineContext.data.input);
  } catch {
    // TODO
  }

  for (const event of pipelineContext.data.output) {
    // TODO
    yield event as any;
  }

  return;
}

// TODO
const _debugLogPipelineData = (result: any) => {
  log.debug(JSON.stringify(result, null, 2));

  // let logMessage = "Gemini processing result:\n";

  // for (const event of result.inputEventScores) {
  //   if (!event.details) {
  //     continue;
  //   }

  //   logMessage += `[INPUT] Scored event #${event.id}: "${
  //     _truncateMessage(event.details.content)
  //   }"\n`;

  //   for (const trait in event.details.scores) {
  //     logMessage += `  => [${trait}: ${event.details.scores[trait].score}] ${
  //       event.details.scores[trait].rationale ?? ""
  //     }\n`;
  //   }
  // }

  // for (const event of result.outputEvents) {
  //   if (!event.details) {
  //     continue;
  //   }

  //   if (event.type === BottEventType.ACTION_CALL) {
  //     const details = event.details as {
  //       name: string;
  //       options: AnyShape;
  //       scores: Record<string, GeminiEventTraitScore>;
  //     };
  //     logMessage += `[OUTPUT] Generated request \`${details.name}\`\n`;
  //     for (const option in details.options) {
  //       logMessage += `  => ${option}: ${details.options[option]}\n`;
  //     }
  //   } else {
  //     const details = event.details as {
  //       content: string;
  //       scores: Record<string, GeminiEventTraitScore>;
  //     };
  //     const parentInfo = event.parent
  //       ? ` (in reply to #${event.parent.id})`
  //       : "";
  //     logMessage += `[OUTPUT] Generated ${event.type}${parentInfo}: "${
  //       _truncateMessage(details.content)
  //     }"\n`;
  //   }

  //   for (const trait in event.details.scores) {
  //     logMessage += `  => [${trait}: ${event.details.scores[trait].score}] ${
  //       event.details.scores[trait].rationale ?? ""
  //     }\n`;
  //   }
  // }

  // if (result.outputScores) {
  //   logMessage += "[OVERALL SCORES]\n";
  //   for (const trait in result.outputScores) {
  //     logMessage += `  => [${trait}: ${result.outputScores[trait].score}] ${
  //       result.outputScores[trait].rationale ?? ""
  //     }\n`;
  //   }
  // }

  // log.debug(logMessage.trim());
};

const _truncateMessage = (message: string, maxWordCount = 12) => {
  const words = message.trim().split(/\s+/);

  const result = words.slice(0, maxWordCount).join(" ");

  if (words.length <= maxWordCount) {
    return result;
  }

  return result + "…";
};
