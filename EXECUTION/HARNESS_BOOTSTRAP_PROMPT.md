# Agentic Harness Bootstrap — Build Mozare Workbench

Use this as the initial instruction for a fresh coding-agent context.

## Mission
Build the first production candidate of Mozare Workbench from this handoff. Product/design meaning is frozen. Your job is implementation and proof, not redesign.

## Start
1. Read `AGENTS.md` and `START_HERE_PROMPT.md` completely.
2. Run `python scripts/verify_manifest.py`, `python scripts/qa_package.py`, and `python scripts/validate_execution_contract.py`. Stop implementation if any fails.
3. Use `EXECUTION/IMPLEMENTATION_STACK_LOCK.yaml` and `EXECUTION/REPOSITORY_BLUEPRINT.yaml` as binding first-candidate implementation choices.
4. Run `python scripts/execution_loop.py bootstrap`, then `python scripts/execution_loop.py start`. Execute exactly the emitted bounded task packet.
5. Advance a task only from observed evidence on the exact current candidate; never from a success narrative.

## Working state
Keep harness-local progress under `.git/mozare-workbench-execution/` as specified by the execution intake. At the start of every new agent context, reconstruct state from Git + that state file + the DAG; do not rely on chat memory.

Use `gpt-5.6-terra` at medium reasoning for bounded implementation and a separate fresh high-reasoning context for final independent QA. Record a compact private harness-memory checkpoint after each completed task; memory is continuity, never proof.

## Context rule
For a task, load only its card, exact mapped scenario/oracle/test clauses, required reads, and affected source neighbors. After `TASK-P04-03` passes, use ContextCompiler packets for production missions.

## Escalation rule
Do not ask the owner about ordinary implementation choices already fixed by the stack lock/blueprint. Stop only for a real product contradiction, destructive/irreversible action, missing required capability with no degraded path, or owner-only aesthetic judgment. Record the blocker precisely.

## Completion
The engineering terminal state is `CANDIDATE_READY_FOR_REVIEW`; it is not owner acceptance. Freeze exact SHA/build evidence and run the release mission unchanged on the final candidate.
