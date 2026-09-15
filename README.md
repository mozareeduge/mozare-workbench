# Mozare Workbench — Implementation Handoff v0.3.2

A production-oriented local-first handoff for building **Mozare Workbench** with Claude Code, Codex, or Hermes. The Workbench is an interface over project reality: stable project state and authority live outside AI transcripts; agents receive bounded missions; results return as structured state/evidence/artifacts; the human sees spatial, operational, review and output interfaces rather than ambient model prose.

## Start

Open the prepared Git root in Codex and give it `EXECUTION/FRESH_CONTEXT_PROMPT.md`. The deterministic progress gate is `scripts/execution_loop.py`; the full workload remains `EXECUTION/CLAUDE_CODE_EXECUTION_INTAKE.md`.

## v0.3 additions

### 1. Context economy is implemented, not requested

`ContextCompiler` is a release requirement. It builds role/task-specific packs from stable handles, compact records, accepted authority, deltas and checksum-bound evidence capsules. It deduplicates, budgets, supports targeted expansion and escalates rather than silently truncating required truth.

### 2. Zero-model path first

Common state rendering, aggregation, cache validation, delta calculation and known semantic views use route `NONE`. LIGHT/STRONG/CODING/INDEPENDENT tiers are used only when semantic work requires them. Exact providers are local configuration.

### 3. Structured results before prose

Agent output persists as structured handoff + decision/proposal/test/artifact refs. Human explanation is generated or expanded only when useful. Raw logs/transcripts are diagnostic.

### 4. Controlled generative representation

The stable shell remains **FOCUS / FIELD / FLOW / REVIEW / OUTPUT**. Inside it, representation selection is:

```text
STATIC (0 model) → DETERMINISTIC COMPOSITION (0 model) → GENERATIVE_OPENUI
```

OpenUI uses small Mozare semantic micro-libraries (`orient`, `compare`, `decide`, `system`, `review`), bounded UI context, validated components and allowlisted actions. Generated UI cannot write canonical state or accept its own proposal. Invalid/expensive generation falls back to deterministic UI.

### 5. Quality-linked token telemetry

Local telemetry records token counts/estimates, route, cache hits, expansions and duplicate ratio alongside task/QA outcome. It does not store prompt bodies, secrets or hidden reasoning by default. Lower token use is not accepted as optimization if quality regresses.

## Authority pipeline

```text
Product/design authority
 DEC / HZN / OBJ / SURF / FLOW / SCN / COPY
                 ↓
Context + representation authority
 L0–L3 / capsules / budgets / micro-libraries / actions
                 ↓
QA authority
 ORACLE / TEST / proof gaps
                 ↓
Execution authority
 architecture / TASK / GATE / launch
                 ↓
Claude Code / Codex / Hermes
```

See `MIDDLE_LAYER_INDEX.md` for exact snapshots.

## Package map

| Path | Purpose |
|---|---|
| `AUTHORITY/` | closed product/design/context authority |
| `CONTEXT/` | executable policies, schemas, examples for context compilation/model routing |
| `GENUI/` | OpenUI semantic component/micro-library and runtime contract |
| `QA/` | oracle register, QA state, downstream proof contract |
| `EXECUTION/` | primary implementation intake, task DAG, traceability, launch manifest |
| `TECH/` | architecture, APIs, integrations, security |
| `UI/` | fixed design tokens/component/layout contracts |
| `prototype/` | bounded interaction reference, including adaptive representation demonstration |
| `scripts/context_compiler.py` | deterministic reference compiler used by package tests |
| `.agents/skills/`, `.claude/skills/` | reusable operating skills |
| `CONTROL/` | source product/design/QA/execution compiler controls |
| `HISTORICAL/` | superseded v0.1 authority only |

## Status

- Product/design/context authority: `CLOSED`.
- QA contract: `READY_FOR_EXECUTION`; production runtime remains untested.
- Execution intake: `READY_FOR_CODE_EXECUTION`.
- Prototype/context compiler: bounded package evidence only, not production certification.

## Light-model executor path

Start at `START_HERE_PROMPT.md`. The executor must not preload the whole package: it follows the DAG and `TASK_CARDS.yaml`, with architecture choices frozen in `IMPLEMENTATION_STACK_LOCK.yaml`. Package QA now checks cross-file scenario/oracle/task/card/test alignment before implementation begins.

- `EXECUTION/REPOSITORY_BLUEPRINT.yaml` — exact first-candidate module/file map for small-model implementation.
- `EXECUTION/HARNESS_BOOTSTRAP_PROMPT.md` — ready-to-paste fresh-context instruction for an agentic coding harness.
