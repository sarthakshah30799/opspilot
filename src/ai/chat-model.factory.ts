import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { SyntheticEmbeddings } from '@langchain/core/utils/testing';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import { DemoChatModel } from './demo-chat-model.js';

export function createChatModel(config: ConfigService): BaseChatModel {
  const demoMode = config.get<boolean>('DEMO_MODE') !== false;
  if (demoMode) {
    return new DemoChatModel({});
  }

  const apiKey = config.get<string>('LLM_API_KEY');
  if (!apiKey) {
    throw new Error(
      'LLM_API_KEY is required when DEMO_MODE=false. Set DEMO_MODE=true for local/demo runs.',
    );
  }

  return new ChatOpenAI({
    apiKey,
    model: config.get<string>('LLM_MODEL') ?? 'gpt-4o-mini',
    temperature: 0,
  });
}

export function createEmbeddings(config: ConfigService): Embeddings {
  // Always use synthetic embeddings for local/demo so indexing needs no API key.
  // When DEMO_MODE=false you may swap to OpenAIEmbeddings later.
  void config;
  return new SyntheticEmbeddings({ vectorSize: 64 });
}
