# Claude Code Handoff — live state 2026-09-20 (~21:15 +03:30)

Prepared by the Hermes orchestrator when execution moved from the Hermes lane to
Claude Code. Everything below was verified from live commands immediately before
writing. Live `python scripts/execution_loop.py status` always supersedes the
counts here.

## Read order

1. This document.
2. `CLAUDE.md`, `AGENTS.md`, `START_HERE_PROMPT.md`.
3. `EXECUTION/ALTERNATE_HARNESS_HANDOFF.md` — conventions, completed-ledger
   detail, authority order (its per-task counts are dated 2026-09-17; stale).
4. `python scripts/execution_loop.py status`.

## Where the work lives

- **Main repo:** `C:\Users\Zarinpal\Documents\Mozare_Workbench_Handoff_v0.3.2_READY\Mozare_Workbench_Handoff_v0.3.2`
  (branch `main`, remote `github.com/mozareeduge/mozare-workbench`).
- **Trackb worktree:** `...\Mozare_Workbench_Handoff_v0.3.2_trackb`
  (branch `track-b-web`). Used for the P08-02 lane; **never run
  `execution_loop.py` there** — loop state lives only in main.
- `...\Mozare_Workbench_Handoff_v0.3.1_ORIGINAL_VERIFY\` and
  `...\Mozare_Workbench_Handoff_v0.3.2_READY.zip` are the frozen original Sep-15
  package snapshot — reference only, NOT current state; never restore from them.

## Verified current state (2026-09-20T21:14+03:30)

- Loop: **26/31 complete; active: none; next ready: TASK-P08-02.**
- HEAD `main`: `6dc3608d5cfb56d7226965b01ed54adf515bcdf1` — merge of track-b-web
  P08-01 (responsive hardening; RED db36ebf, GREEN afa51f7, evidence 1a24a4b).
- Trees clean; `origin/main` in sync.
- Gates at HEAD: typecheck 0, lint 0, vitest 169 tests, Playwright 25/25
  (P06/P07-era); the P08-01 merge re-verified 39 Playwright passes on the
  worktree before merge.

## Stale claim resolved

`.git/mozare-workbench-execution/scratch/ACTIVE-CLAIM-P08-02.txt` was a
2026-09-20T08:52Z inline-takeover claim by a Hermes orchestrator session that
**never started work** — verified zero commits on `track-b-web` after `1a24a4b`
(Sep 19) through 2026-09-20T21:15. The preparing orchestrator deleted the claim.
If no claim file exists, you own TASK-P08-02: re-write your own
`scratch/ACTIVE-CLAIM-<task>.txt` before work (claim discipline: one writer per
tree, claim + brief entry before work).

## Next work: TASK-P08-02, then P08-03, then P09

- **TASK-P08-02 — Harden keyboard, focus, reduced motion and bidi handling.**
  Card: `EXECUTION/TASK_CARDS.yaml` → `TASK-P08-02` (required reads listed on
  the card). Tests: `TEST-015`, `TEST-016`. Scenarios: `SCN-A11Y-01/02/03`,
  `SCN-BIDI-01`, `SCN-X-04`. Gate: `GATE-A11Y`.
- Strict TDD convention (observed, reuse it): RED first — run, observe failure,
  commit; GREEN smallest change — run to green, full gates
  `npm run typecheck && npm run lint && npx vitest run && npx playwright test`;
  commit; evidence file (observed numbers only); if on the trackb worktree,
  merge `--no-ff` to main; fill loop handoff; `execution_loop.py complete`.
- **TASK-P08-03** — security tests (deps already met on main).
- **TASK-P09-01** — Windows launchers/recovery diagnostics.
- **TASK-P09-02 / P09-03** — owner-gated (real pilot, release freeze). Never
  fabricate pilot or owner-acceptance evidence; unresolved pilot evidence ends
  in `CANDIDATE_READY_FOR_REVIEW`, never "released".

## Completed ledger (26)

| Task | Candidate |
|---|---|
| P00-01..P00-04 | `673a465a1732`, `ed2a1d76ec3a`, `a23f044f62ff`, `fde0a7cad934` |
| P01-01/02 | `a91b32e64afc`, `7c4163ff8a82` |
| P02-01..04 | `cf8e75c6d9bd`, `795a8430b042`, `96a073e134ff`, `6aa76a01bbd9` |
| P03-01/02 | `91ec9138c41d`, `7ac9bff6b2ff` |
| P04-01..05 | `d479e03b47e4`, `dcbea54d35d6`, `60f79023d6ca`, `4df1893d08c1`, `8f990877bc47` |
| P05-01..06 | `909c735fef4f`, `7ce188a6b7b6`, `c778bfeef2ed`, `b00d4440dcb7`, `8d0112349ba6`, `1135bfab2189` |
| P06-01 | `7f360c0f217d` |
| P07-01 | `efd76f7f1470` |
| P08-01 | `6dc3608d5cfb` (merge) |

Structured per-task results: `.git/mozare-workbench-execution/handoffs/*.json`.

## Operational gotchas (observed by prior orchestrators)

- `execution_loop.py` needs `pyyaml` in the *active* Python — run loop commands
  from a shell whose Python has it, not an arbitrary kernel interpreter.
- Loop `complete` requires `candidate_id == current HEAD full SHA` and a clean
  tree; the handoff template-placeholder check scans **all** string fields
  (no "Replace with" anywhere); `summary` maxLength 800.
- `git commit -m` through a single shell string breaks on spaces — use argv
  list form.
- After every completed task: `python scripts/condition_snapshot.py`, commit.
- Do not push (owner/orchestrator channel handles the remote); do not
  self-accept proposals; never edit loop state JSON by hand; never report
  tests from an earlier tree as evidence for the current one.

## Verify anytime

```bash
python scripts/execution_loop.py status
npm run typecheck && npm run lint && npx vitest run
npx playwright test
```
