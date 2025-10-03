import type {
  AnyShape,
  BottAction,
  BottChannel,
  BottEvent,
  BottGlobalSettings,
  BottUser,
} from "@bott/model";

export interface EventPipelineContext<O extends AnyShape = AnyShape> {
  data: {
    input: BottEvent<AnyShape>[];
    output: BottEvent<AnyShape>[];
  };
  abortSignal: AbortSignal;
  user: BottUser;
  channel: BottChannel;
  actions: Record<string, BottAction<O, AnyShape>>;
  settings: BottGlobalSettings;
}

export type EventPipelineProcessor = (
  context: EventPipelineContext,
) => Promise<EventPipelineContext>;

export type EventPipeline = EventPipelineProcessor[];

export type GeminiEventGenerationResult = {
  inputEventScores: BottEvent<
    { content: string; scores: Record<string, GeminiEventTraitScore> }
  >[];
  outputEvents: (
    | BottEvent<
      { content: string; scores: Record<string, GeminiEventTraitScore> }
    >
    | BottEvent<
      {
        name: string;
        options: AnyShape;
        scores: Record<string, GeminiEventTraitScore>;
      }
    >
  )[];
  outputScores?: Record<string, GeminiEventTraitScore>;
};

export type GeminiEventTraitScore = {
  score: number;
  rationale?: string;
};
