# Integration Contracts

## Git repositories

Registration stores repo ID + local path + optional public URL. On open, detect branch/HEAD/dirty state. Never assume remote GitHub state equals local truth. Agent missions freeze actual local baseline.

## Claude Code / Codex / Hermes

All three implement the common AgentAdapter contract. Capability is discovered, not assumed. Missing executable produces `UNAVAILABLE` with setup note; core Workbench remains usable.

Mission packet contains:
- target refs;
- desired outcome;
- why/current project state;
- selected context refs with authority metadata;
- accepted decisions/constraints;
- protected paths;
- acceptance criteria;
- requested handoff schema/path.

Each adapter may need different CLI flags/config, but UI and proposal lifecycle must not depend on vendor-specific transcript format.

## Mozare Wiki

Default is read/search/get. Detect configured Wiki root and release metadata dynamically. Do not copy the Wiki into Workbench or bypass its controller. A request to mutate Wiki content becomes a separate mission that must invoke/follow the Wiki's own controller/validation rules.

## QMD

Optional retrieval adapter. Query results are candidates. `get`/source route is required before representing a hit as inspected evidence. If QMD is absent, local project search remains.

## Ganjoor/Ontograph

Treat the corpus/index as external authority. Use its own MCP/QMD playbook where configured. A poem/search hit should route back to the full source record rather than snippet-only authority.

## Tana / Obsidian

Not required for v1. Future adapters may project project objects into these interfaces. Any bidirectional mutation still enters Workbench as a proposal unless explicitly owner-authorized under a future contract.

## OpenUI integration (v0.3)

Use `@openuidev/react-lang` behind `GenerativeRenderer`. Define a small Workbench-owned component library with `defineComponent`/`createLibrary`; generate the system prompt from the selected micro-library; parse/validate streamed OpenUI Lang and render with Workbench components. Query/Mutation/action bindings map only to `ActionRegistry` IDs.

Do not require OpenUI Cloud/Gateway for local-first operation. If a configured remote provider/gateway is later used for correction/observability, it is an optional adapter with explicit privacy/configuration disclosure. The core must still support deterministic fallback and direct local/provider generation where compatible.

## AG-UI adapter boundary

Keep agent event/state interfaces separable from UI implementation so an AG-UI adapter can later translate agent lifecycle/state/tool events. Do not add AG-UI as a first-release dependency until the deterministic fake adapter + one real harness loop is stable and an interoperability benefit is demonstrated.
