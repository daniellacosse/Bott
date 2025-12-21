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

import { STORAGE_FILE_SIZE_LIMIT } from "@bott/constants";

/**
 * Storage validation utilities for security
 */

/**
 * Validates file size and throws if unsafe
 * @param data File data to validate
 * @throws Error if file size exceeds maximum
 */
export function throwIfUnsafeFileSize(data: Uint8Array): void {
  if (data.length > STORAGE_FILE_SIZE_LIMIT) {
    throw new Error(
      `File size ${data.length} exceeds maximum allowed size ${STORAGE_FILE_SIZE_LIMIT}`,
    );
  }
}

/**
 * Validates URL for SSRF protection and throws if unsafe
 * @param url URL to validate
 * @throws Error if URL is invalid or blocked
 */
export function throwIfUnsafeUrl(url: URL): void {
  // Only allow HTTP and HTTPS
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`Protocol not allowed: ${url.protocol}`);
  }

  // Block localhost and private IP ranges
  const hostname = url.hostname.toLowerCase();

  // Block localhost variations
  if (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
  ) {
    throw new Error(`Blocked URL: localhost not allowed`);
  }

  // Block private IP ranges (IPv4)
  const ipv4Patterns = [
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^169\.254\./, // 169.254.0.0/16 (link-local)
  ];

  if (ipv4Patterns.some((pattern) => pattern.test(hostname))) {
    throw new Error(`Blocked URL: private IP range not allowed`);
  }

  // Block common internal hostnames
  const blockedHostnames = [
    "metadata.google.internal",
    "169.254.169.254", // AWS/GCP metadata
    "metadata",
    "consul",
    "vault",
  ];

  if (blockedHostnames.some((blocked) => hostname.includes(blocked))) {
    throw new Error(`Blocked URL: internal hostname not allowed`);
  }
}
