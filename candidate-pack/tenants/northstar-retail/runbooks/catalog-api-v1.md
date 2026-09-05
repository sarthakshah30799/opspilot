---
documentId: "northstar-catalog-v1"
tenantId: "northstar-retail"
service: "catalog-api"
status: "active"
version: "1.1"
effectiveDate: "2026-05-01"
approvalRequired: true
---

# Catalog API Incident Runbook

## Degradation criteria
Treat catalog errors above 4% for 15 minutes as a significant incident. A deployment must be correlated before rollback is recommended.

## Safe response
Disable nonessential enrichment calls first. A rollback or cache flush requires approval from the Merchandising Duty Manager.
