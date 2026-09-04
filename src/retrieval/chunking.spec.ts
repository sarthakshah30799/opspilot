import { chunkRunbookByHeadings } from './chunking.js';

describe('chunkRunbookByHeadings', () => {
  it('splits on markdown headings and keeps metadata', () => {
    const docs = chunkRunbookByHeadings({
      tenantId: '550e8400-e29b-41d4-a716-446655440001',
      documentId: 'payments-v2',
      fileName: 'payments-v2.md',
      stem: 'payments',
      version: 2,
      active: true,
      content: `# Title\n\nIntro text\n\n## Rollback Criteria\n\nNeeds approval.\n\n## Notes\n\nMarker\n`,
    });

    expect(docs.length).toBeGreaterThanOrEqual(2);
    expect(docs.some((d) => d.metadata.section === 'Rollback Criteria')).toBe(
      true,
    );
    expect(
      docs.every(
        (d) => d.metadata.tenantId === '550e8400-e29b-41d4-a716-446655440001',
      ),
    ).toBe(true);
    expect(docs.every((d) => d.metadata.active === true)).toBe(true);
  });
});
