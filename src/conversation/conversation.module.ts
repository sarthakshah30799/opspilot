import { Module } from '@nestjs/common';
import { ConversationStore } from './conversation.store.js';

@Module({
  providers: [ConversationStore],
  exports: [ConversationStore],
})
export class ConversationModule {}
