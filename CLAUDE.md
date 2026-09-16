# CLAUDE.md — Mozare Workbench v0.3

For a resumed implementation handoff, read
`EXECUTION/ALTERNATE_HARNESS_HANDOFF.md` and
`EXECUTION/CLAUDE_CODE_TRANSFER_PROMPT.md` before taking task action. The
execution-loop state, not this file or prior chat, decides whether to resume an
active task or start the next ready task.

Primary mission: execute `EXECUTION/CLAUDE_CODE_EXECUTION_INTAKE.md` through `CANDIDATE_READY_FOR_REVIEW`.

Read `START_HERE_PROMPT.md` first. Do not use `HISTORICAL/` as current authority.

Claude-specific convenience must not alter product architecture. If Claude Code supports richer plans/subagents/worktrees, use them internally while returning the common mission/handoff/evidence model required by the Workbench.

Before edits: freeze repo state. After edits: run the relevant oracle tests against the exact tree. Never report tests from an earlier tree as evidence for the current one.

## v0.3 context rule
Use `$mozare-context-compile` for mission context and `$mozare-represent` for adaptive presentation. Treat OpenUI output as derived/untrusted until schema/action validation. Prefer deterministic route `NONE` whenever structured state is sufficient.


## Light-model execution rule
Use `START_HERE_PROMPT.md` → `EXECUTION/TASK_DAG.yaml` → the single matching entry in `EXECUTION/TASK_CARDS.yaml`. Do not ingest the full package by default. `EXECUTION/IMPLEMENTATION_STACK_LOCK.yaml` is binding for first-release implementation choices.

- `EXECUTION/REPOSITORY_BLUEPRINT.yaml` — exact first-candidate module/file map for small-model implementation.
- `EXECUTION/HARNESS_BOOTSTRAP_PROMPT.md` — ready-to-paste fresh-context instruction for an agentic coding harness.
