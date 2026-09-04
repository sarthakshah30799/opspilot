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

The assignment expects a **candidate-specific** pack from the hiring team.

Until that arrives, this repo includes a **structural fallback** pack at [`candidate-pack/`](candidate-pack/) with:

- Two tenants identified by UUID v4 (production-style tenant ids):
  - `550e8400-e29b-41d4-a716-446655440001`
  - `550e8400-e29b-41d4-a716-446655440002`
- Versioned payments runbooks (v1 superseded, v2 active)
- Shared service name `payments-api` with different telemetry per tenant
- Prompt-injection-style text inside a runbook (treated as untrusted evidence)

When you receive the official pack, replace `./candidate-pack` (or point `DATA_PACK_PATH`) and restart. Application logic reads fixtures at runtime — it does not hard-code tenant thresholds. Tenant folder names must match the UUID used in the API path.

### How “active” runbooks are chosen

1. If `manifest.json` → `activeDocuments[tenantId][stem]` is set, that document id is active.
2. Otherwise, among `*-vN.md` files sharing the same stem, the highest `N` is active.
3. Unversioned files are active unless a versioned peer wins for that stem.

## API

```http
POST /api/v1/tenants/:tenantId/incidents/:conversationId/analyze
Content-Type: application/json
```

```bash
curl -s -X POST http://localhost:3000/api/v1/tenants/550e8400-e29b-41d4-a716-446655440001/incidents/incident-123/analyze \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "The payments API started returning 502 errors shortly after today'\''s deployment.",
    "severity": "P1",
    "service": "payments-api"
  }'
```

Follow-up (same `conversationId`):

```bash
curl -s -X POST http://localhost:3000/api/v1/tenants/550e8400-e29b-41d4-a716-446655440001/incidents/incident-123/analyze \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "The error rate has now dropped to 1%. Does that change the plan?",
    "severity": "P1",
    "service": "payments-api"
  }'
```
## Tests

```bash
pnpm test        # unit + integration (DEMO_MODE)
pnpm test:e2e    # HTTP e2e
```

Covered: tenant isolation (retrieval, tools, memory), structured-output safe fallback, tool scope, API happy path.

## Known limitations

- Fallback pack is not the official candidate-specific pack; swap when provided.
- Demo model uses keyword patterns — real LLM path is wired but not exercised by default.
- Conversation memory is in-process only (lost on restart; not shared across instances).
- Embeddings use `SyntheticEmbeddings` (no external embedding API).
- Only two tools implemented: `get_service_health`, `get_recent_deployments`.
- Citation filtering allows documentId match even if section title differs slightly.

## Assumptions

- `tenantId` path param must be a UUID v4; unknown UUIDs return 404.
- Severity enum accepted: `P1`–`P4`.
- Consequential actions always require human approval in code: `rollback`, `prepare_rollback`, `restart_service`, `contact_customer`, `close_incident`, `change_severity`, `execute_rollback`.
- Nest POST analyze returns HTTP 200 (explicit `@HttpCode(200)`).

See also: [ARCHITECTURE.md](ARCHITECTURE.md), [DECISIONS.md](DECISIONS.md), [TRACE.md](TRACE.md), [ASSISTANCE.md](ASSISTANCE.md).
