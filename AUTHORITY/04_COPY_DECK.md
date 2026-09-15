# 04 — Consequential Copy Deck

Exact wording may be localized later; semantic meaning and causal clarity are frozen. Avoid generic AI rhetoric.

| ID | Scenario | Location | Copy / template |
|---|---|---|---|
| COPY-001 | SCN-ORI-02 | first use | **Choose a local project folder** — Mozare Workbench keeps its canonical project records in ordinary local files. |
| COPY-002 | SCN-FOC-01 | next action | **Next meaningful action** |
| COPY-003 | SCN-MIS-02 | agent unavailable | **{agent} is not available on this machine.** The mission can stay as a draft or use another available agent. |
| COPY-004 | SCN-MIS-03 | validation | **Add at least one observable acceptance criterion before starting.** |
| COPY-005 | SCN-MIS-04 | run receipt | **Mission started.** Project truth has not changed; implementation work is isolated until review. |
| COPY-006 | SCN-MIS-05 | stopped | **Mission stopped.** Canonical project state was not changed. Partial work is preserved for inspection. |
| COPY-007 | SCN-REV-03 | evidence provenance | `Observed` / `Agent claim` / `Not verified` |
| COPY-008 | SCN-REV-07 | stale | **This proposal is based on an older project state.** Review the newer changes before accepting it. |
| COPY-009 | SCN-REV-08 | revision | **What should change in the next pass?** |
| COPY-010 | SCN-REV-10 | residue | **Preserve as residue** — keep this material available without making it active authority. |
| COPY-011 | SCN-OUT-01 | artifact | `Canonical / editable` · `Generated / distributable` · `External` · `Temporary` |
| COPY-012 | SCN-OUT-05 | verification | **Unverified artifact** — the artifact exists, but required verification has not passed. |
| COPY-013 | SCN-EVD-03 | capture | **Capture reference** — add this source to the project as a candidate reference. This does not verify the claim. |
| COPY-014 | SCN-EVD-04 | degraded | **Semantic source search is unavailable.** Local project work remains available. |
| COPY-015 | SCN-TEC-03 | test claim | **Claimed by agent; not observed by Workbench.** |
| COPY-016 | SCN-ERR-01 | invalid record | **This project record could not be loaded.** `{path}` has `{error}`. Other valid project records were left unchanged. |
| COPY-017 | SCN-ERR-02 | apply rollback | **The change was not applied.** The previous canonical state was restored. |
| COPY-018 | SCN-ERR-03 | dirty repo | **This repository already has uncommitted work.** Start in an isolated worktree or finish the existing changes first. |
| COPY-019 | SCN-ERR-06 | protected | **Protected file excluded:** `{path}` was not added to agent context. |
| COPY-020 | success | review decision | **Accepted.** The proposal is now part of the project record. |
| COPY-021 | reject | review decision | **Rejected.** Canonical project state was not changed. |
| COPY-022 | cache rebuild | startup | **View state rebuilt from canonical project records.** |
| COPY-023 | no reviews | Review empty | **Nothing needs your judgment right now.** Completed agent work will appear here before it can change canonical project state. |
| COPY-024 | no output | Output empty | **No registered output yet.** Artifacts produced by missions or captured manually will appear here with their source and verification state. |
| COPY-025 | relation unsettled | Field | **Unsettled relation** |
| COPY-026 | run status | ambient | `{agent} · {phase} · {elapsed}` |
| COPY-027 | safe state error | error receipt | **What remains safe** / **What was not changed** / **Next action** |

## Tone/function rules

- state what happened before interpretation;
- name the affected object;
- state preservation/safety when failure could imply loss;
- give one next viable action when one exists;
- never use “success” for unverified completion;
- never say “saved” when data only exists in temporary/browser recovery state;
- never say “published/deployed” until the actual external/public target is verified;
- use `accepted`, `verified`, `released`, `deployed`, and `owner-approved` as separate states.

## v0.3 adaptive/context copy

- **COPY-CTX-01:** `More context is required to continue accurately.`
- **COPY-CTX-02:** `Expanding {reference} — the rest of the project stays compact.`
- **COPY-CTX-03:** `This source changed; its compact evidence capsule cannot be reused.`
- **COPY-GUI-01:** `Adaptive view unavailable. Showing the stable project view instead.`
- **COPY-MET-01:** `Efficiency is measured with task quality, not token count alone.`

These messages appear only when the condition materially affects the user. Routine cache hits/budget operation remain quiet.
