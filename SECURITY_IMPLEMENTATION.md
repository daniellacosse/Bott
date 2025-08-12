# Security Implementation Guide

This document outlines the security measures implemented in Bott to prevent Remote Code Execution (RCE) and other security vulnerabilities.

## Overview

Bott processes user-generated content including text, images, videos, audio files, and URLs. This presents several attack vectors that have been mitigated through comprehensive security controls.

## Attack Vectors and Mitigations

### 1. Command Injection (FFmpeg RCE)

**Risk**: User input could be used to inject malicious commands into FFmpeg execution.

**Mitigation**:
- **Argument Whitelisting**: Only pre-approved FFmpeg arguments are allowed (`@bott/security/validation.ts`)
- **Pattern Blacklisting**: Dangerous patterns like `;`, `|`, `&`, `../`, etc. are explicitly blocked
- **Input Validation**: All arguments are validated before execution
- **Process Timeout**: FFmpeg processes are limited to 5 minutes maximum execution time
- **Safe Placeholder Replacement**: Only `{{INPUT_FILE}}` and `{{OUTPUT_FILE}}` placeholders are replaced

**Implementation**: See `libraries/storage/files/prepare/ffmpeg.ts`

### 2. Server-Side Request Forgery (SSRF)

**Risk**: Malicious URLs could be used to access internal services or metadata endpoints.

**Mitigation**:
- **Protocol Restriction**: Only HTTP and HTTPS protocols are allowed
- **Private IP Blocking**: Localhost, private IP ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x) are blocked
- **Metadata Endpoint Blocking**: Common cloud metadata endpoints are explicitly blocked
- **Request Timeout**: All HTTP requests have a 30-second timeout
- **URL Validation**: All URLs are validated before fetching

**Implementation**: See `libraries/security/validation.ts` and `libraries/storage/files/resolve.ts`

### 3. File Upload Attacks

**Risk**: Malicious files could exploit vulnerabilities in file processing libraries.

**Mitigation**:
- **File Size Limits**: Maximum file size of 50MB
- **Content-Type Validation**: Only known safe content types are allowed
- **Input/Output Validation**: Both input and output files from FFmpeg are size-validated
- **Temporary File Cleanup**: All temporary files are properly cleaned up

**Implementation**: See `libraries/security/validation.ts` and `libraries/storage/files/prepare/ffmpeg.ts`

### 4. AI Prompt Injection

**Risk**: Malicious prompts could be used to manipulate AI model behavior.

**Mitigation**:
- **Input Sanitization**: Control characters are stripped from prompts
- **Length Limiting**: Prompts are limited to 10,000 characters
- **Whitespace Normalization**: Excessive whitespace is normalized

**Implementation**: See `libraries/security/validation.ts` and `app/requestHandlers/generateMedia.ts`

## Security Functions

### `validateFFmpegArgs(args: string[])`
Validates FFmpeg arguments against a whitelist and blocks dangerous patterns.

### `validateFileSize(data: Uint8Array)`
Ensures file sizes don't exceed the maximum allowed limit.

### `validateUrl(url: string)`
Validates URLs to prevent SSRF attacks.

### `sanitizeAIPrompt(input: string)`
Sanitizes user input for AI prompts to prevent injection attacks.

## Security Testing

Comprehensive tests are provided in `libraries/security/validation.test.ts` covering:

- FFmpeg argument validation (safe and dangerous inputs)
- File size validation
- URL validation (SSRF protection)
- AI prompt sanitization

## Configuration

Security limits are configurable through constants:

```typescript
// Maximum file size (50MB)
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Maximum media dimensions
export const MAX_MEDIA_DIMENSION = 4096;
```

## Deployment Considerations

1. **Process Isolation**: Run FFmpeg processes in containers or chroot jails when possible
2. **Resource Limits**: Set CPU and memory limits for FFmpeg processes
3. **Network Policies**: Implement network segmentation to limit outbound access
4. **Monitoring**: Monitor for suspicious file processing patterns
5. **Updates**: Keep FFmpeg and other dependencies updated

## Security Headers

When fetching external content, security headers are included:

```typescript
headers: {
  "User-Agent": "Bott-Discord-Bot/1.0",
}
```

## Logging and Monitoring

- All security validation failures are logged
- File processing operations include size and type logging
- URL fetching includes destination logging

## Emergency Response

If a security issue is discovered:

1. **Immediate**: Update the validation rules to block the attack vector
2. **Short-term**: Deploy the fix and monitor for similar attacks
3. **Long-term**: Review and strengthen related security controls

## Contributing Security Fixes

When adding new features that process user input:

1. Review the existing security functions
2. Add appropriate validation calls
3. Write security tests for new functionality
4. Update this documentation

## Security Contact

Report security vulnerabilities to: [D@nielLaCos.se](mailto:d@niellacos.se)

Do not open GitHub issues for security vulnerabilities.