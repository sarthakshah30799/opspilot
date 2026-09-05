# TRACE — end-to-end request

**Data pack:** `OPSPILOT-ALPHA-2026-09`  
**Trace marker:** `ALPHA-9C7F-RETAIL-HEALTH`  
**Reference time:** `2026-09-03T14:15:00Z`

## Input

Sample incident `alpha-01-recent-release` from `sample-incidents.json`:

```http
POST /api/v1/tenants/northstar-retail/incidents/alpha-conv-01/analyze
```

```json
{
  "message": "Checkout began returning 502 responses shortly after today's payments release. Multiple customers cannot complete orders. Should we roll back?",
  "severity": "P1",
  "service": "payments-api"
}
```

## Tenant

`northstar-retail` (validated against pack tenant folders / manifest).

## Retrieval

Query: `payments-api` + incident message. Active-only filter applied.

Retrieved active document ids (from runbook front matter):

- `northstar-payments-v2` (status `active`) — rollback / evidence sections
- Possibly `northstar-escalation` contact guidance

Superseded `northstar-payments-v1` is not used when `activeOnly=true`.

## Tools called

| Tool | Status | Notes |
|------|--------|-------|
| `get_service_health` | success | `payments-api` degraded, `errorRatePercent` `8.6` |
| `get_recent_deployments` | success | latest `4.18.0` / `deploy-100` at `2026-09-03T13:55:00Z` |

Tenant id bound to `northstar-retail` only. Harbor fixtures are never read.

## Intermediate decisions

1. Evidence treated as untrusted; any instructional-looking runbook text ignored for control flow.
2. Demo model matched release/502 pattern → `prepare_rollback`.
3. Model may emit `requiresHumanApproval: false`; **ApprovalEnforcer** sets it to `true` because `prepare_rollback` is consequential.
4. Response `tenantId`, `packId`, `traceMarker`, and `dataPackVersion` come from the request + manifest, not the model.
5. `referenceTime` from the manifest is passed into the prompt as deterministic “now”.

## Final output (shape)

- `tenantId`: `northstar-retail`
- `packId`: `OPSPILOT-ALPHA-2026-09`
- `traceMarker`: `ALPHA-9C7F-RETAIL-HEALTH`
- `recommendedAction`: `prepare_rollback`
- `requiresHumanApproval`: `true`
- `confidence`: ~0.84
- `citations`: includes `northstar-payments-v2`
- `toolsUsed`: both tools `success`

## Related pack check — tool failure

For Harbor `member-portal`, `tool-status.json` marks `get_recent_deployments` as `DEPLOYMENT_FEED_TIMEOUT`. The tool returns `timeout` and does not expose raw deployment fixture rows for that service.

## Limitation noticed

Synthetic embeddings + demo keyword routing are good enough for deterministic review, but retrieval ranking is weaker than a production embedding model. Re-check top-k sections if the live model path is enabled later.
