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

// TODO: this should be the system manager
export class BottServicesManager {
  private nonce: string;
  private app: BottResponseSettings;
  private services: Map<string, BottService> = new Map();
  private actions: Map<string, BottAction> = new Map();

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
      },
      dispatchEvent: this.dispatchEvent.bind(this),
      addEventListener: this.addEventListener.bind(this),
      removeEventListener: this.removeEventListener.bind(this),
    };
  }

  register(service: BottService) {
    this.services.set(service.name, service);

    if (service.actions) {
      Object.entries(service.actions).forEach(([name, action]) => {
        this.actions.set(name, action);
      });
    }

    log.info(`Service "${service.name}" registered`);
  }

  start(serviceName: string) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service "${serviceName}" not found`);
    }

    const context = this.rootContext;

    context.settings.name = serviceName;

    service.call(context);

    log.info(`Service "${serviceName}" started`);
  }

  private listeners = new Map<
    (
      event: never,
      context?: BottServiceContext,
    ) => unknown | Promise<unknown>,
    EventListener
  >();

  addEventListener<E extends BottEvent>(
    eventType: BottEventType,
    handler: (
      event: E,
      context?: BottServiceContext,
    ) => unknown | Promise<unknown>,
  ): void {
    const listener = async (event: Event) => {
      const bottEvent = event as E;

      if (this.nonce !== this.getCurrentDeployNonce()) return;

      try {
        await handler(bottEvent, this.rootContext);
      } catch (error) {
        log.error("Failed to handle event:", event, error);
      }
    };

    this.listeners.set(handler, listener);
    globalThis.addEventListener(eventType, listener);
  }

  removeEventListener<E extends BottEvent>(
    eventType: BottEventType,
    handler: (
      event: E,
      context?: BottServiceContext,
    ) => unknown | Promise<unknown>,
  ): void {
    if (!this.listeners.has(handler)) return;

    globalThis.removeEventListener(eventType, this.listeners.get(handler)!);
    this.listeners.delete(handler);
  }

  dispatchEvent(event: BottEvent) {
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
