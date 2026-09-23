# P10 QA Addendum — Product Liveness

This addendum is indexed into `QA_ORACLE_REGISTER.md` as `ORACLE-045..049` and into `CLAUDE_QA_CONTRACT.md` as `TEST-022..025`.

## Acceptance map

| Requirement | Oracle | Primary test |
|---|---|---|
| visible project facts come from the active runtime workspace | ORACLE-045 | TEST-023 |
| arbitrary folder registration is non-destructive and truthful | ORACLE-046 | TEST-022 / TEST-024 |
| switching replaces all visible project identity/state | ORACLE-047 | TEST-023 |
| created project validates without fabricated semantic records | ORACLE-048 | TEST-022 |
| owner handoff is based on observed browser/API liveness | ORACLE-049 | TEST-024 / TEST-025 |

## GATE-LIVE

On one unchanged candidate:

1. `TEST-022..025` pass, including the static negative canary.
2. Existing typecheck, lint, unit, integration, Playwright, and Windows-launcher gates pass.
3. The launcher starts both loopback services and the browser receives the active-workspace projection.
4. Current real `mozare-wiki` facts are visible, its folder is unchanged by registration, dark is default, and no demo marker is visible.
5. Evidence records exact candidate identity, active opaque workspace ID/classification, observed current marker, commands, and owner-visible state.

Passing GATE-LIVE permits only `OWNER_TEST_READY`. Pilot value and release remain human/final-QA gates.
