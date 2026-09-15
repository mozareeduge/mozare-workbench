# Technical Architecture — v0.3.1

This document expands the technical contract in the execution intake. Product/design authority remains in `AUTHORITY/`; technical choices may change only when they preserve its consequences.

## Architecture shape

```text
                    ┌─────────────────────────┐
                    │      React Web UI       │
                    │ Focus Field Flow Review │
                    │        Output           │
                    └────────────┬────────────┘
                                 │ HTTP + coarse events
                                 ▼
┌────────────────────────────────────────────────────────────┐
│                  Local Workbench Server                    │
│                                                            │
│ Workspace ─ Projection ─ Proposal/Review ─ Evidence        │
│    │            │             │               │            │
│    │            │             │               ├─ tests     │
│    │            │             │               └─ artifacts │
│    │            │             │                            │
│    ├─ files     ├─ UI models  ├─ transaction               │
│    └─ schemas   └─ search     └─ event log                 │
│                                                            │
│ Git/Worktree   AgentManager       External Adapters         │
│                    │                │        │               │
│             Claude Codex Hermes     Wiki/QMD optional...    │
└───────────────────────────┬────────────────────────────────┘
                            │ shared core
                    ┌───────▼────────┐
                    │ MCP stdio      │
                    │ read/proposal  │
                    └────────────────┘
```

## Module contracts

### WorkspaceEngine
Inputs: workspace root, project ID, filesystem events.  
Outputs: validated canonical records, revision/hash map.  
Owns: canonical record loading/writing transaction.  
Must not own: UI layout or external Git truth.

### ProjectionEngine
Inputs: validated workspace + external adapter summaries.  
Outputs: typed `FocusProjection`, `FieldProjection`, `FlowProjection`, `ReviewProjection`, `OutputProjection`.  
Derived/cacheable; deleting it must be safe.

### ProposalService
Inputs: proposal manifest + base identities.  
Outputs: reviewable proposal, stale state, apply receipt.  
Owns: transaction staging and accepted canonical Workbench mutations.

### EvidenceService
Collects independently observed test command result, Git diff/status/head, artifact checksums and external source refs. It does not trust an agent handoff as observation.

### GitAdapter / WorktreeManager
Read-only operations may happen in registered repos. Mutating missions use isolated worktrees where feasible. Existing dirty work is protected and surfaced before action.

### AgentManager
Capability discovery, mission packet generation, argv-safe process spawn, coarse event stream, stop/process-tree handling, schema-valid handoff collection, durable run reconciliation.

### ArtifactRegistry
Stores metadata/reference, not necessarily artifact bytes. Selects safe previewer from registered kind/MIME/path policy.

### ExternalKnowledgeAdapter
`detect/search/get` with explicit availability/error state. Capture creates project reference/proposal only.

## Data boundaries

**Canonical:** `workspace.yaml`, project/object/relation/proposal/review/event/artifact registry records.  
**External authority:** source repos, Wiki, Ganjoor/QMD.  
**Derived:** projections, layouts, local search cache, thumbnails.  
**Ephemeral:** current drawer, selection, unsaved mission form.  
**Diagnostic:** raw agent logs/process output.

## Event model

Do not event-source every low-level action. Append only meaningful genesis such as:
- proposal submitted/accepted/rejected/revision requested;
- accepted decision created/superseded;
- mission started/completed/stopped when relevant to project trace;
- artifact registered/verified/released;
- external reference captured.

Mouse movement, node dragging, token streaming and ordinary panel opening are not canonical events.

## Local API sketch

First release uses REST JSON plus SSE; preserve semantics:

```text
GET  /api/workspace
GET  /api/projects/:id/projection
GET  /api/objects/:id
GET  /api/relations/:id
GET  /api/reviews?project=:id
POST /api/missions
POST /api/missions/:id/stop
POST /api/proposals
POST /api/proposals/:id/accept
POST /api/proposals/:id/revision
POST /api/proposals/:id/reject
GET  /api/artifacts/:id/preview
GET  /api/adapters
```

Mutation endpoints validate origin/loopback policy, schema, project permission and base revision. Do not expose arbitrary path/shell endpoints.

## Coarse run events

SSE messages are structured and low-volume; WebSockets are deferred unless frozen requirements later demand bidirectional push:

```ts
type RunEvent =
 | {type:'phase'; runId:string; phase:'preflight'|'working'|'testing'|'handoff'}
 | {type:'status'; runId:string; status:'running'|'needs_input'|'failed'|'stopped'|'completed'}
 | {type:'summary'; runId:string; text:string}
```

Token streams remain in diagnostic logs, not UI projection.

## Dependency policy

The first-release dependency choices are locked by `EXECUTION/IMPLEMENTATION_STACK_LOCK.yaml`. Preserve these categories:
- React + Vite;
- native semantic HTML first; Radix Dialog/Tooltip for the bounded headless cases;
- `@xyflow/react` for Field, with accessibility/list fallback first-class;
- AJV for JSON Schema;
- Fastify server;
- execa/child_process wrapper only if argv/process-tree behavior is testable on Windows;
- no database or full “AI workspace” framework in first release.

## v0.3 — Context + representation architecture

```text
Canonical / external project reality
            │
            ▼
      ProjectionEngine
            │
      ┌─────┴────────┐
      ▼              ▼
ContextCompiler   RepresentationPlanner
      │              │
 capsules/snapshots  ├─ STATIC (0 model)
 deltas/budgets      ├─ DETERMINISTIC (0 model)
      │              └─ OpenUI micro-library
      ▼                       │
 ModelRouter                  ▼
 NONE/LIGHT/STRONG      OpenUI validation/render
 CODING/INDEPENDENT            │
      │                        ▼
      └────────► structured actions ──► read / proposal boundary
```

### Required services

- `ContextCompiler` — profile selection, handle resolution, dedupe, priority, safe compaction, budgets, expansion, batching receipt.
- `CapsuleStore` — content/contract fingerprints + validity/invalidation reasons; never treated as evidence authority.
- `SnapshotService` — project/object/repo fingerprints and delta calculation.
- `ModelRouter` — maps operation classes to capability tiers and available configured adapters; deterministic `NONE` is a real route.
- `TokenTelemetry` — local counts/estimates/cache/expansion/quality linkage without prompt bodies/secrets.
- `RepresentationPlanner` — STATIC/DETERMINISTIC/OpenUI selection and one micro-library choice.
- `GenerativeRenderer` — OpenUI Lang parser/renderer integration behind an interface; generated actions go through `ActionRegistry`.
- `ActionRegistry` — explicit action IDs and authority class (`read`, `proposal`, never direct canonical write).

### Context API surface

```text
POST /api/context/compile
POST /api/context/expand
GET  /api/context/packs/:id
GET  /api/context/metrics/:runId
POST /api/representation/plan
POST /api/representation/generate   # only for GENERATIVE_OPENUI
```

No endpoint accepts arbitrary raw prompt concatenation from the UI.
