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

/**
 * Runs the Bott application in a container with the specified environment.
 *
 * Usage: deno task runApp <environment>
 * Example: deno task runApp test
 *
 * This will:
 * 1. Build the container image
 * 2. Run it with .env.<environment> file
 * 3. Mount the local volume for the "test" environment
 */

const envName = Deno.args[0];

if (!envName) {
  console.error("Usage: deno task runApp <environment>");
  console.error("Example: deno task runApp test");
  Deno.exit(1);
}

const envFile = `.env.${envName}`;

// Check if env file exists and read PORT value
let port = "8080"; // default
try {
  const envContent = await Deno.readTextFile(envFile);
  const portMatch = envContent.match(/^PORT=(\d+)/m);
  if (portMatch) {
    port = portMatch[1];
  }
} catch {
  console.error(`Environment file not found: ${envFile}`);
  Deno.exit(1);
}

// Build the container
console.log("Building container...");
const buildProcess = new Deno.Command("podman", {
  args: ["build", "-t", "bott", "."],
  stdout: "inherit",
  stderr: "inherit",
});

const buildResult = await buildProcess.output();
if (!buildResult.success) {
  console.error("Failed to build container");
  Deno.exit(1);
}

// Prepare run arguments
const runArgs = [
  "run",
  "--rm",
  "--env-file",
  envFile,
];

// Mount volume for test environment
if (envName === "test") {
  runArgs.push("-v", `${Deno.cwd()}:/workspace:Z`);
}

runArgs.push("-p", `${port}:${port}`, "bott");

// Run the container
console.log(`Running container with ${envFile} on port ${port}...`);
const runProcess = new Deno.Command("podman", {
  args: runArgs,
  stdout: "inherit",
  stderr: "inherit",
});

const runResult = await runProcess.output();
Deno.exit(runResult.success ? 0 : 1);
