---
name: mozare-qa
description: Build and execute candidate-bound QA for Mozare work using frozen product/design authority, explicit oracles, observed-vs-claimed evidence, risk ordering, negative controls, and honest proof gaps. Use before acceptance, release, or after claimed fixes.
---

# Mozare QA

## Freeze first
Record authority snapshot and candidate identity. Quarantine maker/fix claims during blind retest.

## Oracle
Each critical expectation has an `ORACLE-*` based on AUTH / DERIVED / STANDARD / HEURISTIC. Do not weaken the oracle to make a candidate green.

## Evidence
Separate:
- observed candidate execution;
- authentic external observation;
- simulation;
- inspection;
- claim.

`PASS` requires sufficient provenance and oracle fit.

## Challenge green
For critical mechanisms, use safe canaries/negative controls when feasible. If the test remains green after deliberate breakage, mark harness failure.

## Result
Preserve observation, oracle, interpretation, finding and residual uncertainty separately. A claimed fix closes nothing until blind retest on the new candidate.
