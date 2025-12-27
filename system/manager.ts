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

import { log, STORAGE_DEPLOY_NONCE_LOCATION, STORAGE_ROOT } from "@bott/common";
import type { BottSettings, BottUser } from "@bott/model";

import { actionService } from "./actions/service.ts";
import { eventStorageService } from "./events/storage/service.ts";
import type {
  BottAction,
  BottEventInterface as BottEvent,
  BottEventType,
  BottService,
  BottServiceContext,
  BottSystemContext,
} from "./types.ts";

const deploymentNonce = crypto.randomUUID();
Deno.mkdirSync(STORAGE_ROOT, { recursive: true });
Deno.writeTextFileSync(STORAGE_DEPLOY_NONCE_LOCATION, deploymentNonce);

export class BottSystemManager {
  private nonce: string;
  private settings: BottSettings;
  private services: Map<string, BottService> = new Map();
  private actions: Map<string, BottAction> = new Map();

  constructor({
    settings,
    services = [eventStorageService, actionService],
    actions,
  }: {
    settings: BottSettings;
    services?: BottService[];
    actions?: BottAction[];
  }) {
    this.nonce = deploymentNonce;
    this.settings = settings;

    services.forEach((service) => {
      this.services.set(service.name, service);
    });

    actions?.forEach((action) => {
      this.actions.set(action.name, action);
    });
  }

  get context(): BottSystemContext {
    return {
      nonce: this.nonce,
      services: Object.fromEntries(this.services),
      actions: Object.fromEntries(this.actions),
      settings: this.settings,
    };
  }

  get rootServiceContext(): Omit<BottServiceContext, "settings"> {
    const context: Partial<BottServiceContext> = {
      system: this.context,
    };

    context.dispatchEvent = this.dispatchEvent.bind(context);
    context.addEventListener = this.addEventListener.bind(context);
    context.removeEventListener = this.removeEventListener.bind(context);

    return context;
  }

  registerService(service: BottService) {
    if (this.services.has(service.name)) {
      throw new Error(`Service "${service.name}" already registered`);
    }

    this.services.set(service.name, service);
  }

  registerAction(action: BottAction) {
    if (this.actions.has(action.name)) {
      throw new Error(`Action "${action.name}" already registered`);
    }
    this.actions.set(action.name, action);
  }

  start(serviceName: string) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service "${serviceName}" not found`);
    }

    const context = this.rootServiceContext;

    context.settings.name = serviceName;

    service.call(context);

    log.info(`Service "${serviceName}" started`);
  }

  isSystemUser(user: BottUser) {
    let result = false;

    for (const service of this.services.values()) {
      if (service.user?.id === user.id) {
        result = true;
        break;
      }
    }

    return result;
  }

  private listeners = new Map<
    (
      event: never,
      context?: BottSystemContext,
    ) => unknown | Promise<unknown>,
    EventListener
  >();

  addEventListener<E extends BottEvent>(
    eventType: BottEventType,
    handler: (
      event: E,
      context?: BottSystemContext,
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
      context?: BottSystemContext,
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
