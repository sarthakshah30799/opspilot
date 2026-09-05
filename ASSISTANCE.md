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
- Noted that behavior is derived from the official `candidate-pack/` (`OPSPILOT-ALPHA-2026-09`) rather than hard-coded tenant thresholds

## Ownership

Every material part of this submission can be explained and modified during the follow-up review.
