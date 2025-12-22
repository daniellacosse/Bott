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

const FILENAME_PREFIX_CHARACTER_LIMIT = 35;

export function generateFilename(extension: string, prefix = "file"): string {
  prefix = prefix.replace(/[\s+/]/g, "-").toLowerCase().slice(
    0,
    FILENAME_PREFIX_CHARACTER_LIMIT,
  );

  return `${prefix}--${crypto.randomUUID()}.${extension}`;
}
