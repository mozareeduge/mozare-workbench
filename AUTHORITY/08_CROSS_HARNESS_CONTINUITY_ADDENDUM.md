# P10 Authority Addendum — Cross-Harness Continuity

**Authority ID:** `MWB-PD-P10-HARNESS-2026-09-23-r1`
**Status:** frozen for `TASK-P10-04..05` and the expanded `GATE-LIVE`
**Owner-locked basis:** the owner may begin work in Codex, continue in Claude Code or Hermes, and later return to another harness without manually reconstructing state or feeling that the project has split into vendor-specific versions.

## P10-HAR-DEC-01 — One project reality, many workers

Claude Code, Codex, and Hermes are replaceable workers around one Workbench project. A harness switch must not create a new project identity, mission identity, task lineage, or acceptance history. Vendor transcripts and internal sessions are diagnostics, not the human-facing source of truth.

## P10-HAR-DEC-02 — Durable work provenance

Every run records, without hidden reasoning or raw transcript bulk:

- stable project, mission, task, task-version, and run IDs;
- harness/adapter, actual model identifier when observable, reasoning/effort class when observable, and capability-probe result;
- start/end timestamps and operator/agent role;
- input context-pack/snapshot refs and authority/oracle refs;
- candidate identity before/after, changed paths/artifacts, observed verification, decisions, blockers, remaining work, and next action;
- the structured handoff and any superseded/parked relationship.

Unknown facts remain `unknown`; Workbench never invents model, effort, test, or completion evidence.

## P10-HAR-DEC-03 — Versioned tasks and safe parking

A work item has a stable ID and immutable versions. A new version names the version it supersedes and why. `queued`, `active`, `blocked`, `parked`, `completed`, and `superseded` remain distinguishable. Returning work resolves the latest non-superseded version deterministically; stale handoffs cannot overwrite newer accepted state.

## P10-HAR-DEC-04 — Harness switch behavior

When a mission stops or changes harness, Workbench produces a bounded continuation packet from canonical state, the latest valid work record, unresolved dependencies, and exact evidence refs. The receiving harness re-checks mutable facts and continues the same mission/task version or explicitly creates a successor version. The owner is not asked to copy prompts, logs, or status summaries.

## P10-HAR-DEC-05 — Context and model economy

Common deterministic operations use no model. Bounded implementation normally uses a balanced coding model/effort. Security, architecture ambiguity, or repeated gate failure escalates to stronger reasoning. Independent final QA uses a fresh strong context. Each adapter maps this common route to an available vendor model and records the actual route.

Native context compaction may preserve an in-harness session, but cross-harness continuity never depends on opaque compacted context. At task or harness boundaries, durable structured state, IDs, refs, candidate identity, evidence, remaining work, and next action are written before transfer.

## P10-HAR-DEC-06 — Calm human presentation

Harness provenance is visible where it helps judgment, not as a new dashboard surface:

- Focus: latest meaningful work, result, and next action;
- Flow: mission/task lineage and parked/blocked state;
- Review: exact changes, evidence, harness/model provenance, and stale/conflict warnings;
- Output: artifact provenance;
- Mission sheet: choose an available agent or continue with another while preserving mission identity.

Default views speak in product/system language. Raw logs, command streams, and transcript chronology stay behind progressive disclosure.

## P10-HAR-DEC-07 — Owner-ready gate

`OWNER_TEST_READY` requires observed continuation across all three installed harnesses. Each must accept the common bounded mission contract, produce a valid structured handoff, and leave a truthful durable record. If a harness is unavailable or its safe capability probe fails, the candidate is not three-harness-ready; the work remains safely parked and the exact setup/blocker is shown.
