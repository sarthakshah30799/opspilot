import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration.js';
import { validateEnv } from './config/env.validation.js';
import { DataPackModule } from './data-pack/data-pack.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { RetrievalModule } from './retrieval/retrieval.module.js';
import { ToolsModule } from './tools/tools.module.js';
import { ConversationModule } from './conversation/conversation.module.js';
import { AiModule } from './ai/ai.module.js';
import { IncidentsModule } from './incidents/incidents.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    DataPackModule,
    TenantModule,
    RetrievalModule,
    ToolsModule,
    ConversationModule,
    AiModule,
    IncidentsModule,
  ],
})
export class AppModule {}
