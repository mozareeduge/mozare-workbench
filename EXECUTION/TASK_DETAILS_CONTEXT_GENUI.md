# v0.3 Task Details — Context Economy + Generative Representation

These task records extend `TASK_DAG.yaml`. They are execution authority for the new v0.3 layer.

## TASK-P04-03 — ContextCompiler

**Objective:** compile mission-specific minimum-sufficient context from typed project state.

**Inputs / modules:** `CONTEXT/context-policy.yaml`, object/relation/decision/oracle stores, current project projection.  
**Implement:** `src/context/ContextCompiler.ts`, `src/context/ReferenceResolver.ts`, `src/context/Budgeter.ts`, API `/api/context/compile` + `/expand`.  
**Protected neighbors:** authority snapshot identity; proposal boundary; external Wiki authority; mission acceptance criteria.  
**Negative proofs:** duplicate refs do not repeat payload; unrelated role layer omitted; required critical material exceeding hard budget does not return `READY`.  
**Targeted proof:** `TEST-CTX-01`, `TEST-CTX-02`, `TEST-CTX-05`.  
**Done:** schema-valid packs, targeted expansion, budgets, typed role profiles, no whole-project concatenation path in production adapter code.

## TASK-P04-04 — CapsuleStore + snapshots/deltas

**Objective:** reuse unchanged previously read material safely and continue work from deltas.

**Implement:** `src/context/CapsuleStore.ts`, `SnapshotService.ts`, `DeltaService.ts`; fingerprint storage under `.mozare/cache/context/`.  
**Protected neighbors:** source authority/provenance; first-read requirements; external systems own their source-completeness rules.  
**Negative proof:** mutate each capsule validity field/trigger → cache route becomes invalid; new source fixture cannot claim capsule-only full read.  
**Targeted proof:** `TEST-CTX-03`, `TEST-CTX-04`.  
**Done:** validity reasons visible, reopening route explicit, snapshot/delta deterministic/reproducible.

## TASK-P04-05 — ModelRouter + TokenTelemetry

**Objective:** choose the least-expensive adequate capability and measure efficiency with outcome quality.

**Implement:** `src/agents/ModelRouter.ts`, `src/telemetry/TokenTelemetry.ts`, local mapping config generated from `CONTEXT/model-routing.yaml`.  
**Protected neighbors:** no provider hard-coding in product authority; no raw prompt/secret/hidden-reasoning telemetry.  
**Negative proof:** deterministic status path must fail test if any model adapter is invoked; secret fixture must not appear in telemetry file.  
**Targeted proof:** `TEST-TOK-01/02`, `TEST-MET-01/02`.  
**Done:** `NONE` route observed for deterministic paths; provider counts stored when available; estimates labeled; quality regression blocks efficiency claim.

## TASK-P05-04 — RepresentationPlanner + ActionRegistry

**Objective:** choose STATIC/DETERMINISTIC/OpenUI and constrain all generated actions.

**Implement:** `src/representation/RepresentationPlanner.ts`, `DeterministicViews.tsx`, `ActionRegistry.ts`; validate `RepresentationPlan`.  
**Protected neighbors:** five-surface shell; Focus orientation available without model; proposal/acceptance authority.  
**Negative proof:** ordinary orientation/status must select STATIC; direct canonical-write action cannot be registered.  
**Targeted proof:** `TEST-TOK-01`, planner unit/property cases.  
**Done:** deterministic common modes cover orientation, SystemLadder, known decision/evidence compositions.

## TASK-P05-05 — OpenUI semantic micro-libraries

**Objective:** provide bounded adaptive composition where it adds cognitive value.

**Implement:** production library derived from `GENUI/openui-library.reference.tsx`; separate `orient/compare/decide/system/review` prompt specs; `GenerativeRenderer` adapter.  
**Protected neighbors:** Workbench tokens/components; responsive/a11y ownership; context budget; deterministic fallback.  
**Negative proof:** malformed program, unknown component, wrong-library component, timeout, token breach → fallback; no blank/error-only region.  
**Targeted proof:** `TEST-GUI-01/02/04`.  
**Done:** one micro-library per request, schema-valid streaming render, fallback parity, no universal component prompt.

## TASK-P05-06 — Generated action integration

**Objective:** let generated UI be interactive without gaining canonical authority.

**Implement:** OpenUI action/Query/Mutation adapter → `ActionRegistry`; explicit argument schemas; audit event.  
**Protected neighbors:** agents cannot self-accept; shell/process execution excluded; path authorization unchanged.  
**Negative proof:** generated `canonical_write`, `accept_proposal`, `execute_shell` rejected before invocation.  
**Positive proof:** `open_object`/`inspect_evidence` work; `create_proposal` produces ordinary reviewable proposal.  
**Targeted proof:** `TEST-GUI-03`.  
**Done:** generated actions have the same or weaker authority than fixed UI equivalents and leave evidence trail.
