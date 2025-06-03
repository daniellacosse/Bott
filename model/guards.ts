import {
  type BottInputFile,
  BottInputFileType,
  type BottOutputFile,
  BottOutputFileType,
} from "./types.ts";

export const isBottInputFile = (obj: unknown): obj is BottInputFile => {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const inputFile = obj as BottInputFile;

  if (
    !(inputFile.url instanceof URL) ||
    !(inputFile.data instanceof Uint8Array) ||
    typeof inputFile.path !== "string" ||
    !Object.values(BottInputFileType).includes(inputFile.type)
  ) {
    return false;
  }

  return true;
};

export const isBottOutputFile = (obj: unknown): obj is BottOutputFile => {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const outputFile = obj as BottOutputFile;

  if (
    typeof outputFile.id !== "string" ||
    !(outputFile.data instanceof Uint8Array) ||
    typeof outputFile.path !== "string" ||
    !Object.values(BottOutputFileType).includes(outputFile.type)
  ) {
    return false;
  }

  return true;
};
