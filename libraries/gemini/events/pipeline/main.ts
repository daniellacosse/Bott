import { curateInputEvents } from "./01_curateInputEvents/main.ts";
import { generateRawOutput } from "./02_generateRawOutput/main.ts";
import { segmentRawOutput } from "./03_segmentRawOutput/main.ts";
import { classifyOutputEvents } from "./04_classifyOutputEvents/main.ts";
import { finalizeOutputEvents } from "./05_finalizeOutputEvents/main.ts";

import type { EventPipeline } from "./types.ts";

export * from "./types.ts";

export default [
  curateInputEvents,
  generateRawOutput,
  segmentRawOutput,
  classifyOutputEvents,
  finalizeOutputEvents,
] as EventPipeline;
