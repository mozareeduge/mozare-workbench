# 01 — Object, State, Surface, and Flow Model

**Authority snapshot:** `MWB-PD-2026-09-15-r3`

## 1. Actors

### ACT-HUMAN — Mozare / project owner
Goal: perceive project state, act on meaningful objects, delegate bounded work, review consequences, and finish projects without living in transcript/code.
Permissions: all canonical accept/reject actions, project registry/config, owner gates, review of external mutations.
Owned state: acceptance decisions, project orientation, local preferences.
Important failure state: interface becomes another text burden or forces technical interpretation.

### ACT-AGENT — Claude Code / Codex / Hermes / future agent
Goal: execute a bounded mission against supplied context and return a structured handoff/proposal.
Permissions: read scoped context; mutate isolated worktree/sandbox when mission permits; submit proposals.
Cannot: accept its own canonical proposal; rewrite authority; mutate arbitrary filesystem via MCP.

### ACT-SYSTEM — Workbench runtime
Goal: project canonical state into views, enforce schemas/governance, observe agent/Git/test evidence, manage previews and local process lifecycle.

### ACT-EXTERNAL — authoritative external system
Examples: Mozare Wiki, Git repository, Ganjoor corpus/QMD, optional Tana/other MCP system.
The Workbench references these systems and preserves their authority boundary.

## 2. Core objects

| ID | Object | Persistent? | Core lifecycle | Key consequence |
|---|---|---:|---|---|
| OBJ-PRJ | Project | yes | active/blocked/review/archived | bounded world of work |
| OBJ-QST | Question | yes | captured/active/resolved/superseded | keeps unresolved inquiry visible |
| OBJ-SRC | Source | yes/ref | candidate/inspected/accepted/rejected | evidence route, not automatic truth |
| OBJ-MAT | Material | yes/ref | captured/active/archived | artistic/research material without forced claim status |
| OBJ-CPT | Concept | yes | exploratory/active/restricted/superseded | conceptual vocabulary in use |
| OBJ-CLM | Claim | yes | candidate/supported/contested/verified/rejected | assertable proposition |
| OBJ-MTH | Method | yes | proposed/active/evaluated/superseded | procedure linking theory to work |
| OBJ-EXP | Experiment | yes | planned/running/review/accepted/abandoned | bounded test/making activity |
| OBJ-DEC | Decision | yes | proposed/accepted/superseded | freezes a choice with consequences |
| OBJ-ART | Artifact | yes/ref | draft/candidate/verified/released/archived | actual thing made/read/heard/run |
| OBJ-MIS | Mission | yes | draft/ready/running/needs_input/completed/failed/stopped | bounded work packet |
| OBJ-PRP | Proposal | yes | submitted/review/accepted/revision/rejected/superseded | human mutation boundary |
| OBJ-TST | Test | yes/ref | untested/pass/fail/inconclusive/blocked | evidence against oracle |
| OBJ-REV | Review | yes | open/in_review/decided | human judgment event |
| OBJ-REL | Relation | yes | unsettled/provisional/settled/superseded | relation carries evidence/uncertainty/use |
| OBJ-EVT | Meaningful event | append-only | recorded | visible genesis without transcript noise |
| OBJ-RSD | Residue | yes | preserved/archived | rejected/unused material retained without authority |

## 3. Commands

Stable semantic commands: `CMD-OPEN`, `CMD-FOCUS`, `CMD-RELATE`, `CMD-CAPTURE`, `CMD-WORK`, `CMD-REVIEW`, `CMD-ACCEPT`, `CMD-REVISE`, `CMD-REJECT`, `CMD-PRESERVE`, `CMD-TEST`, `CMD-PREVIEW`, `CMD-RESTORE`, `CMD-ARCHIVE`, `CMD-SEARCH`, `CMD-FILTER`, `CMD-STOP`.

Buttons may use contextual verbs, but instrumentation/tests map them to these meanings.

## 4. State machines

### Mission
`DRAFT → READY → RUNNING → COMPLETED → REVIEW` with branches `RUNNING → NEEDS_INPUT | FAILED | STOPPED`.
Completion requires a schema-valid handoff; otherwise `NEEDS_REPAIR`.

### Proposal
`DRAFT → SUBMITTED → UNDER_REVIEW → ACCEPTED | REVISION_REQUESTED | REJECTED`.
If base identity drifts before acceptance: `UNDER_REVIEW → STALE`, and acceptance is disabled until rebase/review.

### Claim/evidence
`CANDIDATE → SUPPORTED → VERIFIED` or `CANDIDATE/SUPPORTED → CONTESTED/CONTRADICTED`.
Use status is independent: a supported claim can remain exploratory/restricted.

### Relation
`UNSETTLED → PROVISIONAL → SETTLED`; any state may become `SUPERSEDED`.
Drawing a line never bypasses this lifecycle.

### Artifact
`DRAFT → CANDIDATE → VERIFIED → RELEASED`; `ARCHIVED` preserves identity. Canonical/editable and generated/distributable are different `canonicality` fields, not lifecycle states.

## 5. Surface contracts

| ID | Surface | Entry | Primary objects | Primary action | Scroll owner |
|---|---|---|---|---|---|
| SURF-FOCUS | bounded orientation/work aperture | app/project open, node focus | current question/object, decision, blockers, next action, latest output | Work on this | page/main |
| SURF-FIELD | spatial/topological project view | nav/open field | objects + relation projections | inspect/focus/relate | canvas; side inspector independent |
| SURF-FLOW | process/dependency view | nav/from Focus | missions/outcomes/reviews | open work item | columns or page depending width |
| SURF-REVIEW | finite human decision queue | badge/nav/run complete | proposals/reviews/evidence | accept/revise/reject | queue + detail pane independently on desktop |
| SURF-OUTPUT | actual produced artifacts | nav/from Focus/Review | artifacts/builds/reports | preview/open/inspect | page |
| SURF-DRAWER | contextual inspection | object/relation/system click | selected entity | inspect/route | drawer body |
| SURF-MISSION | guided mission composer | Work on this | target, outcome, context, acceptance, agent | Start mission | sheet body |
| SURF-COMMAND | search/jump command palette | Ctrl/Cmd+K | projects/objects/actions | jump/execute safe command | list |

## 6. External dependency outcomes

Every adapter must map external behavior to: `AVAILABLE`, `UNAVAILABLE`, `AUTH_REQUIRED`, `TIMEOUT`, `MALFORMED`, `PARTIAL`, `STALE`, `RATE_LIMITED`, `NOT_CONFIGURED` where applicable. Unavailable optional integrations must not make the core workspace unusable.

## 7. User journeys

### FLOW-001 — Re-enter a complex project
Open app → project selector remembers recent project → FOCUS renders deterministic orientation facts → inspect latest decision/review count → choose next action. Terminal state: user can state current project state and next action.

### FLOW-002 — Explore a conceptual relation
FOCUS → FIELD → select node/relation → drawer shows evidence/use/uncertainty → route to source/trace → return to preserved field position.

### FLOW-003 — Delegate bounded research/making
FOCUS/Field object → Work on this → mission sheet prefilled → adjust outcome/acceptance → choose agent → run → ambient status → completed proposal appears in REVIEW.

### FLOW-004 — Review technical implementation
REVIEW item → System effect → Verification → optional Architecture → optional Implementation diff/log → Accept/Revision/Reject. User can finish without opening source code if evidence is sufficient.

### FLOW-005 — Review artistic/research proposal
REVIEW item → artifact/source preview + intended consequence + uncertainty → inspect trace/evidence → accept, preserve as residue, request revision, or reject.

### FLOW-006 — Inspect produced work
FOCUS/REVIEW → OUTPUT → choose artifact → preview actual medium safely → inspect canonicality/verification/provenance → route back to decision/mission.

### FLOW-007 — External evidence capture
Search/query external adapter → inspect source candidate → route to original/canonical → capture reference proposal → human accepts reference/use status. External system remains authority.

### FLOW-008 — Recover after failure
Agent/adapter/process fails → clear error states what is safe/not changed → preserved partial work/log/worktree available → retry/inspect/discard according to policy.

### FLOW-009 — Mobile review
Open project on narrow viewport → FOCUS → bottom navigation Review badge → full-screen review item → evidence/architecture accordions → sticky decision action bar → return to same queue position.

### FLOW-010 — Reconstruct from canonical state
Stop app → delete `.mozare/cache` / generated layout → restart → project/object/relation/review projection is rebuilt; no accepted data disappears.

## 8. Encounter structure

The Workbench is itself a knowledge instrument. The encounter must preserve:

- **first glance:** project identity, current question/state, review count, next action;
- **second layer:** relations/process/artifacts;
- **third layer:** evidence/architecture/trace;
- **deep layer:** files/diff/log/raw transcript.

The system must never force the deep layer before the first/second layers become usable.

## 9. Context and representation objects (v0.3)

| ID | Object | Authority / persistence | Lifecycle |
|---|---|---|---|
| OBJ-CONTEXT-PACK | exact bounded input contract for one model/agent run | durable run record; content may reference external sources | compile → validate → execute → archive metadata |
| OBJ-EVIDENCE-CAPSULE | checksum-bound compact traversal representation of previously fully read material | derived cache, never evidence authority | valid → invalidated → rebuilt after source-level read |
| OBJ-CONTEXT-SNAPSHOT | identity of the project state a mission started from | durable metadata | create → compare → superseded |
| OBJ-CONTEXT-DELTA | changes between two compatible snapshots | derived/reproducible | compute → consume → discard/cache |
| OBJ-REPRESENTATION-PLAN | selected presentation intent/library/components/data refs | derived/ephemeral unless saved as design evidence | select → render → interact → expire |
| OBJ-TOKEN-METRICS | counts and efficiency/quality linkage for a run | durable local telemetry without prompt bodies | record → aggregate → compare |
| OBJ-MODEL-ROUTE | chosen capability tier + reason + limits | durable run metadata | select → execute/fallback → record |

### Context pack state machine

```text
REQUEST
  ↓ deterministic compile
COMPILED
  ├─ budget satisfied → READY
  ├─ missing required authority → BLOCKED
  └─ unresolved dependency → EXPAND
                           ↓
                     targeted dereference
                           ↓
                         READY

READY → EXECUTED → HANDOFF
```

The compiler may escalate `simple → normal → complex → source-level`, but every escalation records the missing information/uncertainty that required it.

### Capsule validity

A capsule is valid only when:

```text
source_hash unchanged
AND parser_contract compatible
AND authority_metadata_hash unchanged
AND relevant schema/controller compatible
AND no reopening trigger applies
```

Raw-source reopening triggers include contradiction/mention of the source family, relation traversal through it, authority/version change, extraction-fidelity change, systemic/architectural dependence, low confidence/incomplete capsule, or explicit FULL/source-level request.

### Representation selection

```text
structured state
  ↓
can fixed Workbench component represent this completely?
  ├─ yes → STATIC (0 model tokens)
  └─ no
      ↓
can deterministic planner compose known semantic components?
  ├─ yes → DETERMINISTIC COMPOSITION (0 model tokens)
  └─ no
      ↓
select one micro-library + compile UI context
      ↓
OpenUI Lang generation
      ↓ validate
        ├─ valid → render
        └─ invalid/timeout → deterministic fallback
```

The generated view may request a known action; it never gains canonical write authority.
