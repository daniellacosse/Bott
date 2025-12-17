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

import type { BottService } from "@bott/model";

export class BottServiceRegistry {
  services: Map<string, BottService> = new Map();
  nonce?: string | null;

  register(service: BottService): void {
    if (this.services.has(service.user.id)) {
      throw new Error(`Service "${service.user.id}" is already registered.`);
    }
    this.services.set(service.user.id, service);
  }

  get(id: string): BottService | undefined {
    return this.services.get(id);
  }
}

export const serviceRegistry: BottServiceRegistry = new BottServiceRegistry();
