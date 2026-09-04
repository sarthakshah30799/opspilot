# Assistance

## External assistance used

- Official NestJS and LangChain.js documentation
- Online references for NestJS ConfigModule, ValidationPipe, and testing patterns
- AI coding assistants for initial scaffolding, boilerplate, and documentation drafts

## What was personally verified

- Assignment requirements against the provided brief (tenant isolation, DEMO_MODE, tools, documentation checklist)
- Local verification via `pnpm run build`, `pnpm test`, and `pnpm test:e2e`
- Tenant isolation design: per-tenant vector stores, tool `tenant_mismatch` handling, conversation keying by `tenantId` + `conversationId`
- Consequential-action human-approval override enforced in application code (independent of model output)
- `candidate-pack/` is a structural fallback until the official candidate-specific pack is provided

## Ownership

Every material part of this submission can be explained and modified during the follow-up review.
