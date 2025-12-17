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

import { GoogleGenAI } from "@google/genai";
import { GCP_PROJECT, GCP_REGION, GEMINI_ACCESS_TOKEN } from "@bott/constants";

export default makeLazyObject(() => {
  if (GCP_PROJECT) {
    return new GoogleGenAI({
      vertexai: true,
      project: GCP_PROJECT,
      location: GCP_REGION,
    });
  } else if (GEMINI_ACCESS_TOKEN) {
    return new GoogleGenAI({
      vertexai: false,
      apiKey: GEMINI_ACCESS_TOKEN,
    });
  } else {
    throw new Error("No GCP Project or API Key provided");
  }
});

/**
 * Creates a lazy object that is only initialized when a property is accessed.
 * @param factory The factory function to create the object.
 * @returns The lazy object.
 */
function makeLazyObject<T extends object>(factory: () => T): T {
  let instance: T | undefined;

  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      if (!instance) {
        instance = factory();
      }

      // Forward the property access to the instance
      return Reflect.get(instance, prop, receiver);
    },
  });
}
