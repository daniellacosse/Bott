import { resolve } from "jsr:@std/path/resolve";

const FILE_SYSTEM_ROOT = Deno.env.get("FILE_SYSTEM_ROOT") ?? "output";
const FILE_SYSTEM_GENERATED_PATH = `${FILE_SYSTEM_ROOT}/generated`;

/**
 * Generates a simple filename from a description string.
 * Replaces spaces with hyphens and truncates to a maximum length.
 * Appends a random number to help ensure uniqueness.
 * @param description The description string to convert into a filename.
 * @param maxLength The maximum length of the file name.
 * @returns The computed filename.
 */
export const getFileNameFromDescription = (
  description: string,
  maxLength: number = 20,
) => {
  const nonce = Math.floor(Math.random() * 10000);

  return description
    .replaceAll(/\s+/g, "-")
    .slice(0, maxLength - nonce.toString().length - 1) + "-" + nonce;
};

/**
 * Creates an absolute file URL for a generated file.
 * @param filename The name of the file (e.g., "my-image.png").
 * @returns A URL object pointing to the file within the designated generated files directory.
 */
export function getGeneratedFileUrl(filename: string): URL {
  const absoluteGeneratedPath = resolve(FILE_SYSTEM_GENERATED_PATH);
  const subfolder = filename.split(".")[1];
  const baseUrlString = `file://${absoluteGeneratedPath}/${subfolder}/`;
  return new URL(filename, baseUrlString);
}
