import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CHAT_MODEL } from '../common/tokens.js';
import { DataPackModule } from '../data-pack/data-pack.module.js';
import { RetrievalModule } from '../retrieval/retrieval.module.js';
import { ToolsModule } from '../tools/tools.module.js';
import { ConversationModule } from '../conversation/conversation.module.js';
import { createChatModel } from './chat-model.factory.js';
import { IncidentOrchestrator } from './incident-orchestrator.service.js';
import { ApprovalEnforcer } from './approval.enforcer.js';

@Module({
  imports: [
    ConfigModule,
    DataPackModule,
    RetrievalModule,
    ToolsModule,
    ConversationModule,
  ],
  providers: [
    {
      provide: CHAT_MODEL,
      useFactory: (config: ConfigService) => createChatModel(config),
      inject: [ConfigService],
    },
    ApprovalEnforcer,
    IncidentOrchestrator,
  ],
  exports: [IncidentOrchestrator, CHAT_MODEL, ApprovalEnforcer],
})
export class AiModule {}
