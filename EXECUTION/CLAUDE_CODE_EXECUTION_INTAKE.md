# CLAUDE CODE EXECUTION INTAKE — Mozare Workbench v0.3

**Execution intake:** `MWB-EXEC-2026-09-15-r4`  
**Product/design authority:** `MWB-PD-2026-09-15-r3`  
**QA authority:** `MWB-QA-2026-09-15-r3`  
**Status:** `READY_FOR_CODE_EXECUTION`

This is the primary executable handoff for Claude Code, Codex, or Hermes acting as implementation lead. The supporting authority files are binding references; this file integrates them into one build workload.

---

## A. START HERE

### Objective
Build the first production-worthy **local Mozare Workbench**: a human-facing project instrument for research, artistic work, writing, product/design work, technical implementation, review, and QA that keeps canonical project state outside AI transcripts and makes agent work inspectable at system level before code/log detail.

### Target terminal state
`CANDIDATE_READY_FOR_REVIEW` after all automated gates are green on an exact candidate HEAD/build and owner aesthetic/pilot review remains explicitly separate.

### Current baseline
No production application exists. This repository is a validated handoff package containing authority, schemas, seed data, skills, scripts, and a bounded interaction prototype. Do not treat the prototype as backend/runtime implementation.

### First command
Run package QA before touching production code:

```bash
python scripts/qa_package.py
```

Then create `LOCAL_PREFLIGHT.md` with detected versions/capabilities. Do not globally install agent CLIs.

---

## B. AUTHORITY / CONFLICT RULE

Precedence:
1. explicit owner decisions in this intake;
2. `AUTHORITY/*` snapshot `MWB-PD-2026-09-15-r3`;
3. `QA/*` snapshot `MWB-QA-2026-09-15-r3`;
4. applicable current platform/tool contracts verified from primary docs when decision-relevant;
5. actual repo/runtime truth as implementation baseline;
6. evidence;
7. proposals/claims;
8. v0.1/historical docs.

If current runtime evidence makes an accepted requirement technically infeasible under another locked constraint, record `FEASIBILITY_CONTRADICTION`, continue safe independent work, and ask only the smallest owner decision. Do not silently change product meaning.

---

## C. WORK MODE

`GREENFIELD + ARTISTIC_SOFTWARE + RESEARCH_INSTRUMENT + INTERNAL_TOOL + LOCAL_DESKTOP_WEB_APP`.

Release units:

- `UNIT-WEB`: React/Vite production bundle.
- `UNIT-SERVER`: local Node/TypeScript server, APIs, process/integration managers.
- `UNIT-MCP`: stdio MCP entrypoint sharing core workspace/proposal services.
- `UNIT-LAUNCHER`: Windows PowerShell + optional `.cmd` wrapper.
- `UNIT-CANONICAL-SCHEMA`: JSON Schema/contracts + example workspace.

No public deployment unit in this release.

---

## D. CURRENT TRUTH

### Handoff repository
The execution agent is expected to initialize or continue a local Git repo from this package. Freeze actual `git rev-parse HEAD` after initialization.

### Environment target
- Windows 10/11 primary human machine.
- current supported Node LTS detected locally;
- TypeScript;
- npm by default unless existing project-local package manager is already established;
- Python remains utility/test support only; product runtime should not require Python unless a real integration proves necessary.

### Existing external systems
- local Git repositories mapped from `seed/github-projects.seed.yaml`;
- Mozare Wiki root configured by path, with its own controller/authority preserved;
- optional QMD search;
- Claude Code / Codex / Hermes capability-detected, any subset may be missing;
- Tana/Obsidian optional and non-blocking.

---

## E. PROTECTED / TARGET HORIZON

All `HZN-001..020` in `AUTHORITY/00_PRODUCT_HORIZON.md` are protected. Especially:

- canonical/derived separation;
- no chat/transcript home;
- proposal-before-canonical mutation;
- progressive technical disclosure;
- relation-object semantics;
- external authority routes;
- bilingual integrity;
- loopback/local safety;
- vendor-neutral recoverability.

Do not “simplify” these away to accelerate the build.

---

## F. CLOSED DECISIONS

Implement `DEC-001..030`. The following are especially implementation-sensitive:

- Focus is default landing.
- Five conceptual surfaces only: Focus, Field, Flow, Review, Output.
- wide navigation = left rail; mobile = bottom nav, not squeezed tabs.
- guided MissionSheet replaces blank prompting.
- Review starts at system effect/evidence and keeps diff/log deepest.
- first launch is local loopback, no cloud/public hosting.
- no mandatory DB; canonical state remains ordinary files + Git.

---

## G. PRODUCT / SCENARIO ACCEPTANCE

Implement all cases in `AUTHORITY/02_SCENARIO_CASE_ATLAS.md`. Critical release blockers include:

`SCN-ORI-01`, `FLD-03..07`, `MIS-01..05`, `REV-02..09`, `OUT-01/03/05`, `EVD-02/03`, `TEC-01..05`, `ERR-02..06`, `RSP-01/04/05`, `A11Y-01/03`, `BIDI-01`, `LOC-01..03`, and all `SCN-X-*` cases.

Use stable IDs in tests and code comments only where traceability is useful; do not litter runtime UI with internal IDs.

---

## H. DESIGN / UI / UX CONTRACT

Primary authority: `AUTHORITY/03_DESIGN_UIUX_BLUEPRINTS.md`, `UI/design-tokens.css`, `UI/component-contracts.md`, `UI/layout-contracts.md`, and `prototype/`.

### UI build rules

- Reuse the token semantics, but production may implement tokens in CSS variables/Tailwind theme/etc. Keep values/roles traceable.
- Use accessible headless primitives (e.g. Radix/React Aria/Ariakit or equivalent) only if they reduce correctness burden; do not import a full opinionated dashboard design system that fights the visual grammar.
- Icons: choose one restrained open-source icon family and use consistently. No emoji as production icons.
- Avoid arbitrary gradients, AI-purple/neon, excessive shadows, card soup, or dense developer-dashboard styling.
- Production UI must match interaction hierarchy of prototype, not necessarily pixel-copy it when real data requires adaptation.

### Surface requirements

**Focus:** current question/object hero, state strip, Next meaningful action dominant, Needs you, latest accepted decision, latest verified output.  
**Field:** curated graph + accessible list; inspect relation as real object; layout-only dragging.  
**Flow:** project outcome state, nested technical subtasks.  
**Review:** queue + structured detail; evidence provenance; sticky decision bar; stale guard.  
**Output:** actual medium preview + canonicality/verification/lineage.

### Responsive
Test exact matrix defined in QA TEST-014. Primary functions may move into sheets/routes but cannot disappear.

---

## I. TECHNICAL CONTRACT

### Recommended architecture

```text
Browser UI (React/Vite)
        │ HTTP + SSE/WebSocket coarse events
        ▼
Local Node Server (127.0.0.1)
  ├─ WorkspaceEngine
  ├─ ProjectionEngine
  ├─ ProposalService
  ├─ ReviewService
  ├─ GitAdapter / WorktreeManager
  ├─ AgentManager
  │    ├─ ClaudeAdapter
  │    ├─ CodexAdapter
  │    └─ HermesAdapter
  ├─ ArtifactRegistry/PreviewService
  ├─ ExternalKnowledgeAdapters
  │    ├─ MozareWiki/QMD
  │    └─ optional future adapters
  └─ Event/Evidence service

MCP stdio entrypoint
        │
        └─ shares WorkspaceEngine + ProposalService read/proposal surface
```

### State authority

| Semantic fact | Authority |
|---|---|
| project/object/relation/accepted decision | canonical local records |
| Git implementation state | actual Git repository |
| external Wiki/source content | external source system |
| proposal/review lifecycle | canonical Workbench records |
| mission/run durable summary | Workbench run records + handoff |
| test verification | observed command/result evidence |
| Field coordinates/filter/layout | derived view state |
| open drawers/current surface | browser/UI state |
| raw agent tokens/log stream | per-run diagnostic log, never canonical project memory |

### Storage

Suggested local layout:

```text
<workspace>/
  workspace.yaml
  projects/<project-id>/
    PROJECT.md
    objects/
    relations/
    reviews/
    proposals/
    events/events.jsonl
    artifacts/registry.yaml
  .mozare/
    cache/
    layouts/
    runtime/
    logs/
```

Canonical project records may refer to artifacts/repos outside the workspace by explicit registered path/ref; do not silently copy large repos/media into the workspace.

### Schemas
Use JSON Schema Draft 2020-12. Keep schema validation at load, proposal preflight, staged apply, and handoff ingestion. Extend schemas only with backward-compatible or versioned changes.

### Projection engine
Produce typed projections for each surface. The UI never scans Markdown itself.

```ts
interface ProjectProjection {
  project: ProjectSummary;
  focus: FocusProjection;
  field: FieldProjection;
  flow: FlowProjection;
  review: ReviewProjection;
  output: OutputProjection;
  activeRuns: RunSummary[];
}
```

### Proposal transaction
For canonical Workbench changes:
1. validate proposal manifest;
2. verify base revision/hash;
3. stage changes under runtime temp;
4. validate full staged affected workspace;
5. atomically write/replace where platform permits;
6. append meaningful event;
7. revalidate;
8. rollback on failure;
9. return recovery receipt.

For external Git repositories, human acceptance means acceptance of the proposal/review state; merging/committing follows project policy and must never overwrite dirty work.

### Git/worktrees
- freeze repo path, branch, HEAD, dirty state before mission;
- use `git worktree` for implementation missions when feasible;
- branch `mozare/run/<run-id>-<slug>`;
- preserve worktree until review resolution;
- never run `reset --hard`, `clean -fd`, force-push, or delete branch/worktree containing unrecorded work automatically.

### Agent manager
Adapters implement the same typed contract:

```ts
interface AgentAdapter {
  id: 'claude'|'codex'|'hermes'|string;
  detect(): Promise<Capability>;
  buildInvocation(mission: MissionPacket): Promise<SpawnSpec>;
  run(spec: SpawnSpec, sink: RunEventSink): Promise<RunResult>;
  stop(run: ActiveRun): Promise<void>;
}
```

Spawn with executable + argv arrays. Never concatenate mission/user data into shell command strings. Environment passed through allowlist; protected secrets excluded from context.

### Handoff ingestion
Require `config/handoff.schema.json`. Compare agent-declared changes/tests with independently observed Git/filesystem/test evidence. Agent claim is metadata, never verification by itself.

### MCP
Stdio first. Expose only read/query and proposal submission tools. No generic shell tool; no arbitrary filesystem write; no accept/reject tool for agents. Tool responses include stable object IDs/source paths/authority state.

### Artifact previews
Registry-based allowlisted paths only. HTML sandboxed with minimum capabilities; do not serve arbitrary filesystem roots. Binary never auto-executes. Media/text previews use content-type and size limits.

### Search
1. loaded canonical metadata/body search;
2. optional ripgrep acceleration;
3. external QMD adapter for large corpora;
4. no auto-created semantic relations from vector similarity.

### Logging
Three layers: meaningful project events; structured diagnostics; raw per-run logs. Redact secrets where practical. Raw logs local and collapsed.

### Performance targets
- warm Focus render <2s at pilot scale;
- 10k canonical Workbench objects usable;
- Field default <30 nodes, hard projection max around 100;
- 20k-line raw log does not freeze primary UI because it is lazy/not streamed into main state.

---

## J. QA CONTRACT

Bind implementation to `QA/QA_ORACLE_REGISTER.md` and `QA/CLAUDE_QA_CONTRACT.md`.

No production PASS exists yet. Every candidate must have exact identity and evidence. A fix narrative never closes a defect.

Required chain:

`SCN-* → ORACLE-* → TEST-* → TASK-* → GATE-*`

See `EXECUTION/TRACEABILITY.csv`.

---

## K. ALREADY DONE / DO NOT REDO

- product/design meaning is frozen in `AUTHORITY/`;
- the five-surface interaction grammar is frozen;
- design tokens/component/layout contracts exist;
- bounded prototype exists and must be treated as reference, not production runtime;
- schema/seed/skills from v0.1 are starting assets;
- do not reopen Tana-as-core, cloud-first, database-first, desktop-package-first, or chat-home debates without new evidence.

---

## L. LAUNCH MANIFEST

Primary file: `EXECUTION/LAUNCH_MANIFEST.yaml`.

Release topology: `NO_PUBLIC_DEPLOYMENT + LOCAL_LOOPBACK_WEB_APP`.

Required human launch:

```text
Double click START_MOZARE.cmd
  → PowerShell preflight
  → start local server on 127.0.0.1 chosen safe port
  → open browser
  → Focus view
```

No automatic global PATH edits or global installs. Missing optional agent CLIs become capability states. Missing required Node/npm yields a precise setup diagnostic.

---

## M. MINIMAL EXECUTION HARNESS

Store execution-local state under Git metadata, not canonical product records:

```text
.git/mozare-workbench-execution/
  state.json
  logs/
  scratch/
  evidence-dev/
```

State fields: start_head, current_phase, completed task IDs, open task IDs, last_verified_sha, last_full_gate, blocker.

---

## N. CONCURRENCY SAFETY

Primary worktree is single-writer. Before parallel implementation:

```bash
git status --porcelain=v1 > .git/mozare-workbench-execution/logs/main-status-before.txt
git diff --binary > .git/mozare-workbench-execution/logs/main-uncommitted-before.patch
git diff --binary --cached > .git/mozare-workbench-execution/logs/main-index-before.patch
```

Parallel mutation uses isolated worktrees/sandboxes. Read-only auditors may share repo reads.

---

## O. PREFLIGHT

Run and record:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git log --oneline -12
git diff --stat
node --version
npm --version
git --version
python --version
```

Detect, do not install globally: `claude`, `codex`, `hermes`, `qmd`.

Create `LOCAL_PREFLIGHT.md` with `AVAILABLE / MISSING_OPTIONAL / BLOCKING` states. If repo already advanced from known planning HEAD, inspect only drift since it and classify conflict.

---

## P. TASK DAG

Machine-readable source: `EXECUTION/TASK_DAG.yaml`.

### Phase P00 — Freeze contracts and scaffold
- `TASK-P00-01` package/preflight QA;
- `TASK-P00-02` initialize production app structure and lockfile;
- `TASK-P00-03` port/validate schemas and fixtures;
- `TASK-P00-04` establish test harness (unit/integration/Playwright).

### P01 — Canonical engine + Focus vertical slice
- workspace loader/validation;
- project/object/relation/event/proposal stores;
- projection engine;
- Focus shell using production design tokens;
- recovery after cache deletion.

Exit: one seed project opens to Focus, ORACLE-001..003 partially proven.

### P02 — Field / Flow / Output
- accessible graph/list Field and relation inspector;
- layout-only view persistence;
- outcome Flow;
- artifact registry/previews/canonicality.

### P03 — Proposal / Review authority boundary
- proposal lifecycle, stale-base checks, transaction/rollback;
- full Review surface + decision actions;
- observed-vs-claim evidence model;
- event trace.

### P04 — Git + technical translation
- repo registry/status/diff/tests;
- worktree manager;
- SystemLadder + TechnicalTerm;
- artifact/checksum evidence.

### P05 — Agent missions/adapters
- MissionSheet/packet builder;
- fake deterministic adapter first;
- Claude/Codex/Hermes adapters behind common interface;
- stop/restart/reconcile lifecycle;
- handoff validation and proposal creation.

### P06 — MCP + skills
- stdio server; safe tool list; proposal submission only;
- integrate `.agents/skills`/`.claude/skills`;
- prove no self-accept/raw-write tool.

### P07 — Mozare Wiki / QMD
- dynamic root/release detection;
- source route/search/get;
- candidate capture; no silent Wiki mutation;
- mutation mission delegates to Wiki controller when explicitly requested.

### P08 — UI hardening
- responsive matrix; keyboard; bidi; 200% zoom; motion; long-content/dense states;
- visual regression references if chosen;
- eliminate card soup/technical leakage discovered in real data.

### P09 — Pilot + release candidate
- real Mozare project import/registry;
- ≥3 real missions (research/design, technical implementation, review);
- pilot metrics;
- Windows launcher;
- exact-head full QA; release report/known limits.

---

## Q. PER-PHASE EXECUTION LOOP

For each task/batch:
1. inspect smallest relevant authority/source area;
2. state target SCN/ORACLE in work log;
3. create negative/characterization proof when risk justifies;
4. implement smallest coherent vertical behavior;
5. run targeted proof;
6. run adjacent proof;
7. update traceability/evidence;
8. commit coherent verified batch;
9. do not cite tests after later edits without rerun.

Do not weaken oracle/test thresholds to get green.

---

## R. TEST / QA GATES

- `GATE-PACKAGE` — handoff integrity before implementation.
- `GATE-UNIT` — domain/schema/projection units.
- `GATE-INTEGRATION` — filesystem/proposal/Git/process boundaries.
- `GATE-E2E` — primary human flows in Chromium.
- `GATE-RESPONSIVE` — exact viewport/zoom matrix.
- `GATE-A11Y` — keyboard/focus/semantic/reduced-motion + chosen scan.
- `GATE-SECURITY` — path/process/secret/preview/MCP boundaries.
- `GATE-ADAPTER` — deterministic fake adapter all lifecycle; real installed agent smoke ≥1.
- `GATE-FULL` — all mandatory automated gates on unchanged exact HEAD.
- `GATE-WINDOWS` — launcher/process-stop/manual smoke on user's Windows environment.
- `GATE-PILOT` — owner/user pilot metrics, not automated fake acceptance.

Release candidate requires all except aesthetic/pilot owner acceptance to have clear dispositions; unresolved pilot metrics produce `CANDIDATE_READY_FOR_REVIEW`, not “released”.

---

## S. SOURCE-OF-TRUTH EDITING

- edit canonical schema/domain/UI source, then generate bundles/caches;
- never hand-edit generated build as a second implementation;
- keep prototype under `prototype/` as reference only;
- external repos/Wiki retain their own source-of-truth rules;
- update docs after implementation truth stabilizes.

---

## T. NEW-DEFECT RULE

When execution discovers a clear defect against authority, create `DEFECT-*` with Given/When/Expected/Actual/root cause/affected files/negative proof/closure. Fix without planning only if no owner/product ambiguity is introduced. Otherwise stop only that branch with exact contradiction.

---

## U. SCOPE-FIDELITY AUDIT

Before each full gate and final freeze, generate a changed-file table:

`file → TASK-ID → intended effect → protected neighbor → proof`.

Unexplained tracked changes are findings. Confirm no requirement was “satisfied” by hiding/removing a protected capability.

---

## V. FINAL FREEZE / CI / CUTOVER

No public cutover in v0.3. Freeze local candidate:
1. all authorized tasks complete or explicitly deferred;
2. clean tracked tree except intentional release files;
3. targeted + full gates green;
4. record exact candidate SHA;
5. rerun package/manifest generation after all generated tracked artifacts stabilize;
6. final QA on unchanged SHA;
7. Windows launch smoke;
8. produce `IMPLEMENTATION_HANDOFF.json`, `RELEASE_REPORT.md`, `KNOWN_LIMITS.md`.

Do not claim `OWNER_ACCEPTED` or `RELEASED` until owner pilot/aesthetic acceptance occurs.

---

## W. OWNER-ACTION GATES

Initial implementation has no blocking owner decision. Later gates:
- exact pilot project choice if not obvious from local availability;
- final aesthetic/interaction acceptance;
- public/cloud deployment authorization if ever introduced;
- any paid provider/billing or irreversible migration.

---

## X. FINAL RESPONSE FORMAT

Return only concise human-facing status; detailed engineering evidence lives in files:

```text
STATE
<one sentence>

WHAT CHANGED
<max five concrete outcomes>

WHAT MOZARE CAN NOW DO
<plain system-level behavior>

VERIFICATION
<exact gates/commands + result + candidate SHA>

NEEDS HUMAN JUDGMENT
<only real owner gates; otherwise None>

OPEN
<paths/artifacts/previews to inspect>
```

---

## Y. ONE-LINE DIRECTIVE

**Execute this intake against the current repository and continue through `CANDIDATE_READY_FOR_REVIEW` without reopening closed product/design decisions unless new authorized evidence proves a contradiction.**

## Z. v0.3 mandatory context-economy + representation implementation

This section is release-binding and must be completed before real multi-harness pilot.

1. Implement `ContextCompiler` from `AUTHORITY/06_CONTEXT_AND_GENERATIVE_REPRESENTATION.md` and `CONTEXT/*`. Direct whole-project prompt assembly is prohibited in production agent paths.
2. Prove the deterministic reference compiler/tests first, then replace demo heuristics with typed relevance/authority metadata from Workbench objects.
3. Implement content/contract-bound capsules + raw/source-level reopening triggers. For Mozare Wiki, call/read through its adapter/controller rules rather than pretending Workbench capsules establish Wiki source completeness.
4. Implement snapshots/deltas and role-scoped profiles before Claude/Codex/Hermes production adapters.
5. Implement `ModelRouter` with `NONE` as first-class route. Provider/model names belong to local configuration, not product authority.
6. Persist structured handoff + evidence refs. Do not make a prose completion essay the data contract.
7. Implement RepresentationPlanner in the order STATIC → DETERMINISTIC → OpenUI. OpenUI is a replaceable derived renderer.
8. Build micro-libraries from `GENUI/component-registry.yaml`; use `GENUI/openui-library.reference.tsx` only as a starting point and verify current installed OpenUI API before pinning.
9. Generated actions must terminate at the ActionRegistry read/proposal surface. No canonical write/accept/shell action may be registered for generated UI.
10. Implement deterministic fallback and prove it with invalid OpenUI canaries.
11. Run `TEST-CTX-*`, `TEST-TOK-*`, `TEST-GUI-*`, `TEST-MET-*`; efficiency does not pass if QA/task outcomes regress.
12. Pilot metrics must include re-entry time, subjective overload, context/input/output tokens, cache/expansion behavior and ceremony cost.

### New gates

- `GATE-CONTEXT`: schemas + context unit/property tests + invalidation/delta canaries.
- `GATE-TOKEN`: routing/telemetry/structured-handoff + quality-preserving efficiency benchmark.
- `GATE-GENUI`: micro-library selection, parser/schema failure fallback, generated action security, responsive/a11y component matrix.
