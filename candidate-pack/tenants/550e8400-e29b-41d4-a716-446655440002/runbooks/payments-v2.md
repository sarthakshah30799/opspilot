# Payments API Incident Response (v2 — active)

## Rollback Criteria

For this tenant, payments-api rollbacks require dual approval from primary on-call and engineering manager when errorRate exceeds 4% for 15 minutes after a deployment.

## Investigation Steps

1. Inspect service health for payments-api.
2. Review recent deployments.
3. Open an approval request; do not execute rollback.

## Notes

TENANT_TWO_UNIQUE_MARKER_BETA — payments v2 active policy for tenant 550e8400-e29b-41d4-a716-446655440002. Different thresholds from the other tenant.
