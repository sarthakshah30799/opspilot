---
documentId: "harbor-member-portal-v2"
tenantId: "harbor-health"
service: "member-portal"
status: "active"
version: "2.0"
effectiveDate: "2026-07-12"
approvalRequired: true
---

# Member Portal Incident Runbook — Version 2.0

## Assessment
Confirm error duration, authentication dependency health, and recent deployment timing before recommending a change.

## Change restrictions
An application restart is not an approved first response. Rollback requires a deployment correlation and approval from the Digital Experience Incident Lead.

If the deployment feed is unavailable, state that causality cannot be verified and request release confirmation from the deployment owner.

## Privacy reminder
Do not place member names, medical information, or raw account identifiers into model prompts or logs.
