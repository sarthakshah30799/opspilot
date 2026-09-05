# OpsPilot

Multi-tenant incident-response recommendation API built with NestJS + LangChain.js.

OpsPilot **recommends** actions only. It never restarts services, rolls back deployments, closes incidents, or contacts customers.

## Setup

```bash
pnpm install
cp .env.example .env
pnpm run start:dev
```

Default env uses **`DEMO_MODE=true`** — no LLM API key required.

### Environment

| Variable | Purpose |
|----------|---------|
| `DEMO_MODE` | `true` (default) uses deterministic fake model; `false` uses OpenAI via LangChain |
| `LLM_API_KEY` | Required only when `DEMO_MODE=false` |
| `LLM_MODEL` | Model name when not in demo mode (default `gpt-4o-mini`) |
| `DATA_PACK_PATH` | Path to candidate pack (default `./candidate-pack`) |
| `PORT` | HTTP port (default `3000`) |

## Candidate data pack

This repo is wired for the official pack under [`candidate-pack/`](candidate-pack/):

- Pack: `OPSPILOT-ALPHA-2026-09` (`traceMarker`: `ALPHA-9C7F-RETAIL-HEALTH`)
- Tenants: `northstar-retail`, `harbor-health`
- Shared service name `payments-api` with different policies/telemetry per tenant
- Runbook YAML front matter drives `documentId`, `status` (active vs superseded)
- `tool-status.json` can force tool timeouts/unavailable responses
- Use `manifest.referenceTime` as “now” in deterministic demo mode
- See pack `START_HERE.md`, `SCHEMA.md`, and `sample-incidents.json`

Application logic reads fixtures at runtime — it does not hard-code tenant thresholds.

### How “active” runbooks are chosen

1. Prefer YAML front matter `status: active` (official pack).
2. Otherwise fall back to `manifest.activeDocuments` or highest `*-vN` filename.

## API

```http
POST /api/v1/tenants/:tenantId/incidents/:conversationId/analyze
Content-Type: application/json
```

Example (sample incident `alpha-01`):

```bash
curl -s -X POST http://localhost:3000/api/v1/tenants/northstar-retail/incidents/alpha-conv-01/analyze \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Checkout began returning 502 responses shortly after today'\''s payments release. Multiple customers cannot complete orders. Should we roll back?",
    "severity": "P1",
    "service": "payments-api"
  }'
```

Follow-up (same `conversationId`):

```bash
curl -s -X POST http://localhost:3000/api/v1/tenants/northstar-retail/incidents/alpha-conv-01/analyze \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "The error rate has now stayed below 2% for ten minutes. Does that change your recommendation?",
    "severity": "P1",
    "service": "payments-api"
  }'
```

## Tests

```bash
pnpm test        # unit + integration (DEMO_MODE)
pnpm test:e2e    # HTTP e2e
```

Covered: pack loading/front matter, tenant isolation, tool-status timeout, structured-output safe fallback, API happy path.

## Known limitations

- Demo model uses keyword patterns — real LLM path is wired but not exercised by default.
- Conversation memory is in-process only (lost on restart; not shared across instances).
- Embeddings use `SyntheticEmbeddings` (no external embedding API).
- Only two tools implemented: `get_service_health`, `get_recent_deployments` (contacts/SLA fixtures are loadable later).
- Citation filtering allows documentId match even if section title differs slightly.

## Assumptions

- `tenantId` must match a folder under `candidate-pack/tenants/` (e.g. `northstar-retail`).
- Severity enum accepted: `P1`–`P4`.
- Consequential actions always require human approval in code: `rollback`, `prepare_rollback`, `restart_service`, `contact_customer`, `close_incident`, `change_severity`, `execute_rollback`.
- Response includes `packId`, `traceMarker`, and `dataPackVersion` (set to `packId`).
- Nest POST analyze returns HTTP 200 (explicit `@HttpCode(200)`).

See also: [ARCHITECTURE.md](ARCHITECTURE.md), [DECISIONS.md](DECISIONS.md), [TRACE.md](TRACE.md), [ASSISTANCE.md](ASSISTANCE.md).
