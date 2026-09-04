# Decisions

## 1. Per-tenant MemoryVectorStore (NestJS / data access)

**Decision:** Maintain `Map<tenantId, MemoryVectorStore>` and only search the store for the request tenant.

**Alternatives considered:**
- Single global store with metadata filter filter
- Prompt-only instruction (“only use tenant X”)

**Reason for the choice:** Assignment requires isolation in application logic. Separate stores make cross-tenant leakage structurally harder and easier to test.

**Known trade-off:** Slightly higher memory use; indexing logic must loop tenants at startup.

## 2. Deterministic hybrid chain instead of an agent (LangChain)

**Decision:** Fixed pipeline: retrieve → bounded tools → one chat completion → Zod validate.

**Alternatives considered:**
- ReAct / tool-calling agent with a free loop
- Pure retrieval-only chain with no tools

**Reason for the choice:** Matches the problem (fixture tools + clear audit needs), avoids unbounded loops, and is simpler to defend in a live review.

**Known trade-off:** Tool selection uses keyword heuristics; unusual phrasings might skip tools (safe degradation: missing info / lower confidence).

## 3. Application-enforced human approval map

**Decision:** After model output, overwrite `requiresHumanApproval` when `recommendedAction` is in a consequential set.

**Alternatives considered:**
- Trust the model’s boolean
- Encode approval only in prompts / runbooks

**Reason for the choice:** Explicit assignment requirement — consequential actions must not depend on free-form model wording. Runbooks may even try to disable approval (injection fixture).

**Known trade-off:** New action types must be added to the set; unknown consequential verbs could slip through until updated.
