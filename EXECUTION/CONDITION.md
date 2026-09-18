# Workbench condition (live snapshot)

Generated: 2026-09-18T20:24:05+03:30 — by `python scripts/condition_snapshot.py`. Regenerate after every completed task and commit.

## Execution loop state

```
Progress: 19/31 tasks complete
Active: none
Next ready: TASK-P04-02
HEAD: c778bfeef2edaa9fac56a0317042836f08734133
Worktree: clean
```

## Next ready task

```
TASK-P04-02
```

HEAD at snapshot: `c778bfeef2edaa9fac56a0317042836f08734133`

## How to verify this condition yourself

1. `python scripts/execution_loop.py status` — progress, active task, HEAD, tree state.
2. `npm run typecheck && npm run lint && npx vitest run` — the full local gate.
3. `python scripts/execution_loop.py packet` — the active task packet (scenarios, oracles, scope).

Never hand-edit loop state; only the loop CLI mutates it. Structured handoffs for every
completed task live in the loop's execution directory (see EXECUTION/ handoff docs).
