import { writeData } from "../../../filesystem/client.ts";
import { type BottFile, BottFileType } from "../types.ts";
import { BottFileSourceType } from "./types.ts";
import { prepareHtml } from "./html.ts";

export const _getResponseContentType = (response: Response): string => {
  const contentTypeHeader = response.headers.get("content-type");
  if (!contentTypeHeader) return "";
  return contentTypeHeader.split(";")[0].trim();
};

export const prepareFileSource = async (source: URL): Promise<BottFile> => {
  // 1. resolve source URL
  const response = await fetch(source);
  const sourceData = new Uint8Array(await response.arrayBuffer());
  const sourceType = _getResponseContentType(response);

  // 2. prepare file of type
  let resultData, resultType;
  switch (sourceType) {
    case BottFileSourceType.HTML:
      [resultData, resultType] = await prepareHtml(sourceData);
      break;
    default:
      throw new Error(`Unsupported source type: ${sourceType}`);
  }

  // 3. write to disk
  let path = resultType as string;
  let name = source.pathname.split("/").pop() || "index";

  for (const [key, value] of Object.entries(BottFileType)) {
    if (resultType === value) {
      name += `.${key.toLowerCase()}`;
      break;
    }
  }

  path += `/${name}`;

  writeData(resultData, path);

  // 4. return BottFile
  return {
    id: crypto.randomUUID(),
    path,
    type: resultType,
    data: resultData,
  };
};
