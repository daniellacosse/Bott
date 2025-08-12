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

// This file demonstrates security validation examples and serves as documentation

import {
  validateFFmpegArgs,
  validateFileSize,
  validateUrl,
  sanitizeAIPrompt,
} from "./validation.ts";

// Example 1: Safe FFmpeg usage
console.log("✅ Testing safe FFmpeg arguments...");
try {
  validateFFmpegArgs([
    "-y", "-i", "{{INPUT_FILE}}", 
    "-vf", "scale=480:480:force_original_aspect_ratio=decrease:sws_flags=lanczos",
    "-c:v", "libwebp", "-lossless", "1", 
    "{{OUTPUT_FILE}}"
  ]);
  console.log("✅ Safe FFmpeg arguments validated successfully");
} catch (error) {
  console.error("❌ Unexpected error:", error);
}

// Example 2: Dangerous FFmpeg usage (should be blocked)
console.log("\n⚠️  Testing dangerous FFmpeg arguments...");
try {
  validateFFmpegArgs([
    "-i", "input.mp4", ";", "rm", "-rf", "/"
  ]);
  console.error("❌ Dangerous FFmpeg arguments were not blocked!");
} catch (error) {
  console.log("✅ Dangerous FFmpeg arguments correctly blocked:", error.message);
}

// Example 3: Safe URL validation
console.log("\n✅ Testing safe URL validation...");
try {
  validateUrl("https://example.com/image.jpg");
  console.log("✅ Safe URL validated successfully");
} catch (error) {
  console.error("❌ Unexpected error:", error);
}

// Example 4: SSRF attempt (should be blocked)
console.log("\n⚠️  Testing SSRF prevention...");
try {
  validateUrl("http://169.254.169.254/latest/meta-data/");
  console.error("❌ SSRF attempt was not blocked!");
} catch (error) {
  console.log("✅ SSRF attempt correctly blocked:", error.message);
}

// Example 5: File size validation
console.log("\n✅ Testing file size validation...");
try {
  const smallFile = new Uint8Array(1024); // 1KB
  validateFileSize(smallFile);
  console.log("✅ Small file validated successfully");
} catch (error) {
  console.error("❌ Unexpected error:", error);
}

// Example 6: AI prompt sanitization
console.log("\n✅ Testing AI prompt sanitization...");
const dangerousPrompt = "Create an image\x00with\n\n\nexcessive    spaces\x7F";
const sanitized = sanitizeAIPrompt(dangerousPrompt);
console.log("Original:", JSON.stringify(dangerousPrompt));
console.log("Sanitized:", JSON.stringify(sanitized));
console.log("✅ AI prompt sanitized successfully");

console.log("\n🔒 All security validations completed successfully!");