# TASK-P08-01 Evidence — Responsive navigation/layout hardening

## Candidate identity
- Branch: track-b-web, GREEN commit afa51f7 (RED commit db36ebf, parent 7b90d54)
- Worktree: ..._v0.3.2_trackb (isolated git worktree; main checkout untouched)

## What was observed (real commands, real outcomes)
- RED reproduction (stash of GREEN WIP at RED HEAD db36ebf): `npx playwright test tests/e2e/responsive-layout.spec.ts --reporter=line` → 10 failed / 2 passed. Failures were the binding rail-width, mobile-nav, gutter, list-first Field, and landscape decision-action assertions (SCN-RSP-01..05, SCN-X-03).
- GREEN (WIP restored): same command → 12 passed (12.3s).
- Canary TEST-000 guard: `tests/e2e/responsive-canary.spec.ts` → 1 passed. The canary injects a 999px min-width canary and proves the reflow assertion turns RED under injection, then green after restore.
- Full gates on GREEN commit afa51f7:
  - `npm run typecheck` → exit 0
  - `npm run lint` → exit 0
  - `npx vitest run` → 26 files / 156 tests passed
  - `npx playwright test` → 39 passed (23.8s)

## Changed files (9)
- src/web/components/MissionSheet.tsx (+27/-…): footer actions pinned inside landscape viewport
- src/web/surfaces/Field.tsx: list-first mobile behavior (SCN-X-03)
- src/web/styles/tokens.css (+81): responsive rail/nav token ladder 1440/1280/768/390/320
- src/web/styles/app.css, field.css, flow.css, output.css, review.css: rail-width/mobile-nav/gutter contract application

## Residual risks
- The GREEN WIP was inherited uncommitted from the interrupted Track-B executor; RED evidence here is a stash-based reproduction (honest, observed this session), not the original executor's run.
- The untracked diagnostic file tests/e2e/_probe.spec.ts was removed before commit (it was scratch, not evidence).
- No other worktrees or the main loop state were touched.
