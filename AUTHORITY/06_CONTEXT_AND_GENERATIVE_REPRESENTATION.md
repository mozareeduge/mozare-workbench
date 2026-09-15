# 06 — Context Economy + Generative Representation Authority

**Snapshot:** `MWB-PD-2026-09-15-r3`  
**Status:** CLOSED

## Purpose

This document makes token/context efficiency and adaptive interface generation concrete product behavior. It is binding together with `00..05` and is intentionally stricter than a generic instruction to “be concise.”

## A. Mission context contract

Every model/agent call with project context goes through `ContextCompiler`. Directly concatenating project files/chat history into a prompt is a defect unless the operation is explicitly source-level/FULL and the compiler records that escalation.

A compiled packet contains, in order:

1. mission ID + objective + actor/role;
2. authority snapshot IDs;
3. current snapshot/delta identity;
4. critical accepted decisions/horizon constraints;
5. task-local object/relation records at L1/L2;
6. acceptance/oracle/protected-neighbor references;
7. relevant source/evidence capsules or exact excerpts;
8. relevant file/module refs for implementation;
9. allowed expansion handles;
10. output schema + budget.

Packets do **not** include raw chat transcripts, unrelated project histories, whole Wiki/repository dumps, duplicated records, or raw logs unless explicitly expanded.

## B. Four context resolutions

| Level | Meaning | Typical size | Use |
|---|---|---:|---|
| L0 | ID/handle | 2–10 tokens | references/dependencies |
| L1 | one-line compact meaning | 15–45 | scanning/orientation |
| L2 | working record: rationale, consequences, key evidence refs | 80–300 | ordinary reasoning |
| L3 | full authoritative record/source | unbounded/batched | dispute, source interpretation, systemic claim |

The actual tokenizer is adapter-specific; sizes are targets, not fake precision.

## C. Evidence capsule rules

Capsules follow Mozare Wiki controller principles where applicable: unchanged/hash-bound previously fully read material can be compacted; first read of genuinely new source cannot be replaced by a capsule; source/authority/parser/systemic-impact triggers invalidate/reopen. The Workbench does not declare source-level completeness merely because retrieval surfaced representative chunks.

## D. Context budgets and escalation

Defaults live in `CONTEXT/context-policy.yaml`; implementation must enforce them before process launch. When `hard_tokens` would be exceeded:

1. deduplicate identical refs;
2. downgrade non-critical L2 → L1/L0;
3. replace repeat source text with capsule/excerpt IDs;
4. keep authority/acceptance/protected-neighbor material;
5. if still insufficient, escalate tier/batch with explicit reason;
6. never silently truncate a required source, oracle or decision.

## E. Model-call avoidance hierarchy

```text
0. deterministic state/query/render
1. cached derived result
2. LIGHT model on bounded packet
3. STRONG model on evidence packet
4. source-level/batched STRONG work only when required
```

The route is recorded. Model routing must be quality-tested, not cost-only.

## F. Output economy

Agent handoffs conform to `config/handoff.schema.json` plus context metrics. Repetition is removed:

- state changes are IDs/structured values;
- files/artifacts are references;
- test output is result + evidence pointer, not copied logs;
- rationale is included only when a decision/uncertainty requires it;
- technical explanation is generated on request from structured SystemLadder data.

## G. Adaptive representation

The fixed shell is stable. `RepresentationPlanner` first attempts STATIC/DETERMINISTIC output. OpenUI is allowed only if one of these is true:

- user explicitly asks for another representation (`compare`, `map`, `system`, `decide`);
- multiple heterogeneous records need an adaptive layout not covered by fixed components;
- a bounded synthesis benefits from interactive drill-down/actions;
- the planner's deterministic confidence is below configured threshold and generative composition is lower-cost than forcing prose/manual reconstruction.

OpenUI receives one micro-library and one UI context packet. Generated components are validated. Unknown action/component = reject + fallback.

## H. Human output contract

Default completion view must let the user answer, at a glance:

- What changed?
- What does it mean at system/project level?
- What is verified vs claimed/unverified?
- Does anything need my judgment?
- What can I do next?

It should not force reading implementation narration to answer these questions.

## I. Quality-preserving efficiency metrics

Measure per run and aggregate per project:

- compiled context token estimate / provider-reported input tokens;
- output tokens;
- cache hit count/rate;
- expansions and escalation tier;
- duplicate-context ratio;
- task completion/QA verdict;
- re-entry time and human comprehension/overload pilot measures.

Optimization is accepted only when quality/verification does not regress.
