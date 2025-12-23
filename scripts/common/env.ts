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

import { load, parse, stringify } from "@std/dotenv";

export async function loadEnv(envName: string) {
  await load({
    envPath: `.env.${envName}`,
    export: true,
  });
}

export async function updateEnv(
  envName: string,
  updates: Record<string, string>,
) {
  const path = `.env.${envName}`;
  const data = await parse(await Deno.readTextFile(path));

  for (const [key, value] of Object.entries(updates)) {
    const trimKey = key.trim();
    data[trimKey] = value.trim();
    Deno.env.set(trimKey, data[trimKey] as string);
  }

  await Deno.writeTextFile(path, stringify(data));
}

