export const INPUT_FILE_TOKEN_LIMIT = Number(
  Deno.env.get("CONFIG_INPUT_FILE_TOKEN_LIMIT") ?? 500_000,
);

export const INPUT_EVENT_LIMIT = Number(
  Deno.env.get("CONFIG_INPUT_EVENT_LIMIT") ?? 2000,
);
