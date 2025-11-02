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

import { extractFromHtml } from "@extractus/article-extractor";
import TurndownService from "turndown";
import { BottFileType } from "@bott/model";

import { STORAGE_FILE_SIZE_CAUTION } from "../../start.ts";

const turndownService = new TurndownService({
  headingStyle: "atx", // Use # for headings.
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**",
  linkStyle: "inlined",
});

export const prepareHtmlAsMarkdown = async (data: Uint8Array) => {
  const htmlText = new TextDecoder().decode(data);

  const extracted = await extractFromHtml(htmlText, undefined, {
    contentLengthThreshold: 0,
  });

  if (!extracted) {
    throw new Error("No data extracted from HTML.");
  }

  const resultBody = turndownService.turndown(extracted.content ?? "");
  const resultTitle = extracted.title ? `# ${extracted.title}\n\n` : "";
  const resultAuthor = extracted.author ? `_By: ${extracted.author}_\n\n` : "";

  let result = `${resultTitle}${resultAuthor}${resultBody}`;

  // Consolidate multiple blank lines:
  result = result.replace(/\n\s*\n\s*\n+/g, "\n\n").trim();

  if (result.length > STORAGE_FILE_SIZE_CAUTION) {
    result = result.substring(0, STORAGE_FILE_SIZE_CAUTION) +
      "\n\n...(truncated)";
  }

  return { data: new TextEncoder().encode(result), type: BottFileType.MD };
};
