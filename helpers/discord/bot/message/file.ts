import { extractFromHtml } from "npm:@extractus/article-extractor";

import { type BottFile, BottFileType } from "@bott/data";

export const getFileFromUrl = async (
  rawUrl: string,
): Promise<BottFile | undefined> => {
  let url;
  try {
    url = new URL(rawUrl);
  } catch (_) {
    // Must be a valid URL.
    return;
  }

  let response, type;
  try {
    response = await fetch(url);
    type = response.headers.get("content-type")?.split(
      /;\s*/,
    ).find((part) =>
      Object.values(BottFileType).includes(part as BottFileType)
    );
  } catch (error) {
    // Can't fetch this, continue.
    console.warn("[WARN] Failed to fetch URL:", error);
    return;
  }

  if (!type) {
    console.debug(
      "[DEBUG] Fetched URL is not a supported file type.",
      url.toString(),
      type,
    );
    return;
  }

  let data;
  if (type === BottFileType.HTML) {
    data = new TextEncoder().encode(
      (await extractFromHtml(await response.text(), url.toString()))
        ?.content,
    );
  } else {
    data = new Uint8Array(await response.arrayBuffer());
  }

  let name = url.pathname.split("/").pop() || "index";

  // Try to add a file extension if there isn't one.
  if (!/\.[^/.]+$/.test(name)) {
    for (const [key, value] of Object.entries(BottFileType)) {
      if (type === value) {
        name += `.${key.toLowerCase()}`;
        break;
      }
    }
  }

  return {
    id: crypto.randomUUID(),
    type: type as BottFileType,
    url,
    name,
    data,
  };
};
