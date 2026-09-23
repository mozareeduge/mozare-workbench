# P10 Cross-Harness Continuity Architecture

## Product behavior

The owner sees one continuous project history even when different agents perform successive missions. Workbench—not a vendor transcript—resolves the latest task version, assembles the next bounded context, records what changed, and detects stale or conflicting continuation.

## Durable objects

Add a runtime-local, project-addressed `WorkLedger` with append-only records:

```ts
type HarnessId = 'claude' | 'codex' | 'hermes' | 'manual' | 'fake';

type WorkRunRecord = {
  runId: string;
  projectId: string;
  missionId: string;
  taskId: string;
  taskVersion: number;
  supersedesRunId: string | null;
  harness: HarnessId;
  model: string | null;
  effort: string | null;
  capabilitySnapshotRef: string;
  contextPackRef: string;
  contextSnapshotRef: string | null;
  candidateBefore: string | null;
  candidateAfter: string | null;
  status: 'queued' | 'running' | 'needs_input' | 'interrupted' | 'parked' | 'completed' | 'failed' | 'superseded';
  changedRefs: string[];
  evidenceRefs: string[];
  remaining: string[];
  handoffRef: string | null;
  startedAt: string;
  endedAt: string | null;
};
```

The ledger is derived execution/provenance state. Canonical project truth changes only through existing proposal/review acceptance. Records are atomic and append-only; corrections append a superseding record rather than rewriting history.

## Task-version resolver

For each stable `taskId`, resolve the highest valid version whose predecessor chain is intact and which is not superseded. Starting from a stale version returns a conflict receipt containing the current version and safe continuation route. Parked work remains resumable and cannot be mistaken for completed work.

## Common adapter contract

All three real adapters implement the same boundary:

1. capability probe;
2. prepare run-local compiled mission packet;
3. spawn executable plus argv with explicit cwd and no shell interpolation;
4. observe lifecycle/stop/restart truthfully;
5. validate structured handoff;
6. independently bind Git/filesystem/test evidence to the candidate;
7. append the normalized run record.

Provider output and session IDs may be stored as bounded diagnostic refs. They never replace the common handoff or evidence contract.

## Continuation service

`ContinuationService` consumes project/mission/task IDs and returns the latest valid task version, last valid handoff, unresolved dependencies, accepted decisions, candidate identity, and exact context expansion handles. It asks `ContextCompiler` for a new adapter-neutral packet; it does not concatenate prior chats.

## Model, effort, and compaction routing

- `NONE`: deterministic state, validation, indexing, status, formatting.
- `LIGHT/low`: bounded classification or compact summarization with deterministic fallback.
- `CODING_AGENT/medium`: normal implementation and repair.
- `STRONG/high`: architecture, security, transactional ambiguity, or two characterized failures.
- `INDEPENDENT_STRONG/high`: fresh-context QA; no implementer success narrative.

Adapters translate the common tier to an installed model and record the actual model/effort or `unknown`. Native in-session compaction is allowed. Durable transfer occurs at material boundaries through the ledger, context snapshot, and handoff; opaque model reasoning is never required or stored.

## User-facing projection

Extend the live workspace projection with a bounded continuity summary: latest completed/active/parked work, harness and time, changed-result summary, current task version, evidence state, remaining work, and next action. Full provenance appears only on Review/detail routes.

## Failure behavior

- missing harness: mission remains draft/parked with reason and setup route;
- invalid handoff: `needs_repair`, never completed;
- stale version: conflict receipt, no overwrite;
- interrupted process: durable status becomes `interrupted`/`parked` after reconciliation;
- unavailable model/effort metadata: record `unknown`, never infer;
- compaction/context loss: rebuild from canonical refs and latest valid durable record.
