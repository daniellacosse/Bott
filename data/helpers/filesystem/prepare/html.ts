import { extractFromHtml } from "npm:@extractus/article-extractor";
import TurndownService from "npm:turndown";

import { FILE_SYSTEM_SIZE_CAUTION } from "../../../filesystem/client.ts";
import type { SourceFileDataSanitizer } from "./types.ts";
import { BottFileType } from "../types.ts";

const turndownService = new TurndownService({
  headingStyle: "atx", // Use # for headings.
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**",
  linkStyle: "inlined",
});

export const prepareHtml: SourceFileDataSanitizer = async (data) => {
  const htmlText = new TextDecoder().decode(data);

  const extracted = await extractFromHtml(htmlText) ?? {};

  const resultBody = turndownService.turndown(extracted.content ?? "");
  const resultTitle = extracted.title ? `# ${extracted.title}\n\n` : "";
  const resultAuthor = extracted.author ? `_By: ${extracted.author}_\n\n` : "";

  let result = `${resultTitle}${resultAuthor}${resultBody}`;

  // Consolidate multiple blank lines:
  result = result.replace(/\n\s*\n\s*\n+/g, "\n\n").trim();

  if (result.length > FILE_SYSTEM_SIZE_CAUTION) {
    result = result.substring(0, FILE_SYSTEM_SIZE_CAUTION) +
      "\n\n...(truncated)";
  }

  return [new TextEncoder().encode(result), BottFileType.MD];
};
