# Fresh Codex Context — Mozare Workbench Execution

Use model `gpt-5.6-terra`. Use `medium` reasoning for implementation. Use a separate fresh `high`-reasoning context only for final independent QA or a recorded escalation.

You are implementing the local Mozare Workbench. Product meaning is frozen; your job is one bounded task plus observed proof.

1. Read `AGENTS.md` and `START_HERE_PROMPT.md` completely.
2. Run `python scripts/execution_loop.py status`.
3. If state is absent, run `python scripts/execution_loop.py bootstrap` once. Do not initialize or overwrite Git automatically; stop if the prepared baseline repository is absent or dirty.
4. Run `python scripts/execution_loop.py start`. Open only the emitted task packet plus the source files named by it. Do not preload the package or historical material.
5. Characterize, implement, test, and commit exactly that task. Replace the generated handoff template with observed results; every required `TEST-*` entry must cite actual evidence and say `passed` before completion.
6. Run `python scripts/execution_loop.py complete`. If it refuses advancement, fix the stated evidence/state defect; do not edit the loop state manually.
7. Record a compact private `harness-mem` checkpoint: task ID, commit, gate result, changed paths, residual risk, and next ready task. End the context after one task unless the context remains small and the next task is purely deterministic.

Never self-accept a proposal, treat a model claim as test evidence, rewrite protected authority to fit code, or claim owner acceptance/public release. The terminal engineering state is `CANDIDATE_READY_FOR_REVIEW`.

