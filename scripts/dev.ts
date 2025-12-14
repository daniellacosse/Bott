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

import { loadConfig, setEnvFromConfig } from "./configLoader.ts";

const configPath = "config.dev.yml";

try {
  const config = await loadConfig({
    configPath,
    exampleConfigPath: "config.example.yml",
  });
  setEnvFromConfig(config);
  console.log(`✓ Loaded configuration from ${configPath}`);
} catch (error) {
  console.error(`Failed to load config from ${configPath}:`, error.message);
  console.error(
    "Please copy config.example.yml to config.dev.yml and configure it.",
  );
  Deno.exit(1);
}

// Start the application
const command = new Deno.Command("deno", {
  args: [
    "run",
    "--allow-all",
    "--watch=app/,libraries/,model/",
    "./app/main.ts",
  ],
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
});

const process = command.spawn();
const status = await process.status;
Deno.exit(status.code);
