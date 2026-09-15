# mozare-represent

Use when choosing how project/agent state should be shown to Mozare.

1. Preserve the owning Workbench surface; do not invent new global navigation.
2. Select STATIC first, then DETERMINISTIC semantic composition, then GENERATIVE_OPENUI only if representation adaptability adds real value.
3. For OpenUI choose one micro-library from `GENUI/component-registry.yaml` and compile a bounded `ui` context packet.
4. Prefer semantic components (EvidencePath, SystemLadder, DecisionGate, etc.) over generic cards/charts.
5. Keep prose bounded; reference sources/artifacts rather than repeating them.
6. Generated actions must be allowlisted read/proposal actions.
7. Validate output; invalid/unknown action/component/budget breach → deterministic fallback.
8. Record route/token metrics and never promote generated layout/text to canonical authority automatically.
