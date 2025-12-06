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

import { load } from "@std/dotenv";

const testEnv = "test";
const defaultPort = "8080";
const buildHashFile = ".build-hash";
const processSignals = ["SIGINT", "SIGTERM"] as const;
const [envName] = Deno.args;

if (!envName) {
  console.error("Usage: deno task runApp <environment>");
  console.error("Example: deno task runApp test");
  Deno.exit(1);
}

const containerName = `bott_${envName}`;
const envPath = `.env.${envName}`;

await load({ envPath });

// Ensure previous container is removed
try {
  const removeCommand = new Deno.Command("podman", {
    args: ["rm", "-f", containerName],
    stdout: "null",
    stderr: "null",
  });
  await removeCommand.output();
  // Give it a moment to release resources
  await new Promise((resolve) => setTimeout(resolve, 1000));
} catch {
  // ignore
}

// Build the container if needed
const currentDockerfileHash = await computeFileHash("Dockerfile");
let storedDockerfileHash = "";
try {
  storedDockerfileHash = await Deno.readTextFile(buildHashFile);
} catch {
  // ignore
}

if (envName === testEnv && currentDockerfileHash === storedDockerfileHash) {
  console.log(`Build unchanged for '${testEnv}', skipping...`);
} else {
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

  await Deno.writeTextFile(buildHashFile, currentDockerfileHash);
}

// Run the new container
const port = Deno.env.get("PORT") || defaultPort;
const args = [
  "run",
  "--name",
  containerName,
  "--rm",
  "--env-file",
  envPath,
  "-p",
  `${port}:${port}`,
];

// Add volume if we are in test mode
if (envName === testEnv) {
  args.push("-v", `${Deno.cwd()}:/workspace:Z`);
  // Mount gcloud credentials
  args.push(
    "-v",
    `${Deno.env.get("HOME")}/.config/gcloud:/root/.config/gcloud:Z`,
  );
}

console.log(`Running container with ${envPath} on port ${port}...`);
const process = new Deno.Command("podman", {
  args: [...args, "bott"],
  stdout: "inherit",
  stderr: "inherit",
}).spawn();

for (const signal of processSignals) {
  Deno.addSignalListener(signal, () => {
    try {
      process.kill(signal);
    } catch {
      // ignore
    }

    Deno.exit(0);
  });
}

const status = await process.status;
Deno.exit(status.code);

// ---
// helper function to compute file hash
async function computeFileHash(file: string): Promise<string> {
  const data = await Deno.readTextFile(file);
  const dataBuffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
