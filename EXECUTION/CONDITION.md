# Workbench condition (live snapshot)

Generated: 2026-09-18T21:59:39+03:30 — by `python scripts/condition_snapshot.py`. Regenerate after every completed task and commit.

## Execution loop state

```
Progress: 22/31 tasks complete
Active: none
Next ready: TASK-P05-06
HEAD: 8d0112349ba6e48a27f5f1fc1dad61ea3711cf18
Worktree: clean
```

## Next ready task

```
TASK-P05-06
```

HEAD at snapshot: `8d0112349ba6e48a27f5f1fc1dad61ea3711cf18`

## How to verify this condition yourself

1. `python scripts/execution_loop.py status` — progress, active task, HEAD, tree state.
2. `npm run typecheck && npm run lint && npx vitest run` — the full local gate.
3. `python scripts/execution_loop.py packet` — the active task packet (scenarios, oracles, scope).

Never hand-edit loop state; only the loop CLI mutates it. Structured handoffs for every
completed task live in the loop's execution directory (see EXECUTION/ handoff docs).
