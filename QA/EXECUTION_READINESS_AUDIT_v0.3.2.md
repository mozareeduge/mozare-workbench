# Execution Readiness Audit — v0.3.2

**Scope:** fresh-context execution by a comparatively light Codex model. Package documents were treated as specification/evidence; they did not create new user intent.

## Verdict before hardening

`CONTRACT_VALID_BUT_NOT_FRESH_CONTEXT_SAFE`

The v0.3.1 archive passed its package and traceability validators, but four execution defects could cause a light executor to stop or diverge:

1. The mandated `qa_package.py` command rewrote signed `QA_REPORT.md` when local browser evidence differed, causing `verify_manifest.py` to fail immediately afterward.
2. Task cards named module paths that contradicted `REPOSITORY_BLUEPRINT.yaml` (`src/core/git`, `src/core/agents`, `src/core/adapters`, and `src/web/review`).
3. A single task required opening several large authority files even though the declared normal hard budget is 3,200 tokens; there was no deterministic per-task clause extractor.
4. The package specified hidden execution state but supplied no command to initialize, select, freeze, resume, or evidence-gate a task.

## Changes in v0.3.2

- Package QA is read-only by default; optional local reports require `--write-report PATH`.
- Manifest creation excludes Git/runtime/dependency/build/secret artifacts; verification rejects duplicate, inconsistent, and escaping paths.
- Task-card paths are aligned to the locked repository blueprint, and execution-contract validation checks that alignment.
- `scripts/execution_loop.py` now provides `bootstrap`, `status`, `next`, `packet`, `start`, `complete`, and `block`.
- Task packets contain exact mapped scenario/oracle/test clauses and a compact invariant kernel; packet size is measured against the 3,200-token hard limit.
- The selected implementation harness/model/continuity policy is frozen in `EXECUTION/CODEX_HARNESS_PROFILE.yaml`.
- Fresh-context and system-level runbooks are supplied without asking the executor to reconstruct earlier chats.

## Remaining proof boundary

This audit proves handoff readiness only. It does not prove the unbuilt production application, runtime isolation, real agent adapters, OpenUI behavior, Windows launcher, or pilot value. Those remain governed by the DAG and finalization checklist.

