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

import { STORAGE_MAX_FILE_SIZE } from "@bott/constants";
import { BottAttachmentType } from "@bott/model";
import { extractFromHtml } from "@extractus/article-extractor";
import TurndownService from "turndown";


const turndownService = new TurndownService({
  headingStyle: "atx", // Use # for headings.
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**",
  linkStyle: "inlined",
});

export const prepareHtmlAsMarkdown = async (
  file: File,
  attachmentId: string,
): Promise<File> => {
  const htmlText = new TextDecoder().decode(await file.arrayBuffer());

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

  if (result.length > STORAGE_MAX_FILE_SIZE) {
    result = result.substring(0, STORAGE_MAX_FILE_SIZE) +
      "\n\n...(truncated)";
  }

  return new File(
    [new TextEncoder().encode(result)],
    `${attachmentId}.compressed.md`,
    { type: BottAttachmentType.MD },
  );
};
