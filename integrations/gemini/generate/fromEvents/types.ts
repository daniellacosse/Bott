import type { BottEventType } from "@bott/system";

export type GeminiEventSkeleton = {
  type: BottEventType.MESSAGE | BottEventType.REPLY | BottEventType.REACTION;
  detail: {
    content: string;
  };
  parent?: {
    id: string;
  };
} | {
  type: BottEventType.ACTION_CALL;
  detail: {
    name: string;
    parameters?: Record<string, unknown>;
  };
} | {
  type: BottEventType.ACTION_ABORT;
  detail: {
    id: string;
  };
};
