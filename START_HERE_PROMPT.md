# Start Here — Implementation Executor

**Goal:** build the local-first Mozare Workbench from this handoff without redesigning product meaning. This entrypoint is optimized for a light model inside an agentic harness.

## 1. Prove and initialize the execution loop

Run:

```bash
python scripts/verify_manifest.py
python scripts/qa_package.py
python scripts/validate_execution_contract.py
python scripts/execution_loop.py bootstrap
```

These checks are read-only by default. Do not implement against a failing package contract. `bootstrap` requires the prepared clean Git baseline and creates execution-local state under `.git/`.

## 2. Load only the execution spine

Read, in order:

1. `MIDDLE_LAYER_INDEX.md`
2. `AUTHORITY/00_PRODUCT_HORIZON.md`
3. `EXECUTION/LIGHT_MODEL_EXECUTION_PLAYBOOK.md`
4. `EXECUTION/IMPLEMENTATION_STACK_LOCK.yaml`
5. `EXECUTION/REPOSITORY_BLUEPRINT.yaml`
6. `EXECUTION/TASK_DAG.yaml`

Do **not** load the whole authority/QA/technical package into one model context.

## 3. Execute one ready task at a time

Run `python scripts/execution_loop.py start`. It chooses the first task whose dependencies are complete and writes a bounded packet plus handoff template under `.git/mozare-workbench-execution/`. Read only:

- that card's `required_reads`;
- the exact `SCN-*` IDs mapped to the task in `TASK_DAG.yaml`;
- the exact `ORACLE-*` IDs mapped to it;
- the exact `TEST-*` IDs named by the card;
- source files in the task's affected area.

Use `EXECUTION/FRESH_CONTEXT_PROMPT.md` to restart in a new Codex context and `EXECUTION/CODEX_HARNESS_PROFILE.yaml` for the frozen model/continuity policy.

Follow the card's five-step loop. A task is complete only when its frozen candidate has observed gate evidence.

## 4. Switch to compiled context when available

Before `TASK-P04-03`, task cards are the bounded-context mechanism. After `TASK-P04-03` passes, production agent missions must use `ContextCompiler` packets/handles instead of ad-hoc whole-project prompt concatenation.

## 5. Terminal state

The DAG terminal state is `CANDIDATE_READY_FOR_REVIEW`. It is **not** owner acceptance or public release. Freeze exact candidate identity and evidence under the release task; do not turn unobserved agent claims into PASS.
