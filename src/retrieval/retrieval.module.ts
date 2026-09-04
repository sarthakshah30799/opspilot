import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EMBEDDINGS } from '../common/tokens.js';
import { DataPackModule } from '../data-pack/data-pack.module.js';
import { createEmbeddings } from '../ai/chat-model.factory.js';
import { RetrievalService } from './retrieval.service.js';

@Module({
  imports: [ConfigModule, DataPackModule],
  providers: [
    {
      provide: EMBEDDINGS,
      useFactory: (config: ConfigService) => createEmbeddings(config),
      inject: [ConfigService],
    },
    RetrievalService,
  ],
  exports: [RetrievalService, EMBEDDINGS],
})
export class RetrievalModule {}
