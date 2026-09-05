import { parseMarkdownFrontMatter } from './front-matter.js';

describe('parseMarkdownFrontMatter', () => {
  it('parses YAML front matter and body', () => {
    const raw = `---
documentId: "northstar-payments-v2"
status: "active"
version: "2.2"
---

# Title

Body text.
`;
    const parsed = parseMarkdownFrontMatter(raw);
    expect(parsed.frontMatter.documentId).toBe('northstar-payments-v2');
    expect(parsed.frontMatter.status).toBe('active');
    expect(parsed.body).toContain('# Title');
    expect(parsed.body).not.toContain('documentId');
  });
});
