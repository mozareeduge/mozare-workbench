# Evidence Index

This package contains only handoff/prototype evidence. Production runtime evidence does not exist yet.

| Evidence | Candidate | Mode | Proves | Does not prove |
|---|---|---|---|---|
| `QA_REPORT.md` | handoff package v0.3 | inspection + local execution | package completeness/schema/static checks | Workbench runtime correctness |
| `prototype/prototype-qa-desktop.png` | interaction prototype | Chromium screenshot | desktop reference layout renders | production UI parity |
| `prototype/prototype-qa-mobile.png` | interaction prototype | Chromium screenshot | mobile transformed layout/no gross overflow | physical touch/device behavior |
| `prototype` Playwright run | interaction prototype | candidate execution | bounded nav/sheet/drawer/review interactions | filesystem/Git/agent/MCP behavior |
| `PACKAGE_MANIFEST.json` | package | hash inventory | package byte identity | semantics of implementation |

## v0.3 package evidence targets

- deterministic ContextCompiler reference and unit tests;
- context policy/schema validation;
- adaptive Focus reference interaction in Chromium;
- OpenUI reference library source checked structurally against current public API documentation (production compile remains an implementation gate because package dependencies are intentionally not installed here);
- package traceability for new ORACLE/TASK/GATE chains.
