# QA Oracle Register

**QA snapshot:** `MWB-QA-2026-09-15-r4`  
**Authority snapshot:** `MWB-PD-2026-09-15-r3`

Oracles are frozen for this revision. If product/design authority changes, create a new oracle revision rather than editing expected behavior to make tests pass.

| Oracle | Rev | Basis | Source | Statement | Risk |
|---|---:|---|---|---|---|
| ORACLE-001 | 1 | AUTH | HZN-001, SCN-LOC-01 | deleting derived cache/layout cannot delete accepted canonical project truth; reconstruction must succeed | critical |
| ORACLE-002 | 1 | AUTH | DEC-003, SCN-ORI-01 | project entry opens Focus/orientation, never blank chat/transcript | critical |
| ORACLE-003 | 1 | AUTH | SCN-FOC-01 | Focus exposes current objective/question, state, latest accepted decision, human review need, latest output and one next action | high |
| ORACLE-004 | 1 | AUTH | HZN-006, SCN-FLD-03 | relation inspection preserves classification/evidence/uncertainty/use/history and does not infer missing relation semantics | critical |
| ORACLE-005 | 1 | AUTH | SCN-FLD-04 | Field node dragging mutates derived layout only | critical |
| ORACLE-006 | 1 | AUTH | HZN-004, SCN-FLD-05, SCN-REV-06 | consequential agent/connection changes become proposals and require human acceptance | critical |
| ORACLE-007 | 1 | AUTH | SCN-MIS-01 | Work on this opens guided target/outcome/context/acceptance/agent composition, not an empty prompt | critical |
| ORACLE-008 | 1 | AUTH | SCN-MIS-05 | stopping a mission preserves canonical state and preserves inspectable partial work according to policy | critical |
| ORACLE-009 | 1 | AUTH | DEC-008, SCN-REV-02 | technical review first shows human/system effect before architecture/diff/log | critical |
| ORACLE-010 | 1 | AUTH | SCN-REV-03, SCN-TEC-03 | observed evidence is distinguished from agent claims; unobserved test claims cannot appear Passed | critical |
| ORACLE-011 | 1 | AUTH | SCN-REV-07, SCN-X-01 | stale proposal cannot be accepted until re-evaluated/rebased | critical |
| ORACLE-012 | 1 | AUTH | SCN-ERR-02 | failed canonical apply restores prior safe state and reports what changed/not changed | critical |
| ORACLE-013 | 1 | AUTH | HZN-007, SCN-OUT-01 | artifact canonicality and verification are independent and visible | high |
| ORACLE-014 | 1 | AUTH | SCN-OUT-03 | HTML preview is sandboxed from Workbench parent and arbitrary filesystem access | critical |
| ORACLE-015 | 1 | AUTH | HZN-005, SCN-EVD-02/03 | external retrieval remains candidate evidence and exposes route to source/original; capture does not assert truth | critical |
| ORACLE-016 | 1 | AUTH | HZN-003, SCN-TEC-01/02 | technical outputs provide plain system behavior and contextual term explanations before implementation detail | high |
| ORACLE-017 | 1 | AUTH | SCN-ERR-03 | dirty Git state is visible and protected before agent mutation | critical |
| ORACLE-018 | 1 | AUTH | SCN-ERR-04/05/06 | traversal/symlink escape, command injection and protected-secret inclusion are prevented | critical |
| ORACLE-019 | 1 | AUTH | HZN-011 | server binds loopback by default | critical |
| ORACLE-020 | 1 | AUTH | SCN-RSP-01/04 | all primary views/actions remain reachable at 320px and 200% zoom without page horizontal overflow | critical |
| ORACLE-021 | 1 | STANDARD/AUTH | SCN-A11Y-01/02/03 | keyboard, focus, reduced-motion and non-color state cues preserve primary workflow | critical |
| ORACLE-022 | 1 | AUTH | HZN-010, SCN-BIDI-01 | mixed Persian/English/IDs/numbers render without global direction corruption | high |
| ORACLE-023 | 1 | AUTH | HZN-008, SCN-LOC-02 | Tana/cloud/individual model vendor may be unavailable without destroying core project continuity | critical |
| ORACLE-024 | 1 | AUTH | HZN-012 | pilot must measure re-entry, transcript-search, technical comprehension, overload and ceremony cost before product-value claims | high |
| ORACLE-025 | 1 | AUTH | DEC-007, SCN-RSP-01/02/03 | navigation transforms by viewport: rail wide/compact and bottom nav mobile; mobile must not use horizontally scrolling desktop tabs | high |
| ORACLE-026 | 1 | AUTH | UI blueprint | raw agent transcript/log is never automatically streamed in the main workspace | high |
| ORACLE-027 | 1 | AUTH | SCN-OUT-04 | binary artifacts are never automatically executed by preview subsystem | critical |
| ORACLE-028 | 1 | AUTH | SCN-LOC-03 | interrupted/restarted agent runs reconcile to truthful durable state instead of false perpetual Running | high |
| ORACLE-041 | 1 | EXEC | TASK-P00-04 | the test harness proves it can fail: unit/integration/E2E layers are runnable from documented commands and an intentional canary is observed red before the production baseline is accepted | critical |
| ORACLE-042 | 1 | AUTH | SCN-FLO-01..04 | Flow represents outcome state as Ready/Active/Blocked/Review/Accepted; technical subtasks remain nested, blockers/dependencies remain visible, and a completed run awaiting review is never shown Accepted | critical |
| ORACLE-043 | 1 | EXEC | TASK-P00-01 | the distributed handoff matches its manifest, package/contract QA passes without mutating signed evidence, and required local capabilities are observed before implementation | critical |
| ORACLE-044 | 1 | EXEC | TASK-P00-02 | the locked TypeScript/React scaffold installs reproducibly, typechecks, runs a unit smoke, builds, and binds its development server to loopback | critical |

## Heuristic release review

The following are quality risks rather than contractual defects unless owner accepts them as design authority later:

- `ORACLE-H01`: hierarchy feels calm rather than dashboard-dense.
- `ORACLE-H02`: Field supports exploratory thinking without visual clutter.
- `ORACLE-H03`: Review gives enough evidence to decide without generating another textual burden.
- `ORACLE-H04`: aesthetic character remains compatible with Mozare's artistic/research practice rather than generic enterprise SaaS.

## v0.3 context / token / generative-UI oracles

- **ORACLE-029 (AUTH):** Every project-context model/agent execution is associated with a validated compiled context pack or explicit source-level/FULL execution record.
- **ORACLE-030 (AUTH):** Required authority/oracle/protected-neighbor material is never silently truncated to satisfy a token budget; insufficiency escalates/batches or blocks.
- **ORACLE-031 (AUTH):** Valid unchanged capsules can accelerate traversal; new/invalidated/systemically impacted sources trigger source-level reopening according to policy.
- **ORACLE-032 (AUTH):** Ordinary stable UI/state operations use deterministic route `NONE` when no semantic model judgment is needed.
- **ORACLE-033 (AUTH):** Continuations from compatible snapshots are delta-first and do not replay unchanged project history by default.
- **ORACLE-034 (AUTH):** Agent completion persists structured handoff + refs within budget or explicitly records justified overflow; prose repetition is not required for state transfer.
- **ORACLE-035 (AUTH):** Adaptive representation selection is `STATIC → DETERMINISTIC → GENERATIVE_OPENUI`; OpenUI is not the default for common states.
- **ORACLE-036 (AUTH):** OpenUI generation receives one bounded micro-library and a bounded UI context packet, and unknown components/actions cannot render/execute as trusted behavior.
- **ORACLE-037 (AUTH):** Generated UI cannot directly perform canonical mutation or proposal acceptance; write-like generated actions terminate at proposal/request/mission boundaries.
- **ORACLE-038 (AUTH):** OpenUI failure or budget breach preserves critical information/actions through deterministic fallback.
- **ORACLE-039 (AUTH):** Token telemetry is recorded without prompt bodies, hidden reasoning or secret values and is linked to task/QA outcome where available.
- **ORACLE-040 (AUTH):** Efficiency claims require non-regression in critical QA/task success and pilot comprehension/overload measures; token reduction alone is insufficient.
