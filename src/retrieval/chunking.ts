import { Document } from '@langchain/core/documents';
import type { RunbookDocument } from '../data-pack/types.js';

export interface ChunkMetadata {
  tenantId: string;
  documentId: string;
  version: number | null;
  active: boolean;
  section: string;
  stem: string;
}

/**
 * Split markdown runbooks on heading boundaries (## / ### / #).
 */
export function chunkRunbookByHeadings(runbook: RunbookDocument): Document[] {
  const lines = runbook.content.split(/\r?\n/);
  const sections: { title: string; body: string[] }[] = [];
  let current = { title: 'Introduction', body: [] as string[] };

  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      if (current.body.some((l) => l.trim().length > 0)) {
        sections.push(current);
      }
      current = { title: heading[2].trim(), body: [] };
    } else {
      current.body.push(line);
    }
  }
  if (current.body.some((l) => l.trim().length > 0) || sections.length === 0) {
    sections.push(current);
  }

  const docs: Document[] = [];
  for (const section of sections) {
    const pageContent = `${section.title}\n${section.body.join('\n')}`.trim();
    if (!pageContent) {
      continue;
    }
    docs.push(
      new Document({
        pageContent,
        metadata: {
          tenantId: runbook.tenantId,
          documentId: runbook.documentId,
          version: runbook.version,
          active: runbook.active,
          section: section.title,
          stem: runbook.stem,
        },
      }),
    );
  }
  return docs;
}
