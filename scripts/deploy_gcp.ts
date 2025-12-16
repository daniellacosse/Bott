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

import { loadEnv, updateEnv } from "./common/env.ts";
import { gcloud } from "./common/gcloud.ts";

import { log } from "@bott/logger";
import {
  ENV,
  GCP_ALLOW_UNAUTHENTICATED,
  GCP_PROJECT,
  GCP_REGION,
  GCP_SERVICE_NAME,
} from "@bott/constants";

await loadEnv(ENV);
await gcloud.auth.ensure();

let project = GCP_PROJECT;

if (!project) {
  const input = prompt(
    `Enter GCP Project ID:`,
    `bott-${ENV}-${Math.random().toString(36).substring(2, 8)}`,
  );
  project = input!.trim();

  await updateEnv(ENV, { GCP_PROJECT: project });
}

log.info(`Enabling ${project} is properly configured...`);
await gcloud.project.ensure(project);

await gcloud.services.enable(
  "aiplatform.googleapis.com",
  "storage.googleapis.com",
  "run.googleapis.com",
  "artifactregistry.googleapis.com",
  "cloudbuild.googleapis.com",
);

const serviceAccountEmail = `${await gcloud.project.getNumber(
  project,
)}@cloudbuild.gserviceaccount.com`;

await gcloud.project.addIamBinding({
  project,
  member: `serviceAccount:${serviceAccountEmail}`,
  role: "roles/aiplatform.user",
});
await gcloud.project.addIamBinding({
  project,
  member: `serviceAccount:${serviceAccountEmail}`,
  role: "roles/storage.objectAdmin",
});

log.info(`Deploying ${GCP_SERVICE_NAME} to ${GCP_REGION}...`);
await gcloud.deploy(GCP_SERVICE_NAME, {
  source: ".",
  region: GCP_REGION,
  project,
  platform: "managed",
  cpu: 1,
  memory: "1.5Gi",
  maxInstances: 1,
  port: 8080,
  envVarsFile: `.env.${ENV}.yml`,
  allowUnauthenticated: GCP_ALLOW_UNAUTHENTICATED,
});

log.info(
  `Deployment successful! Service URL: ${await gcloud.run.getUrl({
    service: GCP_SERVICE_NAME,
    region: GCP_REGION,
    project,
  })}`,
);
