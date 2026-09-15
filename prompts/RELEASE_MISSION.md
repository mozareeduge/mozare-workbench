# Template — Release / Finalization Mission v0.3

You are validating a Mozare Workbench production candidate against frozen authority.

1. Freeze exact candidate HEAD/build identity.
2. Read `MIDDLE_LAYER_INDEX.md`.
3. Read `QA/QA_STATE.yaml`, `QA/QA_ORACLE_REGISTER.md`, and `QA/CLAUDE_QA_CONTRACT.md`.
4. Read `EXECUTION/TRACEABILITY.csv` and the final-freeze section of `EXECUTION/CLAUDE_CODE_EXECUTION_INTAKE.md`.
5. Execute all mandatory applicable gates on the unchanged candidate.
6. Preserve `PASS / FAIL / INCONCLUSIVE / BLOCKED / UNTESTED` precisely; never promote inspection or agent claim into runtime PASS.
7. Challenge critical green mechanisms with the feasible negative controls defined by the QA contract.
8. Run canonical reconstruction, stale-proposal, rollback, path/process/secret, responsive, keyboard, preview-sandbox and loopback proofs.
9. Verify changed-file → TASK → proof scope fidelity.
10. Produce candidate-bound evidence.

Produce:
- `RELEASE_REPORT.md`
- final `IMPLEMENTATION_HANDOFF.json`
- updated candidate-bound trace/evidence index
- `KNOWN_LIMITS.md`

Engineering verdict: `CANDIDATE_READY_FOR_REVIEW` or `NOT_READY`. Do not claim `OWNER_ACCEPTED`/`RELEASED` unless the owner explicitly completes those gates.
