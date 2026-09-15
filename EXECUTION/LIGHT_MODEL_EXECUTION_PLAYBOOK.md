# Light-Model Execution Playbook — Mozare Workbench v0.3.2

**Purpose:** make the handoff executable by a smaller coding model inside an agentic harness without asking it to reconstruct product intent, choose a new architecture, or keep the whole authority corpus in working context.

This file changes **execution shape only**. Product/design authority remains `AUTHORITY/`; QA authority remains `QA/`.

## 1. What you are building

Build one local Windows-first browser application that lets Mozare re-enter a project, see what is true now, inspect relations/work/output, launch bounded agent missions, review proposed changes, and preserve project truth outside model transcripts.

The product has exactly five conceptual surfaces:

`FOCUS → FIELD → FLOW → REVIEW → OUTPUT`

The application is a **project instrument**, not a chat client, IDE, terminal dashboard, or generic knowledge graph.

## 2. Invariants you must never reinterpret

1. Canonical project truth = ordinary local structured/text records + Git/external source systems; caches/layout/model wording are derived.
2. Consequential agent changes end at a proposal. The agent/generated UI cannot accept its own proposal or directly write canonical truth outside the proposal transaction.
3. Focus is the default front door. Blank chat/transcript is never the home screen.
4. Technical results are presented `Intent → System behavior → Architecture → Implementation → Verification`, with implementation detail collapsed by default.
5. Local-first safety: loopback bind, registered paths, argv-safe spawning, worktree isolation where applicable, secret exclusion, sandboxed previews.

If a task appears to require violating one of these, stop that branch with `FEASIBILITY_CONTRADICTION`; do not silently redesign the product.

## 3. Context discipline for a light model

Do **not** read the whole package before every task.

For each task, use `scripts/execution_loop.py`; do not manually reconstruct a task from the full files:

1. Run `python scripts/execution_loop.py status`, then `python scripts/execution_loop.py start`.
2. Read the emitted packet, which contains the exact card and mapped scenario/oracle/test clauses.
3. Expand only the exact required-read section needed to resolve an ambiguity; record the reason.
4. Inspect only the source files/modules named by the card and directly affected neighbors.
5. After `TASK-P04-03` exists, use the production `ContextCompiler` for real agent missions; before that task, the task cards are the bounded-context mechanism.

Historical files are never implementation authority.

## 4. Fixed implementation path

`EXECUTION/IMPLEMENTATION_STACK_LOCK.yaml` and `EXECUTION/REPOSITORY_BLUEPRINT.yaml` are binding for the first release. Do not spend model effort comparing frameworks or replacing the stack unless a verified incompatibility blocks the task.

Primary source layout:

```text
src/
  core/            canonical state, projection, proposals, evidence, context
  server/          Fastify HTTP/SSE, Git/process/adapters/previews
  web/             React surfaces/components/styles
  mcp/             stdio MCP read/proposal server
  shared/          shared types/contracts

tests/
  unit/
  integration/
  e2e/
```

The production app must not depend on Python. Python remains package/test tooling only.

## 5. One-task execution loop

For the current card:

1. **Freeze** — record current Git HEAD/dirty state and task ID.
2. **Characterize** — run the named pre-test/negative control when the card requires one.
3. **Implement** — change only the card's target modules and necessary direct neighbors.
4. **Verify** — run the card's targeted tests, then the named adjacent regression gate.
5. **Handoff** — update evidence/trace and produce a schema-valid structured handoff. Do not advance the DAG on claim alone.

A task is complete only when every `done_when` item in its card is observed on the current tree.

## 6. Decision policy

Use this order when something is not explicit:

1. accepted authority/decision;
2. task card;
3. fixed stack/repository blueprint;
4. current repository/runtime fact;
5. safest small implementation preserving all protected neighbors.

Ask the owner only when two materially different product outcomes remain after this order. Ordinary library/file-structure decisions are already fixed by the stack lock/card and are not owner questions.

## 7. Failure policy

Use these exact states:

- `PASS` — required observation exists on the current candidate.
- `PARTIAL` — coherent subset works; missing behavior named.
- `FAIL` — behavior contradicts requirement.
- `BLOCKED` — required external capability/environment unavailable.
- `UNVERIFIED` — implementation may exist but proof has not been run.

Never convert an agent's success sentence into test evidence.

## 8. Adapter rule

Agent adapters are optional capabilities; Workbench core must remain usable when any/all are absent. Use `EXECUTION/AGENT_ADAPTER_BASELINES.md` for current invocation baselines, but capability-detect the installed CLI and keep the Workbench's own worktree/proposal/evidence boundary as the security authority.

## 9. Stop conditions

Stop only the affected task/branch when:

- a protected invariant and a verified platform fact are incompatible;
- the task requires owner aesthetic/artistic judgment rather than engineering execution;
- a required external executable/source is absent and no defined degraded path exists;
- candidate state cannot be made trustworthy without destructive action.

Continue independent ready tasks when the DAG permits.

## 10. Terminal state

`CANDIDATE_READY_FOR_REVIEW` requires all machine-executable mandatory tasks/gates completed on one exact candidate plus the real pilot execution required by the DAG. It does **not** mean `OWNER_ACCEPTED` or public release.
