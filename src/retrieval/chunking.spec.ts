import { chunkRunbookByHeadings } from './chunking.js';

describe('chunkRunbookByHeadings', () => {
  it('splits on markdown headings and keeps metadata', () => {
    const docs = chunkRunbookByHeadings({
      tenantId: 'northstar-retail',
      documentId: 'northstar-payments-v2',
      fileName: 'payments-api-v2.md',
      stem: 'payments-api',
      version: 2.2,
      active: true,
      status: 'active',
      content: `# Title\n\nIntro text\n\n## Rollback criteria\n\nNeeds approval.\n\n## Notes\n\nMarker\n`,
      frontMatter: {
        documentId: 'northstar-payments-v2',
        status: 'active',
      },
    });

    expect(docs.length).toBeGreaterThanOrEqual(2);
    expect(docs.some((d) => d.metadata.section === 'Rollback criteria')).toBe(
      true,
    );
    expect(
      docs.every((d) => d.metadata.tenantId === 'northstar-retail'),
    ).toBe(true);
  });
});
