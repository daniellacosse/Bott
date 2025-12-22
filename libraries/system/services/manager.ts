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

import type { BottAction } from "@bott/actions";
import { STORAGE_DEPLOY_NONCE_LOCATION, STORAGE_ROOT } from "@bott/constants";
import type { BottEvent, BottEventType } from "@bott/events";
import { log } from "@bott/log";
import type { BottResponseSettings } from "@bott/model";
import type { BottService, BottServiceContext } from "./types.ts";

const deploymentNonce = crypto.randomUUID();
Deno.mkdirSync(STORAGE_ROOT, { recursive: true });
Deno.writeTextFileSync(STORAGE_DEPLOY_NONCE_LOCATION, deploymentNonce);

export class BottServicesManager {
  private nonce: string;
  private app: BottResponseSettings;
  private services: Map<string, BottService> = new Map();
  private actions: Map<string, BottAction> = new Map();
  private events: Set<BottEventType> = new Set();

  constructor(app: BottResponseSettings) {
    this.nonce = deploymentNonce;
    this.app = app;
  }

  get rootContext(): BottServiceContext {
    return {
      nonce: this.nonce,
      app: this.app,
      settings: {
        name: "root",
        actions: Object.fromEntries(this.actions),
        events: this.events,
      },
      dispatchEvent: this.dispatchEvent.bind(this),
      addEventListener: this.addEventListener.bind(this),
    };
  }

  register(service: BottService) {
    this.services.set(service.name, service);

    if (service.actions) {
      Object.entries(service.actions).forEach(([name, action]) => {
        this.actions.set(name, action);
      });
    }

    if (service.events) {
      this.events = new Set([...this.events, ...service.events]);
    }
  }

  start(serviceName: string) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const context = this.rootContext;

    context.settings.name = serviceName;

    service.call(context);
  }

  addEventListener<E extends BottEvent>(
    eventType: BottEventType,
    handler: (
      event: E,
      context?: BottServiceContext,
    ) => unknown | Promise<unknown>,
  ): void {
    if (!this.events.has(eventType)) {
      log.warn(
        `Event type "${eventType}" is not provided by any registered service.`,
      );
    }

    globalThis.addEventListener(eventType, async (event) => {
      const bottEvent = event as E;

      if (this.nonce !== this.getCurrentDeployNonce()) return;

      try {
        await handler(bottEvent, this.rootContext);
      } catch (error) {
        log.warn("Failed to handle event", error);
      }
    });
  }

  dispatchEvent(event: BottEvent) {
    if (!this.events.has(event.type)) {
      log.warn(
        `Event type "${event.type}" is not provided by any registered service. Refusing to dispatch.`,
      );
      return;
    }

    globalThis.dispatchEvent(event);
  }

  private getCurrentDeployNonce(): string | null {
    try {
      return Deno.readTextFileSync(STORAGE_DEPLOY_NONCE_LOCATION);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return null;
      }
      throw error;
    }
  }
}
