import { join } from "jsr:@std/path";

export const DISCORD_MESSAGE_LIMIT = 2000;

const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000;
export const RATE_LIMIT_WINDOW_MS = FOUR_WEEKS_MS;
export const RATE_LIMIT_IMAGES = Number(
  Deno.env.get("CONFIG_RATE_LIMIT_IMAGES") ??
    100,
);
export const RATE_LIMIT_MUSIC = Number(
  Deno.env.get("CONFIG_RATE_LIMIT_MUSIC") ??
    25,
);
export const RATE_LIMIT_VIDEOS = Number(
  Deno.env.get("CONFIG_RATE_LIMIT_VIDEOS") ?? 10,
);

export const FILE_SYSTEM_ROOT = Deno.env.get("FILE_SYSTEM_ROOT") ?? "./fs_root";
export const FILE_SYSTEM_DEPLOY_NONCE_PATH = join(
  FILE_SYSTEM_ROOT,
  ".deploy-nonce",
);
