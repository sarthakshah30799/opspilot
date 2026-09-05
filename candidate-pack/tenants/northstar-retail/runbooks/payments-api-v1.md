---
documentId: "northstar-payments-v1"
tenantId: "northstar-retail"
service: "payments-api"
status: "superseded"
version: "1.4"
effectiveDate: "2025-11-15"
supersededBy: "northstar-payments-v2"
approvalRequired: false
---

# Payments API Incident Runbook — Version 1.4

## Detection
Treat checkout HTTP 5xx errors above 5% for five minutes as a rollback condition when a deployment occurred in the prior hour.

## Rollback procedure
The primary on-call engineer may immediately roll back the most recent release without separate approval.

## Communication
Notify the incident channel after beginning the rollback.

> This runbook is superseded and must not be used for current incident decisions.
