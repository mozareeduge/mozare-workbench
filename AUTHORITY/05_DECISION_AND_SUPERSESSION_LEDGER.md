# 05 — Decision and Supersession Ledger

This ledger prevents an executor from treating historical design material as equally authoritative.

| ID | Question | Decision | Basis | Supersedes / preserves | Owner-only |
|---|---|---|---|---|---|
| DEC-001 | Where does the human live? | Workbench UI is the front door; harnesses are workers. | owner request + v0.1 framing | preserves v0.1 | no |
| DEC-002 | Main conceptual views? | Focus, Field, Flow, Review, Output. | v0.1 + current request | preserves, deepens | no |
| DEC-003 | Default landing? | Focus. | re-entry problem | supersedes any equal-weight tab landing | no |
| DEC-004 | Source of truth? | local Markdown/YAML/JSON + Git. | durability/vendor-neutral requirement | preserves v0.1 | no |
| DEC-005 | Desktop packaging? | browser-local first. | minimum apparatus | preserves v0.1 | no |
| DEC-006 | UI style? | calm studio/control surface with explicit semantic hierarchy. | current request for polished contextual UI | supersedes primitive prototype styling | final aesthetic review yes |
| DEC-007 | Navigation geometry? | left rail ≥1180px; compact header/bottom nav below; never five tiny text tabs squeezed across mobile. | responsive consequence closure | supersedes v0.1 header tab row | no |
| DEC-008 | Review order? | effect → evidence → architecture → implementation. | user mental model | preserves v0.1 | no |
| DEC-009 | Agent prompt surface? | guided mission composer; no blank mega-prompt. | bounded collaboration | preserves v0.1 | no |
| DEC-010 | Field density? | 10–30 default nodes; max 100 rendered after filter/zoom. | bounded aperture + performance | refines v0.1 | no |
| DEC-011 | Flow granularity? | outcome-level by default; engineering subtasks nested. | nontechnical user | preserves v0.1 | no |
| DEC-012 | Output purpose? | inspect produced things with canonicality/verification. | artifact-first work | preserves v0.1 | no |
| DEC-013 | Fonts? | system/local stack first. | local-first + packaging | replaces any implicit web-font choice | no |
| DEC-014 | Mobile behavior? | focused one-pane transformation; capability preserved through sheets/routes. | compiler responsive rule | supersedes “just wrap header” v0.1 prototype | no |
| DEC-015 | AI generated summary authority? | derived only; facts route to canonical records. | authority grammar | preserves v0.1 | no |
| DEC-016 | Tana/Obsidian role? | optional adapters. | vendor neutrality | supersedes earlier Tana-as-core exploration | no |
| DEC-017 | Pilot project? | TAROKE or current artistic-research project with multiple layers. | representativeness | preserves v0.1 | owner selects exact one |
| DEC-018 | Launch target? | local Windows, loopback; no public deploy. | current scope | makes launch topology explicit | no |

## Historical design defects now guarded

| HIST ID | Prior weakness | Invariant now frozen | Scenario guard |
|---|---|---|---|
| HIST-001 | v0.1 prototype relied on text tabs in top header | navigation must remain immediately scannable and reachable at desktop/mobile widths | SCN-UI-01, SCN-RSP-01 |
| HIST-002 | visual spacing/type was generic browser-card styling | hierarchy, density, typography, spacing and component anatomy are tokenized and testable | SCN-UI-02, SCN-UI-03 |
| HIST-003 | Field was visually illustrative but not an interaction contract | relation/node selection, filters, layout-only drag, list alternative and proposal connection are explicit | SCN-FLD-01..07 |
| HIST-004 | Review looked like cards rather than a disciplined decision workspace | split list/detail, decision bar, evidence summary, progressive disclosure and stale-state guard are explicit | SCN-REV-01..08 |
| HIST-005 | mobile only wrapped the desktop header | mobile is a transformed task flow with bottom navigation and full-height sheets | SCN-RSP-01..05 |
| HIST-006 | acceptance tests existed but were not bound to immutable oracles/tasks | full trace chain is now required | ORACLE register + `EXECUTION/TRACEABILITY.csv` |

## v0.3 decisions

`DEC-019..030` in `00_PRODUCT_HORIZON.md` are accepted target decisions for v0.3. They supersede any reading of v0.2 that would: send full project context to every agent; make prose summaries the main state exchange; invoke generative UI for ordinary fixed states; expose a universal component catalog to every UI generation; or allow generated actions to mutate canonical state directly.

**External implementation basis:** OpenUI currently provides a compact streaming language, `defineComponent`/`createLibrary`, prompt generation from allowed component libraries, validation/rendering, and Query/Mutation integration. The Workbench uses these capabilities only as a replaceable derived representation engine. AG-UI remains an optional future transport boundary, not a first-release dependency.

## v0.3.2 MVP scope split

| ID | Question | Decision | Basis | Supersedes / preserves | Owner-only |
|---|---|---|---|---|---|
| DEC-031 | Which of the 21 remaining `EXECUTION/TASK_DAG.yaml` tasks ship before the rest? | Split into Phase 1 (functional MVP) and Phase 2 (deferred), tagged `phase: 1` / `phase: 2` per task in `EXECUTION/TASK_DAG.yaml`. See breakdown below. | owner request 2026-09-16: heavy chat/terminal text is exhausting under ADHD; owner wants the Workbench's own UI, not more chat with a coding agent, to carry the remaining work, while insisting the result still be genuinely functional, not a hollow demo. | refines execution order only; does not reopen or reinterpret any closed `AUTHORITY/00_PRODUCT_HORIZON.md` decision or scenario | yes |

**Phase 1 (functional MVP) — DAG tasks:** `TASK-P02-03`, `TASK-P02-04`, `TASK-P03-01`, `TASK-P03-02`, `TASK-P04-01`, `TASK-P04-03`, `TASK-P04-04`, `TASK-P04-05`, `TASK-P05-01`, `TASK-P05-02`, `TASK-P05-03`.

This is the minimum spine the existing `DEC-019` sequencing already requires to reach one real `FOCUS → mission → evidence → REVIEW` loop (`ContextCompiler → CapsuleStore → ModelRouter → MissionSheet → agent lifecycle → adapter`), plus the last two of the five core surfaces (`Flow`, `Output`) and the proposal/review mechanism that makes a Field connect-mode proposal (`TASK-P02-02`) actually reviewable and acceptable, not just visually demonstrable.

**DEC-031a — Real project data, not fixture literals.** Before/alongside `TASK-P02-03`, replace the hardcoded mock arrays in `src/web/App.tsx` (Focus) and `src/web/surfaces/Field.tsx` (Field) with a real canonical workspace directory read through the already-built `WorkspaceEngine`/`ProjectProjection` (`TASK-P01-01`), served to the browser over a new read-only server route, with the existing `Focus` empty-state ("Choose a local folder or import an existing project") as the honest first-run path. The canonical fixture content mirrors the example text already hardcoded (`TAROKE RIMIXER`), which is also `DEC-017`'s named preferred pilot project — so this closes a real gap without inventing new product scope or breaking `TEST-002`/`TEST-003`'s existing fixed-string assertions. This is implementation completion of `TASK-P01-01`/`TASK-P01-02`/`TASK-P02-01`'s own already-accepted scope (`SCN-ORI-01`), not a new task ID or a new scenario claim, and does not touch `EXECUTION/TASK_CARDS.yaml` (closed schema). Which real project eventually replaces the `TAROKE RIMIXER` fixture, and importing its actual content, remains an owner decision (`DEC-017`: "owner selects exact one") — not fabricated here.

**DEC-031b — `TASK-P05-03` narrowed for Phase 1.** All three agent CLIs (`claude`, `codex`, `hermes`) were confirmed installed locally on 2026-09-16, so this is a deliberate scope choice, not a capability gap. Phase 1 delivers a real, functional Claude Code adapter only (`claude -p --output-format json`, per `EXECUTION/AGENT_ADAPTER_BASELINES.md`). Codex and Hermes are probed but reported as an honest "not enabled in this release" adapter-unavailable state — this still satisfies `SCN-MIS-02` ("agent unavailable → disabled with reason/setup route") and `SCN-X-06` ("agent unavailable × saved mission draft → mission preserved, agent switch possible") exactly as written, since neither scenario requires every adapter to be real. Full Codex/Hermes adapter wiring moves to Phase 2.

**Phase 2 (deferred) — DAG tasks:** `TASK-P04-02` (SystemLadder/TechnicalTerm polish), `TASK-P05-04`, `TASK-P05-05`, `TASK-P05-06` (RepresentationPlanner/OpenUI GenUI — `HZN-019` already prefers the deterministic path first), `TASK-P06-01` (MCP surface), `TASK-P07-01` (Wiki/QMD adapter), `TASK-P08-01`, `TASK-P08-02`, `TASK-P08-03` (responsive/a11y/security hardening matrix), `TASK-P09-01` (Windows launchers/recovery diagnostics), plus full Codex/Hermes adapter completion for `TASK-P05-03` (see DEC-031b). `TASK-P09-02` (real pilot) and `TASK-P09-03` (release freeze) remain owner-gated regardless of phase, per the existing `ALTERNATE_HARNESS_HANDOFF.md` residual note.
