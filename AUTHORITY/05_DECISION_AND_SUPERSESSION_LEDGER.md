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
