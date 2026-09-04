import { Injectable } from '@nestjs/common';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

@Injectable()
export class ConversationStore {
  private readonly store = new Map<string, ConversationTurn[]>();
  private readonly maxTurns = 20;

  private key(tenantId: string, conversationId: string): string {
    return `${tenantId}::${conversationId}`;
  }

  get(tenantId: string, conversationId: string): ConversationTurn[] {
    return [...(this.store.get(this.key(tenantId, conversationId)) ?? [])];
  }

  append(
    tenantId: string,
    conversationId: string,
    turn: ConversationTurn,
  ): void {
    const key = this.key(tenantId, conversationId);
    const existing = this.store.get(key) ?? [];
    existing.push(turn);
    while (existing.length > this.maxTurns) {
      existing.shift();
    }
    this.store.set(key, existing);
  }

  clear(tenantId: string, conversationId: string): void {
    this.store.delete(this.key(tenantId, conversationId));
  }

  /** Test helper: expose whether another tenant can see this conversation. */
  has(tenantId: string, conversationId: string): boolean {
    return this.store.has(this.key(tenantId, conversationId));
  }
}
