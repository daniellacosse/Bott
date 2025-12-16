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

import { loadEnv } from "./common/env.ts";
import { gcloud } from "./common/gcloud.ts";
import {
  ENV,
  GCP_PROJECT,
  GCP_REGION,
  GCP_SERVICE_NAME,
} from "@bott/constants";

await loadEnv(ENV);
await gcloud.auth.ensure();

if (!GCP_PROJECT) {
  console.error("GCP_PROJECT is not set. Please ensure it is deployed.");
  Deno.exit(1);
}

await gcloud.run.logs({
  service: GCP_SERVICE_NAME,
  region: GCP_REGION,
  project: GCP_PROJECT,
});
