# TRACE — end-to-end request

**Data pack:** `pack-fallback-2026-09-a1` (structural fallback until official candidate pack is provided)

## Input

```http
POST /api/v1/tenants/550e8400-e29b-41d4-a716-446655440001/incidents/incident-123/analyze
```

```json
{
  "message": "The payments API started returning 502 errors shortly after today's deployment. This is affecting checkout for multiple users.",
  "severity": "P1",
  "service": "payments-api"
}
```

## Tenant

`550e8400-e29b-41d4-a716-446655440001` (UUID v4 validated via `TenantGuard` / `ParseUUIDPipe`, then resolved against the data pack).

## Retrieval

Query roughly: `payments-api` + incident message.

Typical active chunks (document ids):

- `payments-v2` — section **Rollback Criteria** (active)
- `payments-v2` — **Investigation Steps** / related sections
- Possibly `incident-escalation` contact guidance

Superseded `payments-v1` (immediate rollback without approval) is **not** returned when `activeOnly=true`.

## Tools called

| Tool | Status | Notes |
|------|--------|-------|
| `get_service_health` | success | `payments-api` degraded, errorRate `8.4` |
| `get_recent_deployments` | success | latest `1.14.2` at `2026-08-31T14:00:00Z` |

Tools were selected because the message matched deployment/error keywords. Tenant id bound to `550e8400-e29b-41d4-a716-446655440001` only.

## Intermediate decisions

1. Evidence treated as untrusted; injection paragraph in `payments-v2` ignored for control flow.
2. Demo model matched deployment/502 pattern → `prepare_rollback`.
3. Model may emit `requiresHumanApproval: false`; **ApprovalEnforcer** sets it to `true` because `prepare_rollback` is consequential.
4. Response `tenantId` / `dataPackVersion` taken from request + manifest, not from the model.

## Final output (shape)

- `tenantId`: `550e8400-e29b-41d4-a716-446655440001`
- `recommendedAction`: `prepare_rollback`
- `requiresHumanApproval`: `true`
- `confidence`: ~0.84
- `citations`: includes `payments-v2` / Rollback Criteria
- `toolsUsed`: both tools `success`
- `dataPackVersion`: `pack-fallback-2026-09-a1`

## Limitation noticed

Synthetic embeddings + demo keyword routing are good enough for the take-home, but retrieval ranking is weaker than a real embedding model. After swapping in the official candidate pack, re-check that the intended active sections still surface in top-k for the evaluation scenarios.
