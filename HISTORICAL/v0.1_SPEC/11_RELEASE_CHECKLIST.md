# 11 — v0.1 Release Checklist

## Canonical state

- [ ] workspace state readable without UI
- [ ] schemas validated
- [ ] derived cache/layout deletable and reconstructable
- [ ] no local absolute paths committed
- [ ] no secrets committed

## Human interface

- [ ] Field works
- [ ] Focus / Orient me works
- [ ] Flow works
- [ ] Review works
- [ ] Output works
- [ ] raw agent logs collapsed by default
- [ ] system-level technical view precedes code detail
- [ ] Persian/English mixed text verified
- [ ] keyboard path verified
- [ ] reduced motion verified

## Governance

- [ ] no agent accept tool
- [ ] proposal stale-base checks work
- [ ] rollback/recovery test passes
- [ ] accepted vs verified distinguished
- [ ] rejected/residue material preserved intentionally

## Agents

- [ ] Claude adapter implemented/detected
- [ ] Codex adapter implemented/detected
- [ ] Hermes adapter implemented/detected
- [ ] missing executable degradation tested
- [ ] one real adapter run tested on pilot machine
- [ ] handoff schema enforced

## Git / code work

- [ ] dirty repo behavior tested
- [ ] worktree isolation tested
- [ ] destructive Git operation guard tested
- [ ] test result evidence captured from exit code/output

## Integrations

- [ ] Mozare Wiki read adapter works
- [ ] QMD optional path works or degrades cleanly
- [ ] seeded repository registry imports
- [ ] Tana documented as optional, not required
- [ ] MCP server tool surface tested

## Security

- [ ] loopback bind
- [ ] origin/CSRF control
- [ ] path traversal tests
- [ ] secret exclusion tests
- [ ] shell injection tests
- [ ] artifact sandbox tests
- [ ] logs remain local and disposable

## QA

- [ ] `python scripts/qa_package.py`
- [ ] unit tests
- [ ] integration tests
- [ ] E2E tests
- [ ] mandatory acceptance tests mapped to evidence
- [ ] pilot manual checks recorded

## Deliverables

- [ ] `START_MOZARE.ps1`
- [ ] optional double-click launcher
- [ ] `README.md` written for nontechnical user
- [ ] `KNOWN_LIMITS.md`
- [ ] `RELEASE_REPORT.md`
- [ ] `IMPLEMENTATION_HANDOFF.json`
- [ ] traceability matrix current
- [ ] dependency lockfile
- [ ] recovery instructions
