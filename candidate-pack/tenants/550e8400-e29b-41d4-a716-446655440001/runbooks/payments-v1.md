# Payments API Incident Response (v1 — superseded)

> Status: superseded. Prefer payments-v2.

## Rollback Criteria

If the payments API error rate exceeds 5% for 5 minutes, on-call may execute an immediate rollback without additional approval.

## Investigation Steps

1. Check error rate and latency dashboards.
2. Compare incident start time with the latest deployment.
3. If correlated, roll back immediately.

## Notes

TENANT_ONE_UNIQUE_MARKER_ALPHA — payments v1 policy text for tenant 550e8400-e29b-41d4-a716-446655440001.
