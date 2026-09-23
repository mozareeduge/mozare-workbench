# Claude / Executor QA Contract

**Authority snapshot:** `MWB-PD-2026-09-15-r3`  
**QA snapshot:** `MWB-QA-2026-09-15-r4`  
**QA level:** QA-C for canonical state/security/review boundary; QA-B for ordinary UI surfaces.

The production application does not exist yet. All runtime oracles below are `UNTESTED` until the executor builds a candidate. The handoff prototype may inform layout tests but is not production evidence.

## Proof obligations

### TEST-000 — Harness sanity
- **Oracle:** ORACLE-041.
- **Path:** run documented unit/integration/E2E commands on the fresh scaffold; execute one disposable intentional failing canary and restore it.
- **Positive proof:** all three layers are discoverable/runnable and the canary is observed failing before restoration; clean baseline then passes.
- **Evidence:** exact commands, canary failure output, clean baseline output.


### TEST-001 — Canonical reconstruction
- **Oracle:** ORACLE-001.
- **Path:** create accepted fixture state → close app → delete generated cache/layout → restart.
- **Positive proof:** same canonical object/relation/review/artifact identities and semantic state reconstructed; only derived coordinates/preferences may reset.
- **Negative control:** remove/corrupt a canonical fixture; validation must fail instead of silently inventing data.
- **Evidence:** exact candidate SHA, commands, before/after fixture hashes, screenshot/log.

### TEST-002 — Focus entry
- **Oracle:** ORACLE-002/003.
- **Path:** clean start with valid seed project.
- **Positive proof:** Focus is first surface and contains required facts.
- **Negative control:** seed with 50 historical objects; default surface remains bounded.
- **Evidence:** Playwright DOM assertions + screenshot at 1440×900 and 390×844.

### TEST-003 — Field relation semantics
- **Oracle:** ORACLE-004/005/006.
- **Path:** inspect unsettled relation; drag node; connect two nodes.
- **Positive proof:** unsettled remains unsettled; drag changes derived layout only; connect creates proposal only.
- **Negative control:** attempt direct canonical relation write via UI/MCP should fail/not exist.

### TEST-004 — Mission composition
- **Oracle:** ORACLE-007.
- **Path:** Focus → Work on this.
- **Positive proof:** target/context prefilled; outcome/acceptance editable; whole history excluded by default; no prompt textarea as primary interface.
- **Failure proof:** unavailable agent disabled with reason; missing criterion blocks Start without losing edits.

### TEST-005 — Stop/restart agent lifecycle
- **Oracle:** ORACLE-008/028.
- **Path:** fake long-running adapter then real installed adapter where available; stop and restart Workbench.
- **Positive proof:** process tree terminated, partial isolated work retained, durable truthful state reconciled.
- **Evidence:** PID/process observation, run state, worktree path, restart result.

### TEST-006 — Review ordering/provenance
- **Oracle:** ORACLE-009/010.
- **Path:** valid handoff with one observed pass + one unobserved agent pass claim.
- **Positive proof:** Effect before diff; observed and claim state distinguishable; unobserved claim not rendered Passed.
- **Negative control:** remove observed evidence file; status becomes unverified/inconclusive.

### TEST-007 — Stale proposal
- **Oracle:** ORACLE-011.
- **Path:** create proposal, mutate its base canonical record, open/attempt accept.
- **Positive proof:** accept disabled/blocked; stale explanation and recovery route visible; no partial mutation.

### TEST-008 — Transaction rollback
- **Oracle:** ORACLE-012.
- **Path:** force failure after staged validation but during apply/post-apply.
- **Positive proof:** original canonical hashes restored; event/error receipt truthful.
- **Negative control:** canary that suppresses rollback must make test fail.

### TEST-009 — Artifact semantics/security
- **Oracle:** ORACLE-013/014/027.
- **Path:** register canonical JSON, generated HTML, hostile HTML, binary.
- **Positive proof:** correct badges; hostile preview cannot access parent; binary never executed.

### TEST-010 — External evidence authority
- **Oracle:** ORACLE-015.
- **Path:** fake adapter + QMD/Wiki if available.
- **Positive proof:** search result exposes source route and candidate status; Capture creates reference/proposal, no Wiki mutation/truth claim.

### TEST-011 — Technical translation
- **Oracle:** ORACLE-016/026.
- **Path:** handoff containing technical term, file diff, large log.
- **Positive proof:** system behavior first; term explanation accessible; log lazy/collapsed; main workspace stays usable.

### TEST-012 — Git/command/secret safety
- **Oracle:** ORACLE-017/018.
- **Path:** dirty repo, `../../`, escaping symlink, shell metacharacters, `.env` context.
- **Positive proof:** dirty state protected; path escape rejected; argv execution prevents injection; protected path excluded.
- **Canary:** intentionally unsafe disposable adapter must be caught by tests.

### TEST-013 — Loopback
- **Oracle:** ORACLE-019.
- **Path:** start application and inspect listening sockets/host binding.
- **Pass:** no non-loopback listener unless explicitly configured by human.

### TEST-014 — Responsive/navigation matrix
- **Oracle:** ORACLE-020/025.
- **Viewports:** 1440×900, 1280×720, 1024×768, 768×1024, 390×844, 320×700; plus 200% zoom.
- **Pass:** no page horizontal overflow; wide/compact/mobile nav transformation; all five views and primary decision actions reachable.
- **Negative control:** temporary fixed-width canary must turn test red.

### TEST-015 — Keyboard/accessibility
- **Oracle:** ORACLE-021.
- **Path:** keyboard-only project → Focus → mission → Review → decision; drawer/sheet close/restore focus; graph list alternative; reduced motion.
- **Evidence:** Playwright keyboard assertions + axe or equivalent focused accessibility scan if adopted; manual screen-reader spot check is owner/environment evidence, not silently claimed.

### TEST-016 — Bidi
- **Oracle:** ORACLE-022.
- **Fixture:** Persian sentence containing Latin IDs, URL, numbers, code/path in cards/table/review.
- **Pass:** semantic reading order and no overlap/clipping at 200%/320px.

### TEST-017 — Vendor/degraded adapters
- **Oracle:** ORACLE-023.
- **Path:** run without Tana/QMD and with missing two of three agent CLIs.
- **Pass:** project canonical reading/review/manual workflows remain usable; unavailable capabilities truthful.

### TEST-018 — Pilot value
- **Oracle:** ORACLE-024.
- **Method:** one real project, baseline week/session comparison.
- **Metrics:** re-entry median ≤60s; transcript search ≥70% reduction; technical understanding ≥90% without code; overload ≥1 point better; ceremony does not reduce meaningful completion.
- **Status:** owner/user study; cannot be automated into a fake PASS.

### TEST-019 — Flow outcome hierarchy
- **Oracle:** ORACLE-042.
- **Path:** load fixtures for Ready/Active/Blocked/Review/Accepted plus a mission with technical subtasks and a blocked dependency.
- **Positive proof:** outcome cards/lane state are correct; technical subtasks are nested; blocker route is visible; completed-but-unreviewed remains Review.
- **Negative control:** a fixture that maps completed directly to Accepted must fail.
- **Evidence:** Playwright assertions + desktop/mobile screenshots.

### TEST-020 — Handoff/bootstrap integrity
- **Oracle:** ORACLE-043.
- **Path:** on the untouched prepared baseline, run manifest verification, package QA, execution-contract validation, and local tool capability detection.
- **Pass:** all package gates pass; QA does not mutate signed `QA_REPORT.md`; required Git/Node/npm/Python capabilities have observed versions; optional agent tools degrade truthfully.
- **Evidence:** exact baseline SHA, command outputs, and before/after `QA_REPORT.md` hash.

### TEST-021 — Reproducible scaffold
- **Oracle:** ORACLE-044.
- **Path:** install from `package-lock.json`, then run typecheck, the smallest unit smoke, production build, and loopback-only development-server probe.
- **Pass:** commands succeed on the supported local Node LTS; no external-interface listener is opened; a clean reinstall produces the same dependency lock resolution.
- **Evidence:** exact candidate SHA, Node/npm versions, command outputs, listener address, and lockfile hash.

### TEST-022 — Workspace registry, classification and creation
- **Oracle:** ORACLE-046/048.
- **Path:** use temp roots for a valid canonical seed, ordinary folder, partial/corrupt canonical folder, two registered roots, fresh create, and create collision.
- **Pass:** classification is `ready`/`needs_onboarding`/`invalid` as observed; registration leaves target bytes unchanged; activation and stable IDs persist across restart; public responses omit absolute roots; fresh scaffold validates with no fabricated records and may have no active question; collisions do not overwrite.
- **Evidence:** exact candidate, before/after hashes, registry snapshot, focused unit/integration/API results.

### TEST-023 — Live five-surface and switching path
- **Oracle:** ORACLE-045/047.
- **Path:** start API and client together; register/activate canonical seed; observe network projection and Focus/Field/Flow/Review/Output; switch to a second workspace.
- **Pass:** visible identity and supported content come from the active API projection; unsupported surfaces are truthfully empty; switching removes stale prior-workspace truth; production render modules contain no demo fallback.
- **Evidence:** exact candidate, Playwright network assertions, visible markers for both workspaces, screenshots/traces where useful.

### TEST-024 — Real noncanonical project liveness
- **Oracle:** ORACLE-046/049.
- **Path:** observe a current safe marker from the owner-selected `mozare-wiki` root, hash/status the root, register and activate without onboarding, then launch through the owner path.
- **Pass:** the folder is unchanged; current classification and safe marker are visible; setup need is truthful; all five surfaces remain reachable without demo substitute; dark is default; browser response proves running API data flow.
- **Evidence:** exact candidate, current marker source, before/after Git/hash evidence, API response, browser observation, launcher/listener evidence.

### TEST-025 — GATE-LIVE static negative canary
- **Oracle:** ORACLE-045/049.
- **Path:** run the applied static gate, inject one disposable forbidden production marker, observe RED, remove it, then observe GREEN.
- **Pass:** known fixture regressions are rejected and the unchanged clean candidate passes; this supplements rather than replaces TEST-023/024.
- **Evidence:** commands/results and candidate identity before/after canary removal.

### TEST-026 — Durable work ledger and task-version resolution
- **Oracle:** ORACLE-051/052/055.
- **Path:** append queued/running/parked/completed/superseded records for one mission across multiple harness IDs; restart the service; introduce a stale predecessor and protected-value canaries.
- **Pass:** records remain append-only and restart-safe; latest version resolves deterministically; stale overwrite is rejected; parked work remains resumable; required provenance exists; prompt/secret/log canaries are absent.
- **Evidence:** exact candidate, ledger records, focused unit/integration results, before/after hashes.

### TEST-027 — Cross-harness continuation
- **Oracle:** ORACLE-050/052.
- **Path:** simulate Codex completing/parking version N, Claude Code continuing version N or creating N+1, Hermes continuing, then Codex returning from a stale base.
- **Pass:** stable project/mission/task identity and accepted state survive; each handoff names prior/current version; stale return cannot overwrite; UI projection shows who worked, result, remaining work and next action without transcript replay.
- **Evidence:** exact candidate, continuation packets, handoffs, conflict receipt and visible projection assertions.

### TEST-028 — Real three-adapter capability and lifecycle matrix
- **Oracle:** ORACLE-054 plus ORACLE-018/023/028.
- **Path:** for installed Claude Code, Codex and Hermes CLIs, observe executable/help probe, harmless read mission, disposable registered-worktree write containment, stop, structured handoff validation and restart reconciliation.
- **Pass:** all three satisfy the same contract on the exact candidate; unavailable/unsafe capability is truthful and blocks three-harness-ready status without losing work.
- **Evidence:** exact CLI/model versions when observable, argv/cwd records, handoffs, candidate diffs, stop/restart results and no-outside-root proof.

### TEST-029 — Model/effort routing and context-boundary privacy
- **Oracle:** ORACLE-053/055 plus ORACLE-029..034/039.
- **Path:** exercise deterministic, light, implementation, escalation and independent-QA routes; cross native compaction/restart boundaries where observable; inspect durable records.
- **Pass:** route and actual observable model/effort are recorded; defined escalation triggers work; bounded context retains critical refs/open work; no transcript replay, hidden reasoning, prompt body or secret enters durable continuity state.
- **Evidence:** route decisions, context snapshot/packet refs, compact/restart continuation result and privacy scan.

## Blind/informed repair loop

For every implementation candidate:
1. freeze exact HEAD/build;
2. rerun previously failing oracle tests unchanged before reading fix narrative;
3. run adjacent critical tests;
4. then inspect diff/implementation explanation;
5. never cite a test after the tested tree has changed;
6. generate new candidate identity after changes.

## Visual/subjective review

Automated geometry/accessibility gates can fail objectively. Aesthetic coherence (`ORACLE-H01..H04`) remains `QUALITY_RISK` until fresh-context/owner visual review. Do not convert aesthetic preference into contractual PASS from self-review alone.

## v0.3 required proofs — context economy and adaptive UI

### TEST-CTX-01 — Mission relevance + budget
Compile representative research/maker/technical/QA missions from a large fixture. Assert profile-specific relevant authority/acceptance remains, unrelated layer material is absent by default, duplicates are canonical refs, and target/hard budget behavior matches policy.

### TEST-CTX-02 — Targeted expansion
Begin with L1/L2 packet, expand one handle to L3, and prove no full-packet/project reload occurs. Evidence: packet before/after + expansion metrics.

### TEST-CTX-03 — Capsule validity canary
Valid capsule must be reused. Mutate each validity dimension (source hash, parser contract, authority metadata, schema compatibility) and each critical reopening trigger fixture; affected capsule must turn invalid and source-level route must be requested.

### TEST-CTX-04 — Delta continuation
Create snapshot A/B with small changes. Assert continuation packet contains changed refs + unresolved dependencies and does not repeat unchanged L2 history.

### TEST-CTX-05 — No silent truncation
Use a packet whose critical items exceed hard budget. Assert compiler returns escalation/block/batch requirement while all critical refs remain represented; it must not return apparently-ready truncated context.

### TEST-TOK-01 — Zero-model common path
Instrument Focus orientation/status, deterministic SystemLadder and normal status aggregation. Assert model call count = 0 and route `NONE`.

### TEST-TOK-02 — Structured handoff
Run fake/coding adapter fixture producing verbose logs. Assert canonical completion stores structured handoff/evidence refs without embedding full logs; default human completion view stays within configured visible-word budget.

### TEST-GUI-01 — Micro-library selection
For each intent (`orient/compare/decide/system/review`) assert exactly one bounded library is loaded into UI generation and unrelated component definitions are absent from prompt/spec.

### TEST-GUI-02 — Invalid OpenUI canary
Inject malformed syntax, unknown component, unknown action and forbidden action. Assert no trusted execution; deterministic fallback remains usable.

### TEST-GUI-03 — Proposal boundary
Generated `create_proposal` can create a reviewable proposal. Attempted direct canonical write/accept/shell call is impossible through exposed generated action registry.

### TEST-GUI-04 — Accessibility/responsive
Render every allowed semantic component and representative generated compositions at keyboard-only, 320px/390px/mobile/desktop, large text/zoom and reduced motion. Critical actions/information remain reachable.

### TEST-MET-01 — Telemetry privacy
Inspect stored metrics after representative runs; numeric/token/cache/route IDs exist while full prompt bodies, hidden reasoning and secret fixture values do not.

### TEST-MET-02 — Efficiency quality gate
Compare baseline/full-context fixture vs compiled-context policy on a controlled set. Report tokens + task/oracle outcome. A policy with lower tokens but worse critical outcome must be classified regression, not optimization.
