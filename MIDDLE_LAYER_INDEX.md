# Mozare Workbench — Middle Layer Index

**Package:** v0.3.2  
**Status:** `READY_FOR_CODE_EXECUTION`  
**Product/design/context authority:** `MWB-PD-2026-09-15-r3`  
**QA snapshot:** `MWB-QA-2026-09-15-r3`  
**Execution intake:** `MWB-EXEC-2026-09-15-r3`

Navigation/identity metadata only; it cannot override the authorities below.

## Binding product authority

`AUTHORITY/00_PRODUCT_HORIZON.md` → horizon/decisions including `HZN-013..020`, `DEC-019..030`  
`AUTHORITY/01_OBJECT_STATE_AND_FLOW_MODEL.md` → project + context/representation objects  
`AUTHORITY/02_SCENARIO_CASE_ATLAS.md` → consequence classes including `SCN-CTX/TOK/GUI/MET`  
`AUTHORITY/03_DESIGN_UIUX_BLUEPRINTS.md` → fixed shell + adaptive representation grammar  
`AUTHORITY/04_COPY_DECK.md` → consequential copy  
`AUTHORITY/05_DECISION_AND_SUPERSESSION_LEDGER.md` → supersession  
`AUTHORITY/06_CONTEXT_AND_GENERATIVE_REPRESENTATION.md` → context/token/GenUI contract
`AUTHORITY/07_P10_LIVE_MULTI_PROJECT_ADDENDUM.md` → live multi-project correction and owner-test boundary
`AUTHORITY/08_CROSS_HARNESS_CONTINUITY_ADDENDUM.md` → seamless Claude/Codex/Hermes work continuity

Status: `PRODUCT_DESIGN_AUTHORITY_CLOSED`.

## Executable policies / ready-made pieces

`CONTEXT/context-policy.yaml` — budgets/priority/compaction/capsule/privacy policy  
`CONTEXT/model-routing.yaml` — capability-tier routing + role profiles  
`CONTEXT/representation-policy.yaml` — static/deterministic/OpenUI selection  
`CONTEXT/*.schema.json` — pack/capsule/snapshot/delta/representation/metrics contracts  
`scripts/context_compiler.py` + `tests/context/` — functioning deterministic reference + tests  
`GENUI/component-registry.yaml` — semantic components/micro-libraries  
`GENUI/openui-library.reference.tsx` — current-API implementation starting point  
`GENUI/REPRESENTATION_RUNTIME.md` — planner/action/fallback runtime contract

## QA authority

`QA/QA_STATE.yaml`  
`QA/QA_ORACLE_REGISTER.md` (`ORACLE-001..055`)
`QA/CLAUDE_QA_CONTRACT.md` including `TEST-CTX/TOK/GUI/MET`  
`QA/P10_LIVENESS_ADDENDUM.md` → `GATE-LIVE` proof boundary
`QA/P10_CROSS_HARNESS_ADDENDUM.md` → cross-harness continuity and adapter-parity proof
`QA/EVIDENCE_INDEX.md`

Status: `QA_CONTRACT_READY_FOR_EXECUTION`.

## Execution authority

`EXECUTION/CLAUDE_CODE_EXECUTION_INTAKE.md`  
`EXECUTION/TASK_DAG.yaml`  
`EXECUTION/TRACEABILITY.csv`  
`EXECUTION/LAUNCH_MANIFEST.yaml`
`EXECUTION/P10_HANDOFF_REVIEW.md` → reviewed package provenance, native task mapping, and executor entry

Status: `READY_FOR_CODE_EXECUTION`.

## Supersession

v0.3 supersedes v0.2 wherever v0.2 would permit whole-project prompt loading, repeated prose handoffs, generative UI as a default surface, universal GenUI component prompts, unmeasured token optimization, or direct generated canonical actions. All non-conflicting v0.2 product/design/QA authority remains incorporated here. `HISTORICAL/` remains audit-only.

## v0.3.1 executor-hardening layer

- `EXECUTION/LIGHT_MODEL_EXECUTION_PLAYBOOK.md` — bounded-context one-task execution loop.
- `EXECUTION/IMPLEMENTATION_STACK_LOCK.yaml` — first-release technical choices; prevents architecture drift.
- `EXECUTION/TASK_CARDS.yaml` — per-task reads, affected paths, tests, stop conditions and handoff.
- `EXECUTION/AGENT_ADAPTER_BASELINES.md` — current Claude/Codex/Hermes invocation assumptions and capability probes.
- `scripts/validate_execution_contract.py` — cross-file coverage/alignment gate.

- `EXECUTION/REPOSITORY_BLUEPRINT.yaml` — exact first-candidate module/file map for small-model implementation.
- `EXECUTION/HARNESS_BOOTSTRAP_PROMPT.md` — ready-to-paste fresh-context instruction for an agentic coding harness.

## v0.3.2 fresh-context execution layer

- `EXECUTION/CODEX_HARNESS_PROFILE.yaml` — selected model, reasoning, memory, escalation, and token policy.
- `EXECUTION/FRESH_CONTEXT_PROMPT.md` — minimal restart instruction.
- `scripts/execution_loop.py` — deterministic state, task selection, packet compilation, and handoff gate.
- `QA/EXECUTION_READINESS_AUDIT_v0.3.2.md` + `QA/FINALIZATION_CHECKLIST.md` — corrected readiness and terminal proof boundary.

## P10 live-product correction

- `TASK-P10-01..03` are the deterministic-loop counterparts of MAWS `WIRE-01`, `WIRE-02`, and `REOPEN-GATE`.
- `TASK-P10-04..05` are the deterministic-loop counterparts of MAWS `HARNESS-01` and `HARNESS-02`.
- They must complete before `TASK-P09-02`; fixture-backed surfaces cannot satisfy owner-test readiness.
- `TECH/P10_LIVE_WORKSPACE_ARCHITECTURE.md` and `EXECUTION/P10_PREFABS/` are bounded implementation inputs, not observed completion evidence.
- `EXECUTION/CROSS_HARNESS_EXECUTION_PROFILE.yaml` fixes common model/effort/context-boundary policy while adapters record their actual vendor route.
