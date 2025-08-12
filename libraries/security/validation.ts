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

/**
 * Security validation utilities to prevent RCE and other attacks
 */

// Maximum file size in bytes (50MB)
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Maximum dimensions for images/videos
export const MAX_MEDIA_DIMENSION = 4096;

// Allowed FFmpeg arguments - whitelist approach for security
export const ALLOWED_FFMPEG_ARGS = new Set([
  // Basic options
  "-y", "-n", "-f", "-t", "-ss", "-to", "-i",
  
  // Video options
  "-c:v", "-vf", "-r", "-s", "-b:v", "-maxrate", "-bufsize", "-g", "-keyint_min",
  "-sc_threshold", "-an", "-vn", "-frames:v", "-preset", "-crf", "-profile:v",
  "-level", "-pix_fmt", "-aspect", "-filter:v", "-vframes", "-fps",
  
  // Audio options
  "-c:a", "-ac", "-ar", "-b:a", "-acodec", "-af", "-filter:a", "-vol", "-aframes",
  "-application",
  
  // Format options
  "-movflags", "-avoid_negative_ts", "-fflags", "-map", "-metadata",
  "-compression_level", "-lossless",
  
  // Common codecs
  "libx264", "libx265", "libvpx", "libvpx-vp9", "libopus", "libmp3lame", 
  "libfdk_aac", "libwebp", "mjpeg", "png", "copy",
  
  // Formats
  "mp4", "webm", "opus", "mp3", "wav", "webp", "png", "jpeg",
  
  // Scale and filter values (these need additional validation)
  "scale", "fps", "format", "yuv420p", "lanczos", "bicubic", "bilinear",
  
  // Numeric values (validated separately)
  "16000", "24000", "44100", "48000", "1", "2", "5", "6", "15", "24", "30", "60"
]);

// Dangerous patterns that should never appear in FFmpeg args
export const DANGEROUS_PATTERNS = [
  // Command injection attempts
  ";", "|", "&", "`", "$", "$(", "${", "\\", "\n", "\r",
  
  // File system access attempts
  "../", "./", "/etc/", "/proc/", "/sys/", "/dev/", "/tmp/",
  "~", "file://", "http://", "https://", "ftp://",
  
  // Executable attempts
  "exec", "eval", "system", "shell", "bash", "sh", "cmd", "powershell"
];

/**
 * Validates FFmpeg arguments for security
 */
export function validateFFmpegArgs(args: string[]): void {
  for (const arg of args) {
    // Check for dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (arg.toLowerCase().includes(pattern.toLowerCase())) {
        throw new Error(`Dangerous pattern detected in FFmpeg argument: ${pattern}`);
      }
    }
    
    // Check if argument is in whitelist or is a placeholder
    if (!isAllowedFFmpegArg(arg)) {
      throw new Error(`Unsafe FFmpeg argument: ${arg}`);
    }
  }
}

/**
 * Check if an FFmpeg argument is allowed
 */
function isAllowedFFmpegArg(arg: string): boolean {
  // Allow placeholders
  if (arg === "{{INPUT_FILE}}" || arg === "{{OUTPUT_FILE}}") {
    return true;
  }
  
  // Allow exact matches from whitelist
  if (ALLOWED_FFMPEG_ARGS.has(arg)) {
    return true;
  }
  
  // Allow numeric values
  if (/^\d+$/.test(arg)) {
    const num = parseInt(arg, 10);
    return num >= 0 && num <= 999999; // Reasonable bounds
  }
  
  // Allow simple scale expressions (e.g., "480:480")
  if (/^\d+:\d+$/.test(arg)) {
    const [width, height] = arg.split(":").map(s => parseInt(s, 10));
    return width <= MAX_MEDIA_DIMENSION && height <= MAX_MEDIA_DIMENSION;
  }
  
  // Allow complex scale expressions with safe functions
  if (arg.startsWith("scale=") || arg.startsWith("fps=")) {
    return validateScaleExpression(arg);
  }
  
  // Allow specific filter expressions that we know are safe
  if (arg.includes("force_original_aspect_ratio=decrease") ||
      arg.includes("sws_flags=lanczos") ||
      arg.includes("format=yuv420p")) {
    return validateFilterExpression(arg);
  }
  
  return false;
}

/**
 * Validate scale expressions in FFmpeg filters
 */
function validateScaleExpression(expr: string): boolean {
  // Only allow specific known-safe scale expressions
  const safeScalePatterns = [
    /^scale=\d+:\d+(:force_original_aspect_ratio=decrease)?((:sws_flags=lanczos)|(:sws_flags=bicubic))?$/,
    /^fps=\d+$/,
    /^scale='trunc\(iw\*min\(\d+\/iw,\d+\/ih\)\/2\)\*2':'trunc\(ih\*min\(\d+\/iw,\d+\/ih\)\/2\)\*2'(:sws_flags=lanczos)?$/,
  ];
  
  return safeScalePatterns.some(pattern => pattern.test(expr));
}

/**
 * Validate filter expressions
 */
function validateFilterExpression(expr: string): boolean {
  // Known safe filter components
  const safeComponents = [
    "force_original_aspect_ratio=decrease",
    "sws_flags=lanczos",
    "sws_flags=bicubic", 
    "format=yuv420p",
  ];
  
  return safeComponents.some(component => expr.includes(component));
}

/**
 * Validates file size
 */
export function validateFileSize(data: Uint8Array): void {
  if (data.length > MAX_FILE_SIZE) {
    throw new Error(`File size ${data.length} exceeds maximum allowed size ${MAX_FILE_SIZE}`);
  }
}

/**
 * Validates URL for SSRF protection
 */
export function validateUrl(url: string): void {
  let parsedUrl: URL;
  
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  
  // Only allow HTTP and HTTPS
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(`Unsupported protocol: ${parsedUrl.protocol}`);
  }
  
  // Block localhost and private IP ranges
  const hostname = parsedUrl.hostname.toLowerCase();
  
  // Block localhost variations
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    throw new Error("Localhost access is not allowed");
  }
  
  // Block private IP ranges (IPv4)
  const ipv4Patterns = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
  ];
  
  if (ipv4Patterns.some(pattern => pattern.test(hostname))) {
    throw new Error("Private IP access is not allowed");
  }
  
  // Block common internal hostnames
  const blockedHostnames = [
    "metadata.google.internal",
    "169.254.169.254", // AWS/GCP metadata
    "metadata",
    "consul",
    "vault",
  ];
  
  if (blockedHostnames.some(blocked => hostname.includes(blocked))) {
    throw new Error(`Access to ${hostname} is not allowed`);
  }
}

/**
 * Sanitizes user input for AI prompts to prevent injection
 */
export function sanitizeAIPrompt(input: string): string {
  // Remove or escape potentially dangerous patterns
  return input
    // Remove excessive whitespace
    .replace(/\s+/g, " ")
    .trim()
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Limit length to prevent token overflow
    .substring(0, 10000);
}