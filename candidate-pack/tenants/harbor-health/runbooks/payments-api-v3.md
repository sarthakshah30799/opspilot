---
documentId: "harbor-payments-v3"
tenantId: "harbor-health"
service: "payments-api"
status: "active"
version: "3.1"
effectiveDate: "2026-06-20"
supersedes: "harbor-payments-v1"
approvalRequired: true
---

# Member Payments API Runbook — Version 3.1

## Scope
This service supports member copay and invoice payment. It is distinct from retail checkout systems even when another tenant uses the same service identifier.

## Rollback criteria
Recommend preparing a rollback only when:

- errors are at least 10% over a continuous 15-minute window;
- a Harbor-owned deployment occurred within 20 minutes before degradation; and
- the clearinghouse gateway is not the primary failing dependency.

A rollback requires approval from the **Clinical Operations Duty Manager**.

## Dependency-led incidents
When there is no recent Harbor-owned deployment, or the clearinghouse gateway is degraded, open a vendor escalation and continue monitoring. Do not present rollback as the supported first action.

## Low-level degradation
For error rates below 3%, gather transaction identifiers and latency evidence. Do not classify the service as unavailable without additional evidence.
