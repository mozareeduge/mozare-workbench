# Workbench condition (live snapshot)

Generated: 2026-09-19T14:13:26+03:30 — by `python scripts/condition_snapshot.py`. Regenerate after every completed task and commit.

## Execution loop state

```
Progress: 24/31 tasks complete
Active: none
Next ready: TASK-P07-01
HEAD: 7f360c0f217d37c09a140004f7881aa40bb7a3f1
Worktree: clean
```

## Next ready task

```
TASK-P07-01
```

HEAD at snapshot: `7f360c0f217d37c09a140004f7881aa40bb7a3f1`

## How to verify this condition yourself

1. `python scripts/execution_loop.py status` — progress, active task, HEAD, tree state.
2. `npm run typecheck && npm run lint && npx vitest run` — the full local gate.
3. `python scripts/execution_loop.py packet` — the active task packet (scenarios, oracles, scope).

Never hand-edit loop state; only the loop CLI mutates it. Structured handoffs for every
completed task live in the loop's execution directory (see EXECUTION/ handoff docs).
