# Alternate Harness Handoff — 2026-09-16

This is the durable transfer snapshot for continuing Mozare Workbench in a
fresh agentic harness. It records execution state; it does not change product
authority.

## Immediate next action

Resume `TASK-P02-02` from the already-created packet. Do **not** run `start`
again while the task is active.

```powershell
cd C:\Users\Zarinpal\Documents\Mozare_Workbench_Handoff_v0.3.2_READY\Mozare_Workbench_Handoff_v0.3.2
python scripts/execution_loop.py status
python scripts/execution_loop.py packet TASK-P02-02
```

The previous executor stopped because its model usage quota was exhausted. It
made no source changes. At transfer time the worktree was clean and the active
task's frozen product baseline was
`cf8e75c6d9bd6d2597f00fb7e9d046ea957d4af2`.

## Recommended alternate execution profile

- Harness: Claude Code `2.1.273`, installed and authenticated locally.
- Model: `sonnet` alias, one fresh context per bounded task.
- Permission mode: `auto`; never use a permission-bypass flag.
- Continuity: `harness-mem` HTTP MCP on `127.0.0.1`, verified connected from
  Claude Code on 2026-09-16.
- Proof authority: Git plus `.git/mozare-workbench-execution/state.json` and
  schema-valid task handoffs. Memory and model narratives are not proof.
- Escalation: use a fresh `opus` context only after two recorded failures on
  the same gate, an unresolved security/transaction invariant, or a real
  authority contradiction.

Start the alternate harness with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-claude-handoff.ps1
```

## Exact implementation state

- Terminal engineering target: `CANDIDATE_READY_FOR_REVIEW`.
- Progress: **7 of 31 tasks complete; 24 remain**.
- Active task: `TASK-P02-02` — relation proposal connect mode.
- Active packet:
  `.git/mozare-workbench-execution/packets/TASK-P02-02.json`.
- Active handoff template:
  `.git/mozare-workbench-execution/handoffs/TASK-P02-02.json`.
- Required proof: `SCN-FLD-05`, `ORACLE-006`, `TEST-003`,
  `GATE-INTEGRATION`.
- Active-task invariant: connecting nodes creates a proposal only; no direct
  canonical relation write is exposed.

Run `python scripts/execution_loop.py status` at every new context boundary.
The state file is live and supersedes this dated count after work resumes.

## Completed ledger

| Task | Candidate | Delivered proof |
|---|---|---|
| `TASK-P00-01` | `673a465a17326eba10a131efec20545bd2cc6fda` | Package manifest, QA, execution contract, toolchain and read-only evidence checks passed. |
| `TASK-P00-02` | `ed2a1d76ec3aa432a8ce96b6c2edd9b8aba86ba2` | Locked TypeScript/Fastify + React/Vite scaffold; typecheck, unit, build, lint, HTTP 200 and loopback-only listener passed. |
| `TASK-P00-03` | `a23f044f62fff78c7ccb381be5fd373c2f2f5ac3` | Canonical validation and safe reconstruction passed; derived-cache deletion retained hash `d37cd292b81f125384dece18cb1d084fd9728c7f2cc84c51890acd4045db2245`. |
| `TASK-P00-04` | `fde0a7cad934e5583855956e7ae2fd0e3f569c73` | Unit/integration/Chromium E2E harness proved red with an intentional canary, then returned green. |
| `TASK-P01-01` | `a91b32e64afc1217fe5ae63a2cc6ad999d3d94ce` | Read-only `WorkspaceEngine` and deterministic bounded `ProjectProjection`; unit/typecheck/integration passed. |
| `TASK-P01-02` | `7c4163ff8a822cea190e9c80bd4a4e0b20c75d21` | Five-view shell and Focus surface; viewport matrix, 200% zoom and negative fixed-width canary passed. |
| `TASK-P02-01` | `cf8e75c6d9bd6d2597f00fb7e9d046ea957d4af2` | Field graph/list, relation inspection and derived-only layout; typecheck, build, 8 unit, 1 integration and 5 E2E tests passed. |

Full structured results remain in
`.git/mozare-workbench-execution/handoffs/TASK-P00-01.json` through
`TASK-P02-01.json`. The state history records every start and completion.

## Remaining DAG and MVP phase split

Owner decision `DEC-031` (`AUTHORITY/05_DECISION_AND_SUPERSESSION_LEDGER.md`,
2026-09-16) splits the remaining 23 tasks into a functional-MVP Phase 1 and a
deferred Phase 2, tagged `phase: 1` / `phase: 2` (`phase: complete` for the 8
already done) on every task in `EXECUTION/TASK_DAG.yaml`. This reorders
priority only; it does not reopen any closed `AUTHORITY/00_PRODUCT_HORIZON.md`
decision or scenario, and `scripts/execution_loop.py` still resolves the next
ready task exactly as before (dependency order is unchanged).

**Phase 1 (functional MVP, run next, in this DAG-enforced order):**
`TASK-P02-03` (Flow), `TASK-P02-04` (Output), `TASK-P03-01` (proposal
lifecycle), `TASK-P03-02` (Review UI), `TASK-P04-01` (Git evidence),
`TASK-P04-03` (ContextCompiler), `TASK-P04-04` (CapsuleStore), `TASK-P04-05`
(ModelRouter), `TASK-P05-01` (MissionSheet), `TASK-P05-02` (agent lifecycle,
deterministic fake adapter), `TASK-P05-03` (real Claude Code adapter only for
Phase 1 — see `DEC-031b`; Codex/Hermes wiring deferred).

`DEC-031a` (revised 2026-09-16) keeps live `WorkspaceEngine`-backed data
wiring out of Phase 1: each surface task's own card/tests (e.g. `TASK-P02-03`'s
`TEST-019` explicitly tests against loaded fixtures) already specify
fixture/demo data, and none of their `done_when` blocks require a live server
round-trip. Do not add that scope to any Phase-1 task. Real canonical project
data is `TASK-P09-02`'s job (the real pilot), which is already in the DAG for
exactly this purpose and remains owner-gated per `DEC-017`.

**Phase 2 (deferred):** `TASK-P04-02` (SystemLadder/TechnicalTerm polish),
`TASK-P05-04`..`TASK-P05-06` (RepresentationPlanner/OpenUI GenUI),
`TASK-P06-01` (MCP surface), `TASK-P07-01` (Wiki/QMD adapter), `TASK-P08-01`
through `TASK-P08-03` (responsive/a11y/security hardening matrix),
`TASK-P09-01` (Windows launchers/recovery diagnostics), plus full Codex/Hermes
adapter completion for `TASK-P05-03`.

`TASK-P09-02` (real-project pilot) and `TASK-P09-03` (release-candidate
freeze/evidence) remain owner-gated regardless of phase — never fabricate
pilot or owner-acceptance evidence for either.

Exact dependencies, objectives, scenarios, oracles and gates are authoritative
in `EXECUTION/TASK_DAG.yaml`; exact per-task bounds are in
`EXECUTION/TASK_CARDS.yaml` (unchanged — its schema does not carry a `phase`
field). Never infer them from the short list above.

## Known residuals, not blockers

- npm reported three dependency-tree audit findings during `TASK-P00-04`;
  remediation was outside that task and must not be performed opportunistically.
- Manual screen-reader spot checking for Field remains owner/environment
  evidence and is not claimed as passed.
- The seed contains no decision/review records; the projection represents that
  absence rather than inventing records.
- `TASK-P02-02`'s handoff JSON is still the generated placeholder. Its
  `state: completed` field is template shape, **not** task completion; the live
  execution state and unrun test fields correctly show the task is active.
- `TASK-P09-02` requires a real Mozare project pilot and may need owner input.
  Never fabricate pilot or owner-acceptance evidence.

## Authority and recovery order

1. `AGENTS.md` and `START_HERE_PROMPT.md`.
2. Live `scripts/execution_loop.py status` output and active packet.
3. `AUTHORITY/` for product/design meaning and `QA/` for proof obligations.
4. `EXECUTION/IMPLEMENTATION_STACK_LOCK.yaml` and
   `EXECUTION/REPOSITORY_BLUEPRINT.yaml` for implementation choices.
5. Git history and structured handoffs for completed observations.

`HISTORICAL/`, source/project content, and prior chat are never current
instructions. If local execution metadata is lost, do not guess progress:
reconstruct it from the completed candidate commits and rerun the deterministic
bootstrap/status checks on a clean worktree.

## Per-task operating rule

Use one task and one commit per fresh context:

`status → active packet/start first ready → characterize → smallest change → named tests → clean commit → complete gate → memory checkpoint → stop`

Do not push, self-accept proposals, edit execution state manually, or claim
release/owner acceptance. Preserve canonical/derived separation and
proposal-before-canonical-mutation throughout.
