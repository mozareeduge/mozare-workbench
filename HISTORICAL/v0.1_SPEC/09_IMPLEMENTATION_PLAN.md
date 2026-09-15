# 09 — Implementation Plan

## Build philosophy

Build the smallest vertical slices that prove the interaction architecture. Each milestone must leave a usable, testable system. Do not spend the first half of the project building an orchestration framework with no human surface.

## Milestone 0 — Preflight + frozen contracts

### Goal
Know what exists on the local machine and validate this handoff before implementation.

### Deliver

- run `python scripts/qa_package.py`;
- detect Node, npm, Git, Python, QMD, Claude Code, Codex, Hermes;
- detect Windows version / shell behavior;
- create `LOCAL_PREFLIGHT.md` with detected capabilities and missing optional dependencies;
- create initial repo/branch;
- freeze schema tests and fixtures.

### Rule
Do not globally install missing agent CLIs. Report them. Project-local npm dependencies may be installed for implementation.

### Exit
Package QA passes; schemas parse; project can begin from a clean branch.

---

## Milestone 1 — Canonical workspace engine + read-only shell

### Goal
Prove that durable files can generate a comprehensible project interface.

### Deliver

- Node/TypeScript application skeleton;
- workspace/project/object/relation loader;
- schema validation;
- seed workspace loading;
- browser shell with project selector;
- **Focus** view first;
- deterministic `Orient me` facts without AI;
- file watcher/reload;
- canonical vs derived directory separation.

### Tests

- valid fixtures load;
- invalid records fail with actionable error;
- deleting derived cache has no data loss;
- project can open offline.

### Exit
User can open seeded TAROKE/Black Bird/Research sample and understand current state without a transcript.

---

## Milestone 2 — Field + Flow + Output

### Goal
Turn project state into manipulable visual/spatial representations.

### Deliver

- Field graph using `@xyflow/react` or equivalent;
- relation-object inspection;
- type/evidence/use-status filters;
- deterministic layout fallback;
- Flow pipeline/board;
- artifact registry and safe previews;
- RTL/LTR mixed-language rendering tests;
- accessible list alternative to graph.

### Constraint
Dragging nodes changes view layout only.

### Exit
The user can move between topology, process, and artifacts without reading long prose.

---

## Milestone 3 — Proposal + Review architecture

### Goal
Establish the human judgment boundary before adding autonomous workers.

### Deliver

- proposal object + manifest validation;
- review queue;
- Review UI ordered by System Effect → Evidence → Architecture → Implementation;
- accept/revise/reject/residue actions;
- optimistic concurrency / stale-base detection;
- append-only meaningful event log;
- transaction-safe canonical apply;
- recovery test after deliberate apply failure.

### Exit
A fixture proposal can be reviewed and safely accepted/rejected without any AI agent.

---

## Milestone 4 — Git/repository adapter

### Goal
Represent implementation state without turning UI into an IDE.

### Deliver

- repo registration/local mapping;
- branch/HEAD/dirty status;
- safe changed-file/diff collection;
- configured test command execution;
- artifact/checksum collection;
- worktree manager;
- technical System ladder UI;
- technical term translation records.

### Exit
A manually prepared branch/worktree can generate a review proposal showing human/system effect before diff.

---

## Milestone 5 — Agent adapters

### Goal
Launch bounded missions through Claude Code, Codex, and Hermes using one mission model.

### Deliver

- common adapter interface;
- capability detection;
- Claude adapter;
- Codex adapter;
- Hermes adapter;
- mission packet builder;
- coarse activity stream;
- stop/cleanup handling;
- final handoff validation;
- malformed handoff repair path;
- one end-to-end fixture run for each installed agent;
- graceful unavailable state for missing agents.

### Important
Do not make successful release depend on all three CLIs being installed on the implementation machine. Adapter tests may use deterministic fake executables; at least one real installed adapter must be manually exercised before pilot.

### Exit
One real bounded mission can travel:

`Focus → Work on this → agent → handoff → observed evidence → Review`.

---

## Milestone 6 — MCP + cross-agent skills

### Goal
Let agents read the same project state and submit proposals without vendor-specific memory.

### Deliver

- stdio MCP server;
- safe read tools;
- proposal-only mutation tools;
- agent configuration examples;
- skills synchronized from `.agents/skills/`;
- tests proving no accept/raw-write tool is exposed;
- tool responses include stable object IDs and evidence routes.

### Exit
Claude/Codex/Hermes (where installed) can query project state through MCP and submit a proposal.

---

## Milestone 7 — Mozare Wiki + QMD adapters

### Goal
Make the existing knowledge infrastructure available without flattening it.

### Deliver

- Wiki root configuration;
- dynamic release/system metadata detection;
- QMD availability detection;
- read/search/get route;
- source authority metadata;
- “capture into project” creates proposal/reference rather than copy-as-truth;
- mutation mission template that delegates to Wiki's own controller/validators;
- Ganjoor/Ontograph adapter configuration sample.

### Exit
A Wiki query can produce inspectable source candidates and route to original/canonical records from the Workbench.

---

## Milestone 8 — Pilot hardening

### Goal
Use one actual Mozare project and remove everything that fails to earn its place.

Recommended pilot: TAROKE RIMIXER or a current artistic-research project with both conceptual and implementation layers.

### Deliver

- run at least three genuine missions: research/design, implementation, review;
- measure re-entry time and overload baseline;
- remove/merge unused surfaces;
- resolve performance/accessibility defects;
- test restart/recovery;
- test on the user's actual Windows machine;
- update interaction copy from observed confusion;
- document known limits honestly.

### Exit
Pilot metrics in Product Spec are measured, not assumed.

---

## Milestone 9 — v0.1 release

### Deliver

- `START_MOZARE.ps1`;
- optional `.cmd` wrapper;
- clean setup guide for nontechnical user;
- pinned dependency lockfile;
- unit/integration/E2E suite;
- final traceability matrix;
- `IMPLEMENTATION_HANDOFF.json`;
- `RELEASE_REPORT.md`;
- `KNOWN_LIMITS.md`;
- rollback/recovery instructions;
- no secrets/local absolute paths committed.

## Implementation priority when time is constrained

Protect in this order:

1. canonical/derived separation;
2. Focus/Orient;
3. Proposal/Review boundary;
4. system-level technical translation;
5. one real agent adapter;
6. Field/Flow richness;
7. additional agents/integrations;
8. decorative polish.

A beautiful multi-agent dashboard without reliable state/review is a failure.
