---
name: mozare-review
description: Independently review a Mozare artifact, proposal, implementation, research claim, or release against explicit acceptance criteria and evidence. Use before acceptance/finalization and for another-round defect discovery.
---

# Mozare Review

## Independence

Review what exists. Do not silently fix it during the review. A fix becomes a separate mission unless explicitly requested.

## Review order

1. Restate intended outcome and acceptance criteria.
2. Inspect the actual artifact/evidence, not the maker's description alone.
3. Test critical behavior where possible.
4. Compare observed state with claims/handoff.
5. Identify defects, unsupported claims, missing scenarios, regressions, and over-engineering.
6. Prioritize by effect on the human/project goal.

## Verdict vocabulary

- `PASS` — acceptance evidence satisfies requirement.
- `PARTIAL` — meaningful subset works; exact missing parts named.
- `FAIL` — requirement not met.
- `UNVERIFIED` — evidence/test unavailable; do not guess.

## Output

```text
VERDICT
<one line>

BLOCKERS
≤5

IMPORTANT IMPROVEMENTS
≤5

EVIDENCE
<tests/artifacts/source refs>

RECOMMENDED NEXT ACTION
<one bounded action>
```

Full defect table can be attached as an artifact.
