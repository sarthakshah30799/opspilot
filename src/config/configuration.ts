export default () => ({
  DEMO_MODE: process.env.DEMO_MODE !== 'false',
  LLM_API_KEY: process.env.LLM_API_KEY ?? '',
  LLM_MODEL: process.env.LLM_MODEL ?? 'gpt-4o-mini',
  DATA_PACK_PATH: process.env.DATA_PACK_PATH ?? './candidate-pack',
  PORT: process.env.PORT ?? '3000',
});
