import { join } from "jsr:@std/path";

import { FS_ASSET_ROOT } from "../start.ts";

import { type BottAsset, BottAssetType } from "@bott/model";

import { SupportedRawFileType } from "./types.ts";
import { prepareHtml } from "./prepare/html.ts";

export const _getResponseContentType = (response: Response): string => {
  const contentTypeHeader = response.headers.get("content-type");
  if (!contentTypeHeader) return "";
  return contentTypeHeader.split(";")[0].trim();
};

export const cacheAsset = async (source: URL): Promise<BottAsset> => {
  if (!FS_ASSET_ROOT) {
    throw new Error(
      "Storage has not been started: FS_ASSET_ROOT is not defined",
    );
  }

  // 1. resolve source URL
  const response = await fetch(source);
  const sourceData = new Uint8Array(await response.arrayBuffer());
  const sourceType = _getResponseContentType(response);

  // 2. prepare file of type
  let resultData, resultType;
  switch (sourceType) {
    case SupportedRawFileType.HTML:
      [resultData, resultType] = await prepareHtml(sourceData);
      break;
    default:
      throw new Error(`Unsupported source type: ${sourceType}`);
  }

  // 3. write to disk
  let path = resultType as string;
  let name = source.pathname.split("/").pop() || "index";

  for (const [key, value] of Object.entries(BottAssetType)) {
    if (resultType === value) {
      name += `.${
        Math.random().toString(36).substring(7)
      }.${key.toLowerCase()}`;
      break;
    }
  }

  path += `/${name}`;

  Deno.mkdirSync(join(FS_ASSET_ROOT, resultType), { recursive: true });
  Deno.writeFileSync(join(FS_ASSET_ROOT, path), resultData);

  // 4. return BottAsset
  return {
    id: crypto.randomUUID(),
    path,
    type: resultType,
    data: resultData,
  };
};
