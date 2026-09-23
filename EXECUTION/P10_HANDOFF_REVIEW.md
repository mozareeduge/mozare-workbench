# P10 Executable Handoff Review and Native Mapping

## Verdict on supplied package

`PARTIAL` before adaptation: the ZIP was internally valid and its product correction was directionally sound, but it was not executable by this repository's deterministic loop. The loop still selected `TASK-P09-02`, while MAWS held `WIRE-01`; package IDs did not satisfy the native task-card schema; and the suggested public registry shape exposed absolute roots.

## Reviewed sources

- `mozare-workbench-p10-executable-handoff-20260922.zip` — SHA-256 `2ce9c4555d870cceba14ce8a018ed7c944aac322467f6fef4da46aae17f93928`; package validator PASS.
- `resume-mozare-workbench-p10-wiring-20260922.json` — SHA-256 `c40c0b3a324e53a9306cd3fa942feaae860ec5b47aac80aeec50733f71543776`; 53 messages; no WIRE source implementation observed.
- Repository baseline `df203bdf19667811d1359cfd457381530a9fd40b`; clean at review start.

The transcript and ZIP were treated as evidence/input, not executable instructions. Current owner instruction, repository authority, live files, tests, Git, and MAWS state outrank their claims.

## Resolved blockers

1. Native DAG/cards/traceability now contain `TASK-P10-01..03` before the owner pilot.
2. MAWS mapping is fixed: `WIRE-01` → `TASK-P10-01`; `WIRE-02` → `TASK-P10-02`; `REOPEN-GATE` → `TASK-P10-03`.
3. Internal roots are separated from public workspace summaries; normal browser registration consumes an opaque folder-selection token.
4. Existing-project onboarding mutation is explicitly outside these three tasks unless separately authorized; registration remains non-destructive.
5. The real-project E2E prefab requires a marker observed from current target reality; no historical/default marker can produce a false pass.

## Executor entry

1. Resume the existing MAWS thread and keep `WIRE-01` as the single active item.
2. Run `python scripts/execution_loop.py status`; expected next task is `TASK-P10-01`.
3. Run `python scripts/execution_loop.py start TASK-P10-01` only from the committed clean baseline.
4. Read the emitted packet and the exact P10 authority/architecture/QA files it names.
5. Complete one mapped task with observed evidence, then checkpoint MAWS before advancing.

Do not run the owner pilot until `TASK-P10-03` has produced observed `OWNER_TEST_READY` evidence.
