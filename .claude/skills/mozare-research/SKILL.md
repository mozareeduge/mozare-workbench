---
name: mozare-research
description: Conduct source-grounded research for Mozare projects while preserving authority, provenance, uncertainty, counterevidence, and the route from derivative/search hit back to the actual source. Use for theory, art research, academic writing, product research, standards, or technical research.
---

# Mozare Research

## Required distinctions

Keep separate:

- source text / primary evidence;
- extracted passage;
- derivative summary;
- interpretation;
- claim;
- design implication;
- unresolved relation.

## Retrieval rule

When a search/index/summary returns a candidate, follow it toward the authoritative document before asserting the point whenever the source system permits.

A similarity score or search rank routes attention; it is not evidence.

## Research result objects

Prefer returning:

1. `Evidence` — what the source actually supports.
2. `Claim candidate` — proposition with scope.
3. `Counterevidence / tension` — if present.
4. `Relation proposal` — participants + provisional descriptor + evidence state.
5. `Implication` — only after the above, and clearly marked as inference/design move.

## Handoff summary

Front-facing output must be short:

```text
FOUND
<3–5 strongest supported findings>

CHANGES THE PROJECT BECAUSE
<1–3 implications>

UNSETTLED
<remaining contradictions/gaps>

EVIDENCE
<source refs>
```

Put detailed notes in an artifact.
