# P10 QA Addendum — Cross-Harness Continuity

## GATE-HARNESS-CONTINUITY

One unchanged candidate must prove:

1. stable project/mission/task identity survives Codex → Claude Code → Hermes → Codex continuation;
2. every run records harness, time, actual observable model/effort, candidate, changes, evidence, remaining work, and structured handoff;
3. stale task versions cannot overwrite the latest version and parked work is recoverable;
4. all three installed adapters pass capability, harmless mission, safe worktree write, stop, handoff, and restart reconciliation probes;
5. context is rebuilt from bounded canonical/durable refs rather than transcript replay, and the ledger contains no hidden reasoning, prompt bodies, or secrets.

This gate joins `GATE-LIVE`; neither alone permits `OWNER_TEST_READY`.
