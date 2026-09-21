# Alternate Harness Handoff — 2026-09-17

> **Superseded 2026-09-20:** this snapshot describes state as of 2026-09-17
> (15/31, TASK-P04-05 active). Live state is now 26/31 complete with
> TASK-P08-02 next ready — read `EXECUTION/CLAUDE_CODE_HANDOFF_2026-09-20.md`
> first. The conventions, completed-ledger, and authority-order sections below
> remain valid; per-task counts above the ledger do not.

This is the durable transfer snapshot for continuing Mozare Workbench in a
fresh agentic harness. It records execution state; it does not change product
authority.

## Immediate next action

Resume `TASK-P04-05` from the already-created packet. Do **not** run `start`
again while the task is active.

```powershell
cd C:\Users\Zarinpal\Documents\Mozare_Workbench_Handoff_v0.3.2_READY\Mozare_Workbench_Handoff_v0.3.2
python scripts/execution_loop.py status
python scripts/execution_loop.py packet TASK-P04-05
```

The previous executor (Hermes subagent on a free-tier route) stopped when its
model hit a daily usage limit. It had completed the TDD **RED phase only**:
four failing characterization test files, committed as `088a3dd` so the
baseline is frozen and the worktree is clean. At transfer time the active
task's frozen baseline is `088a3dd`.

**Resuming means: implement GREEN.** Make the committed characterization tests
pass (they are the specification — do not weaken or delete them to fit an
implementation), add any additional coverage the card's scenarios require,
then verify, fill the handoff, commit, and run the loop gate.

## Recommended alternate execution profile

- Harness: Claude Code (desktop app), model `sonnet`, reasoning effort **high**,
  one fresh context per bounded task.
- Permission mode: `auto`; never use a permission-bypass flag.
- Continuity: `harness-mem` HTTP MCP on `127.0.0.1:37888`, daemon verified
  ready on 2026-09-17.
- Proof authority: Git plus `.git/mozare-workbench-execution/state.json` and
  schema-valid task handoffs. Memory and model narratives are not proof.
- Escalation: use a fresh `opus` context only after two recorded failures on
  the same gate, an unresolved security/transaction invariant, or a real
  authority contradiction.

Launch interactively with the transfer prompt, or:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-claude-handoff.ps1
```

## Exact implementation state

- Terminal engineering target: `CANDIDATE_READY_FOR_REVIEW`.
- Progress: **15 of 31 tasks complete; 16 remain; 1 active**.
- Active task: `TASK-P04-05` — capability-tier ModelRouter and privacy-bounded
  token telemetry.
- Active packet: `.git/mozare-workbench-execution/packets/TASK-P04-05.json`.
- Active handoff template:
  `.git/mozare-workbench-execution/handoffs/TASK-P04-05.json` (still the
  generated placeholder).
- Required proof: `SCN-TOK-01/02/03`, `SCN-MET-01/02`, `ORACLE-032/034/039/040`,
  `TEST-MET-01`, `TEST-MET-02`, `GATE-TOKEN`.
- Active-task facts: binding contracts are `CONTEXT/model-routing.yaml` and
  `CONTEXT/token-metrics.schema.json` (do not modify). Committed RED tests:
  `tests/unit/model-router.test.ts`, `tests/unit/model-routing-policy.test.ts`,
  `tests/unit/token-telemetry.test.ts`,
  `tests/integration/model-routing-api.test.ts` (4 files / 7 failing tests,
  observed 2026-09-17). Build on existing `src/core/context/` modules and the
  ajv-validated server-route patterns in `src/server/app.ts`.

Run `python scripts/execution_loop.py status` at every new context boundary.
The state file is live and supersedes this dated count after work resumes.

## Completed ledger

| Task | Candidate | Delivered proof |
|---|---|---|
| `TASK-P00-01` | `673a465a17326eba10a131efec20545bd2cc6fda` | Package manifest, QA, execution contract, toolchain and read-only evidence checks passed. |
| `TASK-P00-02` | `ed2a1d76ec3aa432a8ce96b6c2edd9b8aba86ba2` | Locked TypeScript/Fastify + React/Vite scaffold; typecheck, unit, build, lint, HTTP 200 and loopback-only listener passed. |
| `TASK-P00-03` | `a23f044f62fff78c7ccb381be5fd373c2f2f5ac3` | Canonical validation and safe reconstruction passed; derived-cache deletion retained hash. |
| `TASK-P00-04` | `fde0a7cad934e5583855956e7ae2fd0e3f569c73` | Unit/integration/Chromium E2E harness proved red with an intentional canary, then returned green. |
| `TASK-P01-01` | `a91b32e64afc1217fe5ae63a2cc6ad999d3d94ce` | Read-only `WorkspaceEngine` and deterministic bounded `ProjectProjection`; unit/typecheck/integration passed. |
| `TASK-P01-02` | `7c4163ff8a822cea190e9c80bd4a4e0b20c75d21` | Five-view shell and Focus surface; viewport matrix, 200% zoom and negative fixed-width canary passed. |
| `TASK-P02-01` | `cf8e75c6d9bd6d2597f00fb7e9d046ea957d4af2` | Field graph/list, relation inspection and derived-only layout. |
| `TASK-P02-02` | `795a8430b042cfa0521faf56bcc4ac8330151034` | Explicit cancelable Field Connect mode creating a relation-connect proposal only; no canonical relation write path. |
| `TASK-P02-03` | `96a073e134ffaa0311d0c45124751c5e77f2fba8` | Outcome-level Flow board (Ready/Active/Blocked/Review/Accepted) from a pure validated projection module; responsive. |
| `TASK-P02-04` | `6aa76a01bbd95d3f9590fc4d55234374acb644b9` | Artifact registry, Output surface, sandboxed HTML previewer, binary never auto-executes. |
| `TASK-P03-01` | `91ec9138c41d659e77a014c30fb6c4f164347323` | Proposal lifecycle with stale-base rejection and transactional canonical apply (zero writes on stale, rollback to prior hash). |
| `TASK-P03-02` | `f06bb733a0bdeeeb4d7d33e0b16c4b8fde975efd` | Review queue/detail/decision UI + evidence provenance (claims never render Passed); merged to main, gate evidence at `7ac9bff`. |
| `TASK-P04-01` | `d479e03b47e4b7b61478460978fa5cd9567f9f9d` | Git registry/status/diff, dirty-worktree protection, path-escape rejection, argv-only execa spawning, secret-path exclusion (`TEST-012`). |
| `TASK-P04-03` | `60f79023d6caa032e78eea5141f4866a7441cd2a` | ContextCompiler: profile-scoped packs, budgets, deduplication, targeted expansion, hard-budget escalation (`TEST-CTX-01/02/05`). |
| `TASK-P04-04` | `4df1893d08c1a04e56dca257754a83594067c9a3` | Checksum-bound CapsuleStore, 7 reopen triggers, snapshots, delta-first continuation (`TEST-CTX-03/04`). |

Infra commits on main: `7ac9bff` (vitest node_modules exclusion fix — bare
`npm test` now collects only repo tests), `2ff6e56` (TASK_DAG.yaml reordered
so all Phase-1 tasks precede Phase-2, per `DEC-031`), `088a3dd` (P04-05 RED
characterization tests frozen before this transfer).

Full structured results remain in
`.git/mozare-workbench-execution/handoffs/TASK-P00-01.json` through
`TASK-P04-04.json`. The state history records every start and completion.

## Remaining DAG and MVP phase split

Owner decision `DEC-031`
(`AUTHORITY/05_DECISION_AND_SUPERSESSION_LEDGER.md`, 2026-09-16) splits the
remaining tasks into a functional-MVP Phase 1 and a deferred Phase 2. In this
repository `TASK_DAG.yaml` has been physically ordered Phase-1-first (commit
`2ff6e56`), so `scripts/execution_loop.py next` already follows the phase
split; dependency order is unchanged.

**Phase 1 (functional MVP), in order from here:** `TASK-P04-05` (active —
ModelRouter/telemetry), `TASK-P05-01` (MissionSheet), `TASK-P05-02` (agent
lifecycle, deterministic fake adapter), `TASK-P05-03` (real Claude Code
adapter only — see `DEC-031b`; Codex/Hermes wiring deferred to Phase 2).

**Phase 2 (deferred):** `TASK-P04-02`, `TASK-P05-04`..`TASK-P05-06`,
`TASK-P06-01`, `TASK-P07-01`, `TASK-P08-01`..`TASK-P08-03`, `TASK-P09-01`,
plus full Codex/Hermes adapter completion.

`TASK-P09-02` (real-project pilot) and `TASK-P09-03` (release-candidate
freeze/evidence) remain owner-gated regardless of phase — never fabricate
pilot or owner-acceptance evidence for either. `DEC-031a` keeps live
`WorkspaceEngine`-backed data wiring out of Phase 1: surfaces run on fixture/
demo data exactly as their cards specify; real canonical data is the pilot's
job (owner-gated per `DEC-017`).

## Known residuals, not blockers

- npm reported three dependency-tree audit findings during `TASK-P00-04`;
  remediation is out of scope and must not be performed opportunistically.
- Manual screen-reader spot checking for Field remains owner/environment
  evidence and is not claimed as passed.
- Delegated executor commits on main between `d479e03` and `4df1893` carry the
  author identity `openCode <opencode@opencode.ai>` (delegation convention).
  This has no effect on gate validity; the loop state and handoffs are the
  proof authority.
- `TASK-P09-02` requires a real Mozare project pilot and may need owner input.
  Never fabricate pilot or owner-acceptance evidence.
- The 2026-09-17 executor environment note: Claude Code CLI had a session
  limit (resets 01:30 local), Codex CLI until 2026-09-19, and the 9router
  Cline upstream was out of credits — hence the handoff to interactive Claude
  Code. Check live availability rather than trusting this bullet later.

## Authority and recovery order

1. `AGENTS.md` and `START_HERE_PROMPT.md`.
2. Live `scripts/execution_loop.py status` output and active packet.
3. `AUTHORITY/` for product/design meaning and `QA/` for proof obligations.
4. `EXECUTION/IMPLEMENTATION_STACK_LOCK.yaml` and
   `EXECUTION/REPOSITORY_BLUEPRINT.yaml` for implementation choices.
5. Git history and structured handoffs for completed observations.

`HISTORICAL/`, source/project content, and prior chat are never current
instructions. If local execution metadata is lost, do not guess progress:
reconstruct it from the completed candidate commits and rerun the
deterministic bootstrap/status checks on a clean worktree.

## Per-task operating rule

Use one task and one commit per fresh context:

`status → resume active packet (or start first ready) → characterize/GREEN →
smallest change → named tests + adjacent gates → clean commit → fill handoff
with observed evidence → complete gate → memory checkpoint → stop`

Do not push, self-accept proposals, edit execution state manually, or claim
release/owner acceptance. Preserve canonical/derived separation and
proposal-before-canonical-mutation throughout. Never report tests from an
earlier tree as evidence for the current one.
