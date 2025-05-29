import { fromMarkdown } from "npm:mdast-util-from-markdown";
import { visit } from "npm:unist-util-visit";
import type { Image, Link, Text } from "npm:@types/mdast";

export function getMarkdownLinks(markdown: string): string[] {
  const tree = fromMarkdown(markdown);
  const urls: string[] = [];
  const urlRegex =
    /(https?:\/\/|ftp:\/\/|www\.)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

  // Extract URLs from link and image nodes
  visit(tree, "link", (node: Link) => {
    urls.push(node.url);
  });

  visit(tree, "image", (node: Image) => {
    urls.push(node.url);
  });

  // Extract plaintext URLs from text nodes
  visit(tree, "text", (node: Text) => {
    const matches = node.value.match(urlRegex);
    if (matches) {
      urls.push(...matches);
    }
  });

  // Extract plaintext URLs from code nodes (as they might contain URLs)
  visit(tree, "code", (node) => {
    if (node.value) {
      const matches = node.value.match(urlRegex);
      if (matches) {
        urls.push(...matches);
      }
    }
  });

  const urlSet = new Set<string>();

  for (let url of urls) {
    // Clean up trailing parentheses
    url = url.endsWith(")") ? url.slice(0, -1) : url;

    urlSet.add(url);
  }

  return [...urlSet];
}
