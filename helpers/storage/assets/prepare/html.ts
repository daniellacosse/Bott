import { extractFromHtml } from "npm:@extractus/article-extractor";
import TurndownService from "npm:turndown";

import { BottAssetType } from "@bott/model";

import { FS_ASSET_SIZE_CAUTION } from "../../start.ts";
import type { AssetDataPreparer } from "../types.ts";

const turndownService = new TurndownService({
  headingStyle: "atx", // Use # for headings.
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**",
  linkStyle: "inlined",
});

export const prepareHtml: AssetDataPreparer = async (data) => {
  const htmlText = new TextDecoder().decode(data);

  const extracted = await extractFromHtml(htmlText) ?? {};

  const resultBody = turndownService.turndown(extracted.content ?? "");
  const resultTitle = extracted.title ? `# ${extracted.title}\n\n` : "";
  const resultAuthor = extracted.author ? `_By: ${extracted.author}_\n\n` : "";

  let result = `${resultTitle}${resultAuthor}${resultBody}`;

  // Consolidate multiple blank lines:
  result = result.replace(/\n\s*\n\s*\n+/g, "\n\n").trim();

  if (result.length > FS_ASSET_SIZE_CAUTION) {
    result = result.substring(0, FS_ASSET_SIZE_CAUTION) +
      "\n\n...(truncated)";
  }

  return [new TextEncoder().encode(result), BottAssetType.MD];
};
