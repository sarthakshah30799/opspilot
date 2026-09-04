import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { DataPackService } from '../data-pack/data-pack.service.js';
import { EMBEDDINGS } from '../common/tokens.js';
import { chunkRunbookByHeadings, type ChunkMetadata } from './chunking.js';

export interface RetrievedChunk {
  content: string;
  metadata: ChunkMetadata;
  score?: number;
}

@Injectable()
export class RetrievalService implements OnModuleInit {
  private readonly logger = new Logger(RetrievalService.name);
  /** Structurally isolated: one vector store per tenant. */
  private readonly stores = new Map<string, MemoryVectorStore>();

  constructor(
    private readonly dataPack: DataPackService,
    @Inject(EMBEDDINGS) private readonly embeddings: Embeddings,
  ) {}

  async onModuleInit() {
    for (const tenantId of this.dataPack.listTenantIds()) {
      await this.indexTenant(tenantId);
    }
  }

  private async indexTenant(tenantId: string) {
    const docs: Document[] = [];
    for (const runbook of this.dataPack.getAllRunbooks(tenantId)) {
      docs.push(...chunkRunbookByHeadings(runbook));
    }
    const store = await MemoryVectorStore.fromDocuments(
      docs,
      this.embeddings,
    );
    this.stores.set(tenantId, store);
    this.logger.log(
      `Indexed ${docs.length} chunks for tenant ${tenantId} (isolated store)`,
    );
  }

  /**
   * Retrieve only from the requesting tenant's store.
   * By default only returns chunks from active documents.
   */
  async retrieve(
    tenantId: string,
    query: string,
    options?: { k?: number; activeOnly?: boolean },
  ): Promise<RetrievedChunk[]> {
    this.dataPack.assertTenant(tenantId);
    const store = this.stores.get(tenantId);
    if (!store) {
      return [];
    }

    const k = options?.k ?? 4;
    const activeOnly = options?.activeOnly ?? true;
    const results = await store.similaritySearchWithScore(query, k * 3);

    const filtered = results
      .map(([doc, score]) => ({
        content: doc.pageContent,
        metadata: doc.metadata as ChunkMetadata,
        score,
      }))
      .filter((chunk) => {
        if (chunk.metadata.tenantId !== tenantId) {
          return false;
        }
        if (activeOnly && !chunk.metadata.active) {
          return false;
        }
        return true;
      })
      .slice(0, k);

    return filtered;
  }
}
