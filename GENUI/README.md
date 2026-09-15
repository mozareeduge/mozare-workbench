# Generative Representation Layer

This directory contains the implementation contract for adaptive UI inside the fixed Mozare Workbench shell.

**Default:** no model call. Render fixed or deterministic semantic components from structured state.  
**Escalation:** OpenUI Lang only when adaptive composition is justified by `CONTEXT/representation-policy.yaml`.  
**Authority:** generated UI is a disposable projection and cannot mutate canonical state directly.

OpenUI was selected because its current open-source framework defines a compact streaming language, derives prompts from an allowed component library, validates component use, supports custom `defineComponent`/`createLibrary` libraries and Query/Mutation bindings, and is designed for smaller representation output than equivalent JSON. The Workbench must remain able to fall back when OpenUI is unavailable.

Files:
- `component-registry.yaml` — semantic catalog and micro-libraries.
- `openui-library.reference.tsx` — ready-made implementation starting point using current public OpenUI APIs.
- `REPRESENTATION_RUNTIME.md` — planner/runtime/action/fallback contract.
- `examples/` — bounded programs/payloads.
