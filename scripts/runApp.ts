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
 * 1. Build the container image (if Dockerfile has changed since last build)
 * 2. Run it with .env.<environment> file
 * 3. Mount the local volume for the "test" environment
 */

const envName = Deno.args.find((arg) => !arg.startsWith("--"));

if (!envName) {
  console.error("Usage: deno task runApp <environment>");
  console.error("Example: deno task runApp test");
  Deno.exit(1);
}

const envFile = `.env.${envName}`;
const buildHashFile = ".build-hash";

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

// Compute hash of Dockerfile to detect changes
async function computeDockerfileHash(): Promise<string> {
  const dockerfile = await Deno.readTextFile("Dockerfile");
  const encoder = new TextEncoder();
  const data = encoder.encode(dockerfile);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Check if build is needed by comparing Dockerfile hash
async function isBuildNeeded(): Promise<boolean> {
  try {
    const currentHash = await computeDockerfileHash();
    const storedHash = await Deno.readTextFile(buildHashFile);
    return currentHash !== storedHash.trim();
  } catch {
    // If hash file doesn't exist or can't be read, build is needed
    return true;
  }
}

// Save the Dockerfile hash after successful build
async function saveBuildHash(): Promise<void> {
  const hash = await computeDockerfileHash();
  await Deno.writeTextFile(buildHashFile, hash);
}

// Build the container if Dockerfile has changed
const buildNeeded = await isBuildNeeded();
if (buildNeeded) {
  console.log("Dockerfile changed, building container...");
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
  await saveBuildHash();
} else {
  console.log("Dockerfile unchanged, skipping build...");
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
