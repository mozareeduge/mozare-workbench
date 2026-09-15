# 02 — Scenario / Consequence Atlas

**Authority snapshot:** `MWB-PD-2026-09-15-r3`  
Unit of coverage: materially distinct product/user/system consequence, not every combinatorial variation.

## A. Orientation and navigation

| ID | Starting state / trigger | Required result | Design consequence | Risk |
|---|---|---|---|---|
| SCN-ORI-01 | fresh app, valid workspace | recent/default project opens to Focus with deterministic facts | no blank chat/home; first paint skeleton then orientation | critical |
| SCN-ORI-02 | no projects configured | clear first-use setup with local folder choice/import; no fake project | one primary CTA, explanation of canonical local files | high |
| SCN-ORI-03 | project has 50+ historical items | Focus stays bounded to current facts; history summarized behind Trace | default aperture ≤7 fact blocks | high |
| SCN-ORI-04 | project blocked | blocker replaces normal “next action”; viable repair route shown | block state uses icon/label, not color alone | high |
| SCN-ORI-05 | project has pending review | review count and highest-risk item visible without hijacking Focus | subtle badge + Needs you card | normal |
| SCN-UI-01 | switch main view desktop | selected nav persists; content heading/focus changes; project context remains | left rail, stable content origin | high |
| SCN-UI-02 | dense page | dominant region visually wins; metadata does not compete | type scale/spacing/tone tokens | normal |
| SCN-UI-03 | long title/mixed script | wraps without pushing critical actions off-screen | minmax columns, bidi isolation | high |

## B. Field / relations

| ID | Trigger | Required result | Design consequence | Risk |
|---|---|---|---|---|
| SCN-FLD-01 | open Field from current object | current object centered/prominent; 3–7 primary neighbors and collapsed clusters | canvas uses semantic node styling, zoom controls, mini legend | high |
| SCN-FLD-02 | select object | context inspector opens without navigating away | desktop right inspector; mobile bottom/full sheet | normal |
| SCN-FLD-03 | select relation | relation object shows participants, classification, evidence, uncertainty, use, history | line itself never carries all meaning | critical |
| SCN-FLD-04 | drag node | layout state changes only | transient/derived state indicator; no save-as-truth language | critical |
| SCN-FLD-05 | connect nodes | creates relation proposal; asks descriptor/classification if needed | connect mode visibly modal; cancel is easy | critical |
| SCN-FLD-06 | unsettled relation | rendered dashed/neutral + explicit “Unsettled”; no invented semantic label | legend + accessible text | high |
| SCN-FLD-07 | keyboard/screen-reader use | equivalent relation list exposes same inspect/focus actions | toggle “Map / List”, list is first-class | critical |
| SCN-FLD-08 | >100 matching nodes | Field does not render everything; asks/filter/clusters | density guard + “87 hidden by projection” | high |

## C. Focus / mission creation

| ID | Trigger | Required result | Design consequence | Risk |
|---|---|---|---|---|
| SCN-FOC-01 | current question active | show question, state, evidence summary, last accepted decision, next action, latest output | question has highest type hierarchy | critical |
| SCN-FOC-02 | no active question | Focus uses objective/current artifact/mission rather than fabricating question | conditional anatomy | normal |
| SCN-MIS-01 | Work on this | mission sheet prefilled from target/context, not blank prompt | four concise sections + advanced disclosure | critical |
| SCN-MIS-02 | agent unavailable | agent option disabled with reason/setup route; mission can remain draft | affordance truth | high |
| SCN-MIS-03 | acceptance criteria empty | Start disabled, explains minimum one observable criterion | inline validation, preserves edits | high |
| SCN-MIS-04 | start valid mission | status becomes queued/running; Focus not replaced by transcript | toast + ambient run chip | critical |
| SCN-MIS-05 | stop running mission | child tree stops; partial work preserved; no canonical mutation | confirm only if destructive cleanup requested | critical |

## D. Flow / work state

| ID | Trigger | Required result | Design consequence | Risk |
|---|---|---|---|---|
| SCN-FLO-01 | open Flow | show Ready/Active/Blocked/Review/Accepted outcome cards | horizontal board wide; segmented filter/table on mobile | normal |
| SCN-FLO-02 | mission has technical subtasks | card shows outcome + progress; details nested | no raw issue/task flood | high |
| SCN-FLO-03 | dependency blocks item | blocker object/reason and dependency route visible | blocked icon + cause line | high |
| SCN-FLO-04 | completed run awaits review | moves to Review lane but not Accepted | distinct review state | critical |

## E. Review / governance

| ID | Trigger | Required result | Design consequence | Risk |
|---|---|---|---|---|
| SCN-REV-01 | open review queue | finite sorted queue: critical/stale first, then newest | desktop list/detail; mobile route stack | critical |
| SCN-REV-02 | open technical proposal | first pane states requested effect, observed behavior/change, unresolved; no diff first | system-effect summary card | critical |
| SCN-REV-03 | inspect evidence | executed tests/artifacts/sources separate agent claims from observed evidence | evidence chips with provenance state | critical |
| SCN-REV-04 | expand architecture | diagram/components/tradeoff appears without losing decision controls | accordion/tabs below evidence | normal |
| SCN-REV-05 | expand implementation | files/diff/log available in deepest disclosure; monospace only there | bounded diff viewer | normal |
| SCN-REV-06 | accept valid proposal | stale check → transactional apply/record or project-specific acceptance → success state | sticky action bar; deliberate confirmation only for destructive/irreversible | critical |
| SCN-REV-07 | proposal stale | Accept disabled; clear base drift explanation + re-evaluate/rebase route | warning callout with exact changed base | critical |
| SCN-REV-08 | request revision | user provides concise correction attached to same proposal/mission lineage | revision sheet, prior evidence preserved | high |
| SCN-REV-09 | reject | canonical state unchanged; rationale optional except high-risk policy; proposal retained | no destructive deletion wording | high |
| SCN-REV-10 | preserve residue | proposal/artifact kept as residue with no active authority | explicit residue tag | normal |

## F. Output / artifacts

| ID | Trigger | Required result | Design consequence | Risk |
|---|---|---|---|---|
| SCN-OUT-01 | canonical JSON + generated HTML exist | labels clearly distinguish editable source vs distributable artifact | canonicality badge + lineage link | critical |
| SCN-OUT-02 | image/audio/video/PDF/text | medium-appropriate safe preview | preview stage prioritizes artifact, metadata secondary | normal |
| SCN-OUT-03 | HTML artifact | sandboxed preview cannot access parent Workbench | explicit open-external option | critical |
| SCN-OUT-04 | binary/APK | metadata/hash/path only; never auto-execute | utility card | high |
| SCN-OUT-05 | failed/unverified build | remains inspectable but cannot show Verified | verification label independent of existence | critical |

## G. Evidence / external systems

| ID | Trigger | Required result | Design consequence | Risk |
|---|---|---|---|---|
| SCN-EVD-01 | external search hit | hit shows source/system/authority/candidate state | no “AI answer” styling | high |
| SCN-EVD-02 | open derivative/claim | route to canonical/source/original if available | breadcrumb/source route | critical |
| SCN-EVD-03 | capture hit | creates project reference/proposal; external source untouched | Capture ≠ Accept truth | critical |
| SCN-EVD-04 | QMD/Wiki unavailable | graceful degraded state; exact search/local project still usable | compact diagnostic, setup action | normal |

## H. Technical translation / agent evidence

| ID | Trigger | Required result | Design consequence | Risk |
|---|---|---|---|---|
| SCN-TEC-01 | handoff has technical changes | System view shows Intent/Behavior first | summary width ≤70ch | critical |
| SCN-TEC-02 | acronym/technical term | plain system meaning + why it matters; exact detail optional | term popover/glossary chip | high |
| SCN-TEC-03 | agent claims test passed, system did not observe it | mark Claim/Unverified, not Passed | provenance icon/label | critical |
| SCN-TEC-04 | observed test fails | review can proceed but cannot become Verified | failed verification state persistent | critical |
| SCN-TEC-05 | 20k-line log | log stays collapsed/lazy; UI remains responsive | no streaming prose in primary surface | high |

## I. Failure / recovery / safety

| ID | Trigger | Required result | Design consequence | Risk |
|---|---|---|---|---|
| SCN-ERR-01 | invalid canonical record | identify file/object/error and safe state; unaffected project still opens if possible | error page with repair route | high |
| SCN-ERR-02 | staged proposal apply fails | original canonical state restored; exact resulting safe state reported | recovery receipt | critical |
| SCN-ERR-03 | dirty repo before mission | dirty state shown; isolated strategy required; no overwrite | preflight block/callout | critical |
| SCN-ERR-04 | path traversal/symlink escape | mutation rejected before write | security event not generic error | critical |
| SCN-ERR-05 | shell metacharacters in mission text | treated as data, not command | no UI special case; process manager proof | critical |
| SCN-ERR-06 | `.env`/secret path in context | excluded + user-visible protected exclusion | lock icon + reason | critical |

## J. Responsive / accessibility / mixed language

| ID | Trigger | Required result | Design consequence | Risk |
|---|---|---|---|---|
| SCN-RSP-01 | width < 760px | bottom nav or compact header exposes all five primary views; no horizontal nav scrolling | mobile shell transformation | critical |
| SCN-RSP-02 | width 760–1179px | compact icon rail/header; detail panels become overlays | tablet/compact contract | high |
| SCN-RSP-03 | width ≥1180px | persistent 72px rail + max-width workspace + optional 360–420px inspector | desktop contract | normal |
| SCN-RSP-04 | 320px or 200% zoom | primary content/actions reflow; no horizontal page overflow | action bars wrap/stack | critical |
| SCN-RSP-05 | landscape mobile/keyboard | sheet content remains scrollable and decision actions reachable | dynamic viewport units | high |
| SCN-A11Y-01 | keyboard only | project → Focus → Field/list → Work → Review → decision possible | visible focus + skip/main landmarks | critical |
| SCN-A11Y-02 | reduced motion | spatial transitions become near-instant; meaning preserved | CSS media query | normal |
| SCN-A11Y-03 | color unavailable | all states retain labels/icons/shape/border cues | token contract | critical |
| SCN-BIDI-01 | Persian + English ID + number | reading order correct; IDs/code isolated LTR | `dir=auto`, `bdi`, explicit code direction | critical |

## K. Recovery / local-first

| ID | Trigger | Required result | Design consequence | Risk |
|---|---|---|---|---|
| SCN-LOC-01 | delete generated cache/layout | rebuild from canonical records | transient view reset notice only if needed | critical |
| SCN-LOC-02 | optional cloud/Tana unavailable | core remains fully usable for canonical state/review | adapter status only | critical |
| SCN-LOC-03 | browser/app closes during mission | run state reconciles on restart; no false Running forever | recovered/interrupted status | high |

## 2. Critical full case records

### SCN-REV-02 — Technical proposal opens at system effect

**Authority:** HZN-003, DEC-008.  
**Actor:** ACT-HUMAN.  
**Starting state:** proposal under review with structured handoff and observed Git/test evidence.  
**Trigger:** user opens queue item.

**System decision:** compose review model from canonical mission/proposal plus observed evidence; agent prose is not accepted as proof.

**Expected product result:** no project mutation. Review object records opened state only as derived/local preference. Evidence provenance remains explicit.

**Visible/operable experience:**
- header: proposal title, project, risk, freshness;
- first region: `Requested outcome`, `What changed`, `What remains unresolved`;
- second region: `Verification` with observed/claimed distinction;
- artifact preview or system diagram when available;
- collapsed `Architecture` and `Implementation` sections;
- persistent Accept / Request revision / Reject / Preserve actions;
- raw log never automatically expanded.

**Responsive:** two-pane queue/detail ≥1180px; detail overlays/route below that; mobile decision bar remains reachable.

**Accessibility:** page/detail heading receives focus; accordion buttons expose expanded state; decision buttons have unambiguous names; status is announced when action completes.

**Failure/recovery:** stale base discovered while open immediately disables Accept and surfaces SCN-REV-07.

**Negative constraints:** no “Looks good”; no pass claim without observed test; no first-screen diff wall.

**Design acceptance:** first viewport can be understood without horizontal scrolling or reading >~250 words; implementation detail below fold/collapsed.

### SCN-MIS-01 — Guided mission composition

**Authority:** DEC-009, HZN-009.  
**Trigger:** `Work on this` from selected object.

**Expected product result:** draft mission created only after user changes/saves or starts; opening the sheet alone does not mutate canonical project records.

**Visible experience:**
1. **Target** — locked object identity with change target link;
2. **Outcome** — one editable sentence, prefilled from context;
3. **Context** — selected canonical/external references as removable chips, grouped by why included;
4. **Acceptance** — 1–5 observable criteria;
5. **Agent** — capability cards with Available/Unavailable state;
6. `Advanced` — repo/worktree, role, constraints, protected paths.

`Start mission` is primary; `Save draft` secondary; close preserves unsaved fields only in session and asks before destructive discard.

**Negative constraints:** no empty textarea titled Prompt; no automatic inclusion of entire project history; no hidden shell command.

### SCN-FLD-03 — Relation inspection

**Authority:** HZN-006.  
**Expected experience:** relation inspector contains `Participants`, `Classification`, `What the relation says`, `Evidence for`, `Evidence against`, `Uncertainty`, `Use in this project`, `History/trace`. If relation type is unset, label it `Unsettled`; never invent a predicate for display convenience.

### SCN-LOC-01 — Reconstruct after derived-state loss

**Authority:** HZN-001/HZN-008.  
**Precondition:** canonical project files/Git valid.  
**Action:** remove generated cache/layout and restart.  
**Expected:** project list, Focus facts, objects, relations, review queue and artifact registry reconstitute; only manually arranged node coordinates/view preferences may reset.  
**QA handoff:** critical; strongest proof is candidate execution with deletion fixture + restart.

## 3. Cross-factor directed cases

- `SCN-X-01`: stale proposal × accept → Accept disabled, no partial apply.
- `SCN-X-02`: failed verification × review → decision possible but Verified label impossible.
- `SCN-X-03`: dense Field × 320px → Map view defaults to bounded list/card access, graph still reachable deliberately.
- `SCN-X-04`: Persian long text × technical ID × 200% zoom → no overlap, ID remains LTR.
- `SCN-X-05`: dirty Git repo × agent mission → preflight chooses isolated safe strategy or blocks.
- `SCN-X-06`: agent unavailable × saved mission draft → mission preserved, agent switch possible.
- `SCN-X-07`: hostile HTML artifact × preview → sandbox blocks parent/file access.
- `SCN-X-08`: external semantic result × capture × disputed source status → captured reference remains candidate/qualified, not verified.
- `SCN-X-09`: run completes × app restarts before review → review item reconstructed from durable run/handoff/proposal state.
- `SCN-X-10`: mobile review × stale base occurs asynchronously → sticky action bar updates and Accept becomes unavailable with reason.

## v0.3 — Context economy / adaptive representation cases

### SCN-CTX-01 — Normal mission receives minimum sufficient packet
**Starting state:** established project with large history. **Action:** start an implementation mission from a specific object. **Expected:** packet contains objective, relevant accepted decisions, affected object/relation summaries, acceptance/oracles, changed files/snapshots and protected neighbors; unrelated theoretical/history material is absent. Target budget is applied before execution.

### SCN-CTX-02 — Agent expands one omitted dependency
Agent identifies `DEC-018` as insufficient at L1 and requests expansion. Workbench returns L2/L3 for that handle only, records expansion, and leaves unrelated packet content unchanged.

### SCN-CTX-03 — Stable capsule cache hit
A previously fully read source and parser/authority metadata are unchanged. Global/mission context uses the bound capsule and records a cache hit/source identity; no model is asked to resummarize it.

### SCN-CTX-04 — Capsule invalidates and raw source reopens
A source hash, authority role, parser contract, relevant schema, contradiction, relation traversal or systemic claim triggers reopening. Workbench refuses the stale capsule for the affected judgment and routes to source-level material.

### SCN-CTX-05 — Continuation is delta-first
A mission continues from a stored snapshot after three project changes. Packet contains those deltas + unresolved dependencies rather than unchanged project history.

### SCN-CTX-06 — Role-scoped context
The same project question is delegated to Research and Technical roles. Both receive shared objective/authority/acceptance, while Research gets source/claim neighborhoods and Technical gets system/files/tests. Cross-layer detail is expanded only when a dependency is explicit.

### SCN-CTX-07 — Budget pressure escalates instead of truncating truth
Compiler cannot fit necessary evidence in the current budget. It marks the reason, raises the context tier or batches evidence with receipts; it does not silently omit required authority/evidence or invent an answer.

### SCN-CTX-08 — Duplicate context is referenced, not repeated
Multiple relevant records point to the same accepted decision/source. Packet includes one canonical representation and stable references from dependents; duplicate-context ratio stays below configured threshold.

### SCN-CTX-09 — New source has no capsule shortcut
A genuinely new source entering an authoritative/research operation must receive the required first source-level read under its governing source system before a reusable capsule is created.

### SCN-TOK-01 — Structured handoff replaces completion essay
A coding agent completes a mission. Workbench stores structured outcome, changed files, decision/proposal refs, tests, artifacts, blockers and next action within handoff budget. Long explanation is generated only if the user expands a technical/rationale view.

### SCN-TOK-02 — Deterministic operation does not call a model
Status aggregation, accepted-count display, diff metadata, cache validity and common representation templates are computed locally. Telemetry shows route `NONE` and zero model-input/output tokens.

### SCN-TOK-03 — Routing escalates by semantic need
Classification/compaction that meets quality threshold uses `LIGHT`; cross-source theoretical synthesis/architecture decision uses `STRONG`; implementation uses configured `CODING_AGENT`; independent QA cannot reuse the implementing run as adjudicator.

### SCN-GUI-01 — Re-entry uses deterministic orientation first
Opening Focus renders current question, state, Needs You, last accepted decision/output and next action immediately from structured state without a model call. Adaptive representation may be requested after orientation is visible.

### SCN-GUI-02 — Adaptive compare view
User asks to compare two interpretations/artifacts. Representation planner selects `compare` micro-library and passes only relevant compact records. OpenUI composes a comparison/evidence/action view; canonical facts remain reference-backed.

### SCN-GUI-03 — Adaptive system explanation
User requests system-level understanding of technical work. `system` micro-library renders Intent → Behavior → Architecture → Verification with implementation detail collapsed; technical terms expose brief definitions and exact evidence refs.

### SCN-GUI-04 — Generated UI failure falls back safely
OpenUI output is malformed, invokes unknown components/actions, exceeds generation budget or times out. Workbench rejects it and renders the deterministic semantic fallback with the same critical information/actions.

### SCN-GUI-05 — Generated action cannot bypass proposal boundary
A generated component requests a consequential change. Only allowlisted `create_proposal`/mission/read actions are available. No generated action can call canonical write/accept directly.

### SCN-GUI-06 — Generated view preserves accessibility and responsive reachability
Every allowed semantic component has owned accessibility/responsive behavior. Generated composition cannot suppress required labels, primary actions, focus restoration or mobile reachability.

### SCN-GUI-07 — Small library selected before prompt generation
Planner selects exactly one bounded component micro-library based on explicit intent/state. The model is not sent the entire Mozare component catalog.

### SCN-MET-01 — Token metrics are quality-linked
Each model/agent run records route, input/output token counts when available, compiled context token estimate, cache hits, expansion count, duplicate ratio and linked mission/test outcome. Metrics never contain secret values or hidden reasoning.

### SCN-MET-02 — Efficiency regression blocks optimization claim
A new context policy reduces tokens but increases critical QA defects, unresolved expansions, failed tasks or human re-entry/comprehension cost. It cannot be accepted as an efficiency improvement solely from lower token counts.
