export const DISCORD_MESSAGE_LIMIT = 2000;

export const HISTORY_LENGTH = Number(
  Deno.env.get("CONFIG_HISTORY_LENGTH") ?? 20,
);

const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000;
export const RATE_LIMIT_WINDOW_MS = FOUR_WEEKS_MS;
export const RATE_LIMIT_IMAGES = Number(
  Deno.env.get("CONFIG_RATE_LIMIT_IMAGES") ??
    100,
);
export const RATE_LIMIT_VIDEOS = Number(
  Deno.env.get("CONFIG_RATE_LIMIT_VIDEOS") ?? 10,
);
