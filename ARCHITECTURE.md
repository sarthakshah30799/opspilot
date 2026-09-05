# Architecture

## Module structure

| Module | Role |
|--------|------|
| `DataPackModule` | Loads `manifest.json` + tenant fixtures at startup |
| `TenantModule` | `TenantGuard` rejects unknown tenants from the URL |
| `RetrievalModule` | Heading-based chunking + **per-tenant** `MemoryVectorStore` |
| `ToolsModule` | Tenant-bound fixture tools with Zod input schemas |
| `ConversationModule` | In-memory history keyed by `tenantId::conversationId` |
| `AiModule` | `CHAT_MODEL` DI token, orchestrator, approval enforcer |
| `IncidentsModule` | Thin controller + service calling the orchestrator |

Controllers stay thin: HTTP concerns only. `IncidentOrchestrator` is transport-agnostic and could be called from a queue consumer.

```
Request → TenantGuard → IncidentsService → IncidentOrchestrator
                              ├─ ConversationStore (tenant-scoped)
                              ├─ RetrievalService (tenant store only)
                              ├─ OpsToolsService (bound tenantId)
                              ├─ CHAT_MODEL (Demo | OpenAI)
                              └─ ApprovalEnforcer (post-model)
```

## Agent vs chain

**Choice: deterministic hybrid chain** (not an autonomous agent).

Flow: retrieve active chunks → optionally call up to two tools by keyword relevance → single structured generation → Zod validate → approval override → persist memory.

**Why:** incident recommendation needs bounded latency, predictable tool use, and auditability. An open-ended tool-calling agent adds loop/cost risk for little benefit on fixture-backed data.

**Trade-offs:** less flexible for novel tool sequences; relevance rules are heuristic. Prefer a bounded agent later if tool catalog grows and routing becomes hard to maintain.

## Retrieval and tenant filtering

- Runbooks are chunked on `#` / `##` / `###` headings with metadata: `tenantId`, `documentId`, `version`, `active`, `section`, `stem`.
- YAML front matter supplies official `documentId` and `status` (`active` / `superseded` / `draft`).
- Each tenant gets its **own** `MemoryVectorStore`. There is no shared index queried with a prompt filter.
- Default retrieval returns **active** documents only (superseded versions stay indexed for diagnostics but are filtered out).
- Active selection: front matter `status: active` first; otherwise `manifest.activeDocuments` / highest `-vN`.
- Tools honor `tool-status.json` overrides before reading fixture JSON (timeout/unavailable → structured error).
- Responses include `packId` and `traceMarker` from `manifest.json`. Prompt receives `referenceTime` for deterministic “now”.

Retrieval quality (future): gold-question set per tenant, recall@k on section titles, and regression tests for superseded leakage.

## Tools

- `get_service_health(tenantId, service)`
- `get_recent_deployments(tenantId, service)`

Orchestrator injects the **request** `tenantId`. Cross-tenant arguments return `tenant_mismatch` without reading data. Missing fixtures return structured errors (request continues).

## Structured output

Model JSON is parsed with Zod (`ModelIncidentOutputSchema`). Failures return HTTP 200 safe fallback: `requiresHumanApproval: true`, `confidence: 0`, empty citations, explanation in `missingInformation`. Final response fields `tenantId` / `conversationId` / `dataPackVersion` are set in application code.

## Human approval

`ApprovalEnforcer` forces `requiresHumanApproval: true` for consequential action types regardless of model output.

## Untrusted document content

- System prompt states evidence is data, not instructions.
- Evidence wrapped in explicit `UNTRUSTED EVIDENCE` delimiters.
- Isolation/approval/citation rules enforced in Nest code after the model.
- Limitation: prompt wrapping is not a complete prompt-injection defense; structural isolation is the hard control.

## Conversation memory

In-memory map for the take-home. Production would use Redis/DB with TTL, tenant encryption, per-instance sticky sessions or shared store, summarization for context-window limits, and redaction of secrets.

## Production improvements

- Real embeddings + eval harness for retrieval
- Timeouts/circuit breakers around model and tools
- Persistent conversation store
- Structured audit log of retrieved doc ids and tool payloads
- Replace fallback pack with official candidate pack when issued
