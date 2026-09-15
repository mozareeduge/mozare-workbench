---
name: mozare-orient
description: Reconstruct the current state of a Mozare project from canonical records and present a low-text orientation map, unresolved items, review needs, and one next meaningful action. Use at project re-entry, after long agent work, or when the user asks where we are.
---

# Mozare Orient

## Goal
Return **state, not a retrospective essay**.

## Procedure

1. Identify the target project and current canonical records.
2. Read current objective/question, latest accepted decisions, active/blocked missions, review queue, latest verified artifact, and recent meaningful events.
3. Inspect only directly relevant neighboring relations; do not load the entire archive.
4. Distinguish accepted facts from candidate/contested state.
5. Produce one recommended next action. It must be grounded in current state, not generic productivity advice.

## Output

```text
NOW
<one sentence>

CURRENT QUESTION
<one sentence>

ACTIVE
≤3 items

NEEDS MOZARE
≤3 review/judgment items

LATEST REAL OUTPUT
<artifact or “None”>

NEXT MEANINGFUL ACTION
<one action + why>
```

If the interface supports structured objects, return stable object IDs alongside labels.

## Constraints

- Do not rewrite canonical state.
- Do not infer settled relation types from proximity/similarity.
- Do not explain project history unless it changes the current next action.
- Keep technical detail collapsed unless orientation itself depends on it.
