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

import { createExecutor, Executor, FlagRecord } from "./exec.ts";

export class GCloudClient {
  constructor(private readonly executor: Executor = createExecutor("gcloud")) { }

  readonly auth = {
    login: async () => {
      await this.executor(["auth", "login"], { capture: false });
    },
    check: async (): Promise<boolean> => {
      try {
        const account = await this.executor(["auth", "list"], {
          flags: { filter: "status:ACTIVE", format: "value(account)" },
        });
        return account.length > 0;
      } catch {
        return false;
      }
    },
    ensure: async () => {
      if (!(await this.auth.check())) {
        await this.auth.login();
      }
    },
  };

  readonly project = {
    set: async (project: string) => {
      return await this.executor(["config", "set", "project", project]);
    },
    describe: async (project: string) => {
      return await this.executor(["projects", "describe", project]);
    },
    create: async (project: string) => {
      return await this.executor(["projects", "create", project]);
    },
    getNumber: async (project: string): Promise<string> => {
      return await this.executor(["projects", "describe", project], {
        flags: { format: "value(projectNumber)" },
      });
    },
    addIamBinding: async (
      options: { project: string; member: string; role: string },
    ) => {
      try {
        await this.executor(
          ["projects", "add-iam-policy-binding", options.project],
          { flags: { member: options.member, role: options.role } },
        );
      } catch {
        // Ignore error
      }
    },
    ensure: async (project: string) => {
      try {
        await this.project.set(project);
      } catch {
        try {
          await this.project.describe(project);
        } catch {
          await this.project.create(project);
        }
      }
    },
  };

  readonly services = {
    enable: async (...serviceNames: string[]) => {
      return await this.executor(["services", "enable", ...serviceNames]);
    },
  };

  readonly run = {
    getUrl: async (
      options: { service: string; region: string; project: string },
    ): Promise<string> => {
      return await this.executor(
        ["run", "services", "describe", options.service],
        {
          flags: {
            region: options.region,
            project: options.project,
            format: "value(status.url)",
          },
        },
      );
    },
    logs: async (
      options: { service: string; region: string; project: string },
    ) => {
      await this.executor(
        ["beta", "run", "services", "logs", "tail", options.service],
        {
          flags: { project: options.project, region: options.region },
          capture: false,
        },
      );
    },
  };

  async deploy(serviceName: string, flags: FlagRecord) {
    await this.executor(["run", "deploy", serviceName], {
      flags,
      capture: false,
    });
  }
}

export const gcloud = new GCloudClient();
