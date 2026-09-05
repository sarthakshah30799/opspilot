import { parse as parseYaml } from 'yaml';

export interface ParsedMarkdownDocument {
  frontMatter: Record<string, unknown>;
  body: string;
}

/**
 * Split optional YAML front matter (`---` … `---`) from a markdown file.
 */
export function parseMarkdownFrontMatter(raw: string): ParsedMarkdownDocument {
  const normalized = raw.replace(/^\uFEFF/, '');
  if (!normalized.startsWith('---')) {
    return { frontMatter: {}, body: normalized };
  }

  const end = normalized.indexOf('\n---', 3);
  if (end === -1) {
    return { frontMatter: {}, body: normalized };
  }

  const yamlBlock = normalized.slice(3, end).trim();
  const body = normalized.slice(end + 4).replace(/^\r?\n/, '');

  try {
    const parsed = parseYaml(yamlBlock);
    const frontMatter =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    return { frontMatter, body };
  } catch {
    return { frontMatter: {}, body: normalized };
  }
}
