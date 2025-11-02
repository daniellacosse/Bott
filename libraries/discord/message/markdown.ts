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

import { fromMarkdown } from "mdast-util-from-markdown";
import { visit } from "unist-util-visit";
import type { Code, Image, InlineCode, Link, Text } from "@types/mdast";

export function getMarkdownLinks(markdown: string): string[] {
  const tree = fromMarkdown(markdown);
  const urls: string[] = [];
  // Regex to find URLs:
  // - Protocol (http, https, ftp) or www.
  // - Domain name
  // - TLD (2-6 chars)
  // - Optional path, query, fragment that ends with a "strong" URL character (alphanumeric, /, #, ~, &, =)
  // - Followed by a common delimiter (space, <, >, (, ), [, ], {, }) or end of string.
  const urlRegex =
    /(https?:\/\/|ftp:\/\/|www\.)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9]{2,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*[a-zA-Z0-9\/#~&=])??(?=[\s<>()\[\]{}.]|$)/gi;

  visit(tree, "link", (node: Link) => urls.push(node.url));
  visit(tree, "image", (node: Image) => urls.push(node.url));

  const _pushMatches = (node: Text | Code | InlineCode) => {
    if (!node.value) return;

    const matches = node.value.match(urlRegex);
    if (matches) {
      urls.push(...matches);
    }
  };

  visit(tree, "text", _pushMatches);
  visit(tree, "code", _pushMatches);
  visit(tree, "inlineCode", _pushMatches);

  const urlSet = new Set<string>();

  for (const url of urls) {
    urlSet.add(url);
  }

  return [...urlSet];
}
