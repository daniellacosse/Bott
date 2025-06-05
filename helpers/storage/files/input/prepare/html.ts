import { extractFromHtml } from "npm:@extractus/article-extractor";
import TurndownService from "npm:turndown";

import { BottInputFileType } from "@bott/model";

import { STORAGE_FILE_SIZE_CAUTION } from "../../../start.ts";
import type { InputFileDataTransformer } from "../../types.ts";

const turndownService = new TurndownService({
  headingStyle: "atx", // Use # for headings.
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**",
  linkStyle: "inlined",
});

export const prepareHtmlAsMarkdown: InputFileDataTransformer = async (data) => {
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

  return [new TextEncoder().encode(result), BottInputFileType.MD];
};
