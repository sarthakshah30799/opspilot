# OpsPilot Candidate Data Pack

This pack accompanies the **OpsPilot: Multi-Tenant Incident Response Assistant** take-home assignment.

## Important

- All organizations, people, domains, incidents, and telemetry in this pack are fictional.
- Build behavior from the supplied data. Do not hard-code tenant names, thresholds, answers, or document identifiers.
- Load the pack at startup or through a documented setup/indexing command.
- Include the `packId` and `traceMarker` from `manifest.json` in `TRACE.md` or equivalent audit output.
- Use `manifest.json.referenceTime` as “now” in deterministic review mode.
- Tenant filtering must occur before evidence is exposed to the model.
- `tool-status.json` overrides the raw fixture files when simulating unavailable tools.
- Do not edit the fixture data to make an implementation pass.

## Suggested first steps

1. Read `manifest.json` and `SCHEMA.md`.
2. Inspect each tenant's runbook front matter.
3. Decide how active and superseded documents will be indexed and filtered.
4. Implement narrow tenant-scoped tool adapters over the JSON fixtures.
5. Use `sample-incidents.json` for local demonstrations and tests.

The sample incidents are starting points, not expected-output templates. Reviewers may use additional requests derived from the same pack.


## Pack note

This pack contains two tenants that both operate a service named `payments-api`. They also both contain a deployment with ID `deploy-100`, but the associated records and policies are different.
