# EXECUTION INTAKE + LAUNCH COMPILER
## Final chat control for integrating product/design authority, QA obligations, technical architecture, repository truth, and launch conditions into one Claude Code workload

**Version:** 1.1 — post-simulation  
**Layer:** LLM final synthesis → middle-layer execution intake → Claude Code execution  
**Primary output:** `CLAUDE_CODE_EXECUTION_INTAKE.md`  
**Use:** Drop this file into the planning chat only after the project corpus and, when applicable, the outputs of the Product/Design compiler and QA compiler are available.

This file finishes the handoff. It is the place where product/design authority and QA authority are integrated with the **actual technical/repository/deployment situation**.

It must not reopen closed product/design decisions without new authorized evidence.

For large or long-running projects, prefer a fresh final-synthesis chat loaded with the exact middle-layer snapshots and current repository/deployment material. The middle layer, not conversational recollection, is the handoff memory.

Do not load raw QA logs or the entire historical design corpus if the middle-layer packet already carries the needed authority and evidence references. Expand source material only when a contradiction or implementation detail requires it.



---

# 0. THE THREE-LAYER PIPELINE

Keep the architecture explicit:

```text
LAYER 1 — LLM SYNTHESIS/QA BEHAVIOR
  Product/design compiler + QA compiler resolve meaning, consequence space, oracles,
  uncertainty, and owner-only gates.

MIDDLE LAYER — DURABLE AUTHORITY/INTAKE
  Product/design authority
  QA_STATE / oracle register / Claude QA contract
  Current truth / launch manifest
  Final CLAUDE_CODE_EXECUTION_INTAKE

LAYER 2 — CLAUDE CODE EXECUTION
  Inspects actual repo/current environment, implements closed decisions,
  reproduces defects, tests, integrates, freezes candidate, verifies CI/deployment,
  and stops at the authorized terminal state.
```

Claude Code is **not** asked to reconstruct product meaning from chat fragments.

The final intake must be self-contained enough that Claude can execute without the original conversation.

---

# 1. REQUIRED INPUTS

Use all available:

```text
PRODUCT_DESIGN_AUTHORITY
  authority_snapshot_id / revision
  DEC-*
  HZN-*
  OBJ-*
  SURF-*
  FLOW-*
  SCN-*
  COPY-*

QA_MIDDLE_LAYER
  qa_snapshot_id / revision
  QA_STATE
  ORACLE-*
  TEST-*
  DEFECT-*
  CLAUDE_QA_CONTRACT

CURRENT PROJECT TRUTH
  repo / branch / HEAD
  working-tree state
  current candidate/build
  stack
  schemas/APIs
  deployment configuration
  current live URLs
  external services
  CI/CD
  environment variables/secrets inventory
  database/storage state

OWNER LAUNCH INTENT
  terminal state
  deploy/merge authority
  downtime tolerance
  rollback expectations
  archive/migration expectations
  budget/hosting constraints
```

If one of these does not apply, mark it explicitly. Do not invent it.

---

# 2. RECONSTRUCT TECHNICAL AND DEPLOYMENT TRUTH BEFORE PLANNING

For existing work, establish:

```text
repository
default branch
current branch
known planning HEAD
current HEAD
uncommitted changes
release tags
current CI
current hosting/deployment
current domain(s)
current public route(s)
current backend/API
database/storage
external services
secrets/configuration
monitoring/logging
current rollback path
hosting/provider plan or quota constraints when decision-relevant
```

For greenfield work:

```text
chosen or owner-locked stack
local run path
target hosting/platform if decided
required persistence
required auth
required integrations
expected environments
```

If unstable/current platform facts can affect implementation, verify them from current primary documentation rather than memory.

Do not browse/research generically. Research only facts that can change a decision.

---

# 3. WORK MODE

Classify:

```text
GREENFIELD
EXISTING_PROJECT_CHANGE
RESCUE
FEATURE
BUG_FIX
DESIGN_RECOMPOSITION
MIGRATION
RELEASE_HARDENING
DEPLOYMENT
CUTOVER
STATIC_ARTIFACT_RELEASE
MOBILE_RELEASE
DESKTOP_PACKAGING
BACKEND_SERVICE
MIXED
```

The mode determines:
- how much baseline to preserve;
- whether migration/rollback is mandatory;
- whether deployment itself is part of acceptance;
- whether old public versions require archive/cutover handling.

## 3.1 Release units

Do not assume one repository equals one deployable.

Inventory release units:

```text
UNIT-FRONTEND
UNIT-API
UNIT-WORKER
UNIT-MIGRATION
UNIT-CRON
UNIT-MOBILE
UNIT-DESKTOP
UNIT-STATIC-ARTIFACT
...
```

For each:

```text
source path
build
environment
dependencies
deploy target
version identity
order constraints
rollback
health/smoke
```

Create a release-unit dependency graph when deployment order matters.

---

# 4. AUTHORITY PRECEDENCE

The final intake must state the actual precedence for this project.

Default:

```text
1. explicit owner-locked decisions in current intake
2. accepted product/design authority
3. accepted oracle/QA contract
4. applicable external standards/platform contracts
5. current repo/executable truth as implementation baseline
6. evidence
7. proposals
8. claims
9. historical/superseded docs
```

Important:

- Current repo truth can invalidate a plan assumption, but it cannot silently redefine accepted product behavior.
- Claude Code cannot revise product/design authority on its own. If new repo/runtime evidence proves an authority contradiction, record `AUTHORITY_CONTRADICTION`, stop only the affected branch, and return the smallest decision/revision request while continuing independent safe work.

- Tests are evidence/oracles only to the extent established by QA authority.
- If implementation and authority contradict, Claude must reproduce and classify before choosing which one changes.
- Stale docs/tests must be corrected after implementation truth stabilizes.

---

# 5. INTEGRATION GATE — CHECK THE MIDDLE LAYER BEFORE TECHNICAL PLANNING

Freeze:

```text
product_authority_snapshot_id
qa_snapshot_id
current candidate/repo identity
```

The final intake must record these identities so downstream execution cannot accidentally mix revisions.

Audit the chain:

```text
SCN-* → ORACLE-* → TEST/PROOF OBLIGATION → TASK-* → GATE-*
```

Not every normal scenario needs a dedicated test or task. But every:
- critical scenario;
- destructive state;
- migration state;
- historical defect;
- security/permission boundary;
- launch-critical flow;
must have a traceable proof obligation.

Check:
- no critical SCN has an unresolved product/design oracle;
- no open release blocker is hidden in QA_STATE;
- owner-only decisions are explicit;
- product/design authority and QA oracle revisions agree.

If a true product/design blocker remains:

```text
EXECUTION_INTAKE_NOT_YET_FINAL
```

If technical/platform evidence proves a closed requirement infeasible under another locked constraint, record:

```text
FEASIBILITY_CONTRADICTION
requirement
conflicting constraint
evidence
smallest owner decision needed
safe work that can continue
```

Do not let Claude silently reinterpret the product to fit the stack.


Do not send Claude into conceptual ambiguity.

---

# 6. BASELINE STRATEGY FOR WEAK OR GREENFIELD PROJECTS

## Weak/partial existing repo

Do not begin with a giant rewrite.

Use:

```text
1. establish a runnable baseline;
2. freeze the smallest protected behavior that must survive;
3. add characterization proof around changed/high-risk behavior;
4. implement the requested change;
5. improve architecture only where necessary for correctness/reliability;
6. expand tests around touched risk, not the entire historical codebase by reflex.
```

If documentation and executable truth disagree, executable truth establishes the baseline while product/design authority establishes the target.

## Greenfield/no repository

Create the minimal vertical slice, initialize Git early, then use the same execution harness and candidate identity rules.

Prefer:

```text
one complete user path
→ next complete path
→ failures/recovery
→ system qualities
```

over building every technical layer before integration.

# 7. COMPLETE THE TECHNICAL MODEL

Only now finalize technical choices.

## 7.1 Modules

For each relevant module:

```text
responsibility
inputs
outputs
state owned
dependencies
public contract
failure behavior
SCN/FLOW references
```

Examples:
```text
frontend
backend/API
domain layer
database
object storage
queue/jobs
auth
email/SMS
AI/model adapter
file import/export
observability
deployment
```

Do not invent modules merely for architectural symmetry.

## 7.2 State authority

For each semantic state, identify one authority:

```text
server DB
client canonical store
URL
local file
browser storage
background job
external provider
```

Separate:
```text
semantic persistent state
derived/cache state
presentation-only ephemeral state
```

Do not permit two independently mutable sources of truth for the same semantic fact unless a synchronization contract explicitly exists.

## 7.3 Data contracts

Define as relevant:

```text
schema
required/optional fields
identifiers
enums
timestamps
ownership
indexes/constraints
retention
provenance/audit
migration versioning
backup/recovery
```

## 7.4 API/command contracts

For each relevant operation:

```text
auth
input
validation
output
error classes
idempotency
timeout/retry
pagination
rate limit
side effects
```

## 7.5 External integrations

For each:

```text
purpose
provider/service
credential/secret
environment
request/response contract
timeout
retry/backoff
rate limit
webhook verification
degraded mode
owner billing/quota risk
test/sandbox availability
```

---

# 8. LAUNCH TOPOLOGY COMPILER

Classify the actual release topology.

Possible classes:

```text
NO_DEPLOYMENT
  local/offline/file artifact only

STATIC_HOSTING
  GitHub Pages / Cloudflare Pages / static bucket/CDN / equivalent

EDGE_SERVERLESS
  Workers/functions/edge routes

MANAGED_FULL_STACK
  hosted frontend + API + managed DB/storage/auth

CONTAINER_OR_VPS
  Docker/VM/server process

MOBILE_STORE
  iOS/Android distribution

DESKTOP_PACKAGE
  installer/signed desktop binary

BROWSER_EXTENSION
  extension package/store/enterprise deployment

EMBEDDED_OR_DEVICE
  software/firmware coupled to physical device or constrained hardware

DATA_OR_ML_PIPELINE
  scheduled/batch/stream pipeline or separately versioned model artifact

HYBRID
  more than one of the above

EXISTING_PRODUCTION_CUTOVER
  replacing a live version, route, schema, or infrastructure
```

Do not force cloud infrastructure into a self-contained artwork or local utility.

---

# 9. LAUNCH MANIFEST

Compile a project-specific launch inventory.

Use only applicable rows:

```text
SOURCE CONTROL
- repository
- default branch
- protected branches
- release branch/PR path
- tags/releases
- archive policy

RELEASE UNITS
- deployable units and dependency order
- shared schema/contracts
- coordinated version/cutover needs

BUILD
- language/runtime versions
- package manager
- lockfile
- build command
- deterministic/generated artifacts
- source/build parity

ENVIRONMENTS
- local
- preview
- staging
- production

HOSTING
- provider/project
- build output
- route/base path
- SPA/static routing
- headers/cache rules
- custom domains
- redirects/tombstones

DNS/TLS
- DNS owner/provider
- records
- TLS ownership
- cutover/propagation expectation

BACKEND
- service/runtime
- health endpoint
- scaling/concurrency
- timeout limits

DATABASE
- provider
- schema
- migration mechanism
- old-app/new-app compatibility window
- expand/contract or equivalent zero/low-downtime strategy when required
- backup
- rollback
- data retention
- environment separation

STORAGE
- object/file storage
- permissions
- lifecycle
- CORS if applicable

AUTH
- provider
- callback URLs
- token/session policy
- role/tenant mapping

EXTERNAL SERVICES
- sandbox/test vs production credentials
- email/SMS
- payments
- AI/model APIs + model/prompt/schema version pinning where behavior depends on them
- analytics
- error tracking
- maps/search
- webhooks
- any other provider
- reconciliation/replay process where provider outcomes can be late/partial

CONFIGURATION CONTRACT
- required environment variables
- defaults
- validation
- `.env.example` or equivalent when appropriate
- server/client exposure boundary

SECRETS
- names
- where stored
- which environment
- client/server boundary
- rotation/owner action

REALTIME / EVENT DELIVERY
- WebSocket/SSE/event transport if applicable
- connection/reconnect state
- ordering/deduplication
- replay/resume semantics

JOBS
- queue
- cron/scheduled work
- retries
- dead-letter/failed jobs

COMPLIANCE / POLICY
- applicable legal/regulatory authority if any
- privacy/data residency
- retention/deletion requirements
- consent/terms if applicable
- owner/legal approval gate

LOCALIZATION / TIME
- supported locales
- translation source
- RTL if applicable
- time-zone/DST authority
- locale-sensitive formatting/validation

OBSERVABILITY
- logs
- metrics
- errors
- alerts
- privacy/redaction

ROLLOUT
- feature flags if used
- canary/staged percentage if used
- environment approval
- rollback trigger
- compatibility with users on old clients/builds

CI/CD
- checks
- build
- migrations
- preview
- deploy
- exact-commit identity
- environment approvals

RELEASE/CUTOVER
- current public version
- archive/freeze old version
- maintenance/downtime
- data migration
- route switch
- cache invalidation
- live smoke
- rollback trigger
- rollback action
```

If information is unavailable, mark:

```text
UNKNOWN
OWNER_ACTION_REQUIRED
CLAUDE_DISCOVERABLE
NOT_APPLICABLE
```

Do not invent credentials, account names, project IDs, DNS ownership, or database locations.

---

# 10. EXISTING LIVE PRODUCT / PUBLIC ARTIFACT CUTOVER

When replacing a live version:

1. freeze current live/repo identity;
2. verify it has not drifted from the planning baseline;
3. archive/tag/release the old state if preservation is required;
4. preserve user data and migration compatibility;
5. create candidate separately;
6. verify candidate before route/domain switch;
7. switch only through the authorized deployment mechanism;
8. verify live URL/domain/route;
9. verify old-version archive/redirect/tombstone;
10. record exact deployed commit/build;
11. retain rollback path.

Never use "archive repository" if the repository must remain the active canonical project. Archive the historical **state/release**, not the living repository.

For static/artistic works, the exact artifact may itself be the release unit. Preserve byte identity where that matters.

---

# 11. DEPLOYMENT-SPECIFIC QUESTIONS

## 11.1 Static/GitHub Pages

Check:

```text
actual Pages source/workflow
base path
relative asset URLs
404 behavior
custom domain/CNAME
.nojekyll if relevant
old subpaths
deployment artifact identity
```

If replacing `/` and `/next/`-style concurrent versions:
- decide which becomes canonical;
- archive prior source state;
- retire or redirect obsolete route;
- do not leave two "current" editions accidentally.

## 11.2 Cloudflare or equivalent edge platform

Do not assume the project needs Workers, Pages, D1, KV, R2, Queues, or Durable Objects merely because Cloudflare is mentioned.

Derive only from product needs:
- static site → static hosting may be sufficient;
- server logic → function/worker;
- relational persistence → DB;
- object files → object storage;
- queues/schedules → only if required.

Verify current platform constraints from primary docs when a decision depends on them.

## 11.3 PWA/offline-capable web app

When applicable check:

```text
web app manifest/installability
service worker source-of-truth
cache versioning
offline shell/data behavior
stale cache after deploy
service-worker update/activation
old client + new backend compatibility
IndexedDB/local data migration
background sync if used
push notification permission/subscription if used
uninstall/reinstall consequences
```

A successful web deploy is not sufficient if old service workers can keep users on incompatible behavior.

## 11.4 Database-backed release

Require:
```text
schema ownership
migration direction
backup
forward compatibility
rollback/compensation
environment separation
seed/demo strategy if relevant
migration gate in CI/deploy
```

## 11.5 External API/model provider

Require:
```text
credential placement
quota/billing owner
timeout
retry
rate limit
fallback/degraded UX
unsafe/malformed response
observability
provider outage
test/sandbox behavior
```

## 11.6 Mobile/desktop

Require:
```text
signing
permissions/entitlements
deep links
storage
push notification environment if used
update channel / staged rollout
installer/app data migration
update behavior
store/notarization
device matrix
rollback/update path
```

Only if relevant.

---

## 11.7 Browser extension / host-platform plugin

When applicable check:

```text
manifest/platform version
permissions and least privilege
host permissions
content-script/background/service-worker lifecycle
store packaging/signing
review policy constraints
update behavior
host/browser version compatibility
enterprise/private distribution if used
```

For plugins inside another product, include the host application's API/version and permission boundaries.

## 11.8 Embedded/device-coupled software

When applicable check:

```text
hardware/firmware compatibility
device permissions/interfaces
offline/disconnected mode
safe failure state
telemetry
field update
power/restart/interruption
data buffering/replay
rollback/recovery
physical-device acceptance probe
```

Simulation is not a physical-device PASS.

## 11.9 Data/ML pipeline or trained-model release

When behavior depends on data/model artifacts, define release identity as:

```text
code commit
data/schema version
training/evaluation configuration
model artifact hash/version
serving config
```

Include:
```text
reproducibility
data quality
backfill/replay
schema evolution
metric thresholds
drift
rollback to prior model/data pipeline
privacy/licensing of training/input data
```

# 12. SECURITY AND PRIVACY CLOSURE

Select only relevant controls:

```text
secret handling
authn/authz
tenant isolation
CSRF
XSS
SQL injection
SSRF
file validation
webhook verification
rate limiting
PII
logging redaction
data retention
prompt injection/model output trust
dependency trust
dependency/source license compatibility when relevant
content security policy
```

Attach each to the scenario/technical boundary it protects.

Do not create a generic security appendix with no execution consequence.

---

# 13. PERFORMANCE / RELIABILITY CLOSURE

When relevant define measurable gates:

```text
startup/build size
render budget
latency percentile
throughput
memory
availability
retry/backoff
queue behavior
graceful degradation
offline behavior
recovery objective
```

Do not invent SLAs for artistic/local software that has no such requirement.

---

# 14. OWNER-ONLY LAUNCH DECISIONS

Ask only when truly required.

Examples:

```text
production domain ownership
paid provider/billing choice
legal/terms acceptance
data-loss risk acceptance
irreversible migration
public release authorization
store publication
security risk acceptance
```

Do not ask the owner to choose:
- module names;
- test directories;
- reasonable reversible library-free implementation;
- minor internal structure.

The final intake may be engineering-complete while deployment waits on:

```text
OWNER_ACTION_REQUIRED
```

Make that gate precise.

---

# 15. BUILD THE IMPLEMENTATION DAG

Use stable IDs:

```text
TASK-P00
TASK-P01
...
```

Each task:

```text
ID
objective
SCN/FLOW references
ORACLE references
dependencies
affected files/modules
protected neighbors
implementation direction
negative proof if defect
targeted proof
adjacent regression
launch consequence
done condition
```

Prefer dependency-correct phases.

Existing project example:

```text
P00 preflight/baseline
P01 characterization / protect current horizon
P02 domain/data changes
P03 product behavior
P04 design/UI/UX
P05 failure/recovery/accessibility
P06 migration/integration
P07 QA closure
P08 deployment/cutover
P09 docs/release evidence
```

Greenfield: prefer vertical slices over layer-first construction.

---

# 16. MINIMAL CLAUDE EXECUTION HARNESS

Do not create a second project-management system.

For an existing Git repo:

```text
.git/<project-slug>-execution/
  state.json
  logs/
  scratch/
  evidence-dev/   # only when justified
```

Suggested state:

```json
{
  "start_head": "",
  "current_phase": "",
  "completed": [],
  "open": [],
  "last_verified_sha": "",
  "last_full_gate": null,
  "blocking": null
}
```

This state is execution-local, not product authority.

---

# 17. CONCURRENCY / WORKTREE SAFETY

Primary worktree: single writer.

Before parallel work:

```bash
git status --porcelain=v1 > .git/<slug>-execution/logs/main-status-before.txt
git diff --binary > .git/<slug>-execution/logs/main-uncommitted-before.patch
git diff --binary --cached > .git/<slug>-execution/logs/main-index-before.patch
```

Parallel workers use isolated worktrees/sandboxes.

Read-only audit agents do not mutate the primary tree.

Never let a background worker casually run destructive Git operations in the primary worktree.

---

# 18. CLAUDE PREFLIGHT

The final intake begins with a bounded preflight.

Existing repo:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git log --oneline -12
git diff --stat
```

Then inspect only the smallest source-of-truth areas.

If the known planning HEAD has advanced:

```text
inspect only the diff/commits since known HEAD
classify whether they conflict with this intake
continue if safe
stop with a concrete drift report if not
```

Use:

```text
map → target → inspect
```

not a repository-wide context dump.

---

# 19. CLAUDE EXECUTION LOOP

For each task/batch:

1. inspect smallest relevant source/test area;
2. reproduce/falsify stated defect or missing behavior;
3. if defect:
   - negative oracle/proof fails;
   - smallest correct fix;
   - unchanged oracle passes;
   - adjacent/ripple tests;
4. if feature:
   - prove old state lacks required behavior where useful;
   - implement coherent slice;
   - prove user path;
   - prove failure/recovery;
5. if proof gap:
   - strengthen proof first;
   - change product only if stronger proof exposes real defect;
6. update local execution state;
7. batch related changes;
8. full gate at coherent boundary;
9. commit coherent verified work;
10. push only after required local gate.

Never weaken a threshold to obtain green.

Never cite a test run after editing the tree it tested.

---

# 20. SOURCE-OF-TRUTH EDITING

Name actual source files/modules in the project-specific intake.

Rules:

```text
edit semantic source
build/generate
verify generated parity
```

Do not hand-edit generated artifacts as separate implementations unless the artifact itself is the canonical source.

For a single-file born-digital work, that file may legitimately be the canonical source.

---

# 21. QA GATES IN THE CLAUDE INTAKE

Extend the middle-layer QA chain:

```text
SCN-* → ORACLE-* → TEST-* → TASK-* → GATE-*
```

Use stable gates:

```text
GATE-TARGETED
GATE-ADJACENT
GATE-FULL
GATE-BUILD
GATE-MIGRATION
GATE-CI
GATE-PREVIEW
GATE-PRODUCTION-SMOKE
GATE-ROLLBACK
```

Only include applicable gates.

For release-critical work, the final gate should bind:
- exact commit/build identity;
- exact tests run;
- unexpected skips;
- build artifact;
- deployment target;
- live smoke if deployment authorized.

---

# 22. CI/CD TRUTH

Do not trust a green badge alone.

Where release-critical, verify:
- exact commit;
- job;
- command;
- expected suite/count;
- no unexpected skip;
- build artifact;
- migration job;
- browser matrix if applicable;
- deploy result.

If local environment cannot run a required proof, close it with CI or another real environment and preserve the evidence-mode distinction.

---

# 22A. NEW-DEFECT RULE DURING CLAUDE EXECUTION

If implementation exposes a new issue, record:

```text
DEFECT_ID
SCN/ORACLE references
Given
When
Expected
Actual
root cause
affected files
protected neighbors
negative proof
targeted proof
closure result
```

Claude may fix it without reopening planning only when:
- it is clearly a defect against accepted authority;
- the fix requires no unresolved product/design/owner decision.

If it reveals an authority contradiction or owner-only trade-off, stop only that branch and return the precise decision required.

# 22B. SCOPE-FIDELITY AUDIT

Before final closure, map every changed tracked file to an authorized task:

```text
changed file
TASK-ID
intended effect
protected neighbor
proof
```

Unexplained changes are findings.

For each meaningful change ask:

```text
Did a protected property disappear?
Did the target behavior actually become observable?
Did a neighboring surface regress?
Was the requirement "satisfied" only by hiding/removing functionality?
```

Do not use scope audit as an excuse to reread every unchanged file.

# 22C. GREENFIELD PRODUCTION-COMPLETENESS CHECK

For a new product, confirm applicable production needs before calling it release-ready:

```text
configuration
environment variables
secrets
data/schema/migrations
auth/authz
errors
logging
health
build
deployment
seed/demo strategy
tests
accessibility/responsive
backup/rollback
```

An MVP can be small and still have a coherent run/deploy/recovery path.

# 23. DOCUMENTATION TRUTH

Update docs only after implementation truth stabilizes.

Keep distinct:

```text
planned
implemented
verified
deployed
accepted
released
```

Do not write "deployed" because a workflow file exists.

Do not keep stale limitations after the accepted implementation/test contract supersedes them.

Avoid documentation sprawl.

---

# 24. FINAL FREEZE

For release-candidate work:

1. all authorized tasks complete;
2. no unexplained tracked changes;
3. targeted tests green;
4. full local gate green;
5. second consecutive full gate only if risk justifies it;
6. record exact candidate SHA/build;
7. generate candidate-bound evidence;
8. push;
9. exact-head CI;
10. preview/staging verification if applicable;
11. deploy/cutover only if authorized;
12. verify live target;
13. verify rollback/archive path.

Do not call a candidate frozen if a generator then modifies tracked files.

---

# 25. TERMINAL STATES

The final compiler may produce:

```text
READY_FOR_CODE_EXECUTION
```

when the intake is closed.

Claude Code then targets one appropriate state:

```text
IMPLEMENTED_AND_VERIFIED
CANDIDATE_READY_FOR_REVIEW
RELEASE_CANDIDATE_READY
MIGRATION_READY_FOR_APPROVAL
DEPLOYED_TO_PREVIEW
PRODUCTION_DEPLOYED_AND_SMOKE_VERIFIED
ENGINEERING_READY_OWNER_ACTION_REQUIRED
```

Do not imply:
```text
MERGED
PRODUCTION_RELEASED
OWNER_ACCEPTED
```
unless explicitly authorized and actually achieved.

Human acceptance remains separate for artistic/design work.

---

# 26. FINALIZE THE SHARED MIDDLE-LAYER INDEX

If the project uses multiple authority files, update `MIDDLE_LAYER_INDEX.md` with:

```text
product_authority_snapshot_id
qa_snapshot_id
execution_intake_revision
current repo/candidate identity
launch topology
owner-action gates
supporting file paths
superseded package references
```

This is navigation/identity metadata, not a fourth authority that can override the three layers.

# 27. FINAL CLAUDE CODE EXECUTION INTAKE — REQUIRED STRUCTURE

Generate one primary file:

```text
CLAUDE_CODE_EXECUTION_INTAKE.md
```

Default to one file. Add a machine-readable companion only when genuinely useful.

Required sections:

## A. START HERE
```text
objective
terminal state
repo/current baseline
known candidate/deployed state
```

## B. AUTHORITY / CONFLICT RULE

## C. WORK MODE

## D. CURRENT TRUTH
```text
repo
branch
known HEAD
stack
deployment
services/data
```

## E. PROTECTED/TARGET HORIZON

## F. CLOSED DECISIONS
`DEC-*`

## G. PRODUCT/SCENARIO ACCEPTANCE
high-risk `SCN-*`, plus path to full atlas when large

## H. DESIGN/UI/UX CONTRACT
surface anatomy, copy, responsive, accessibility

## I. TECHNICAL CONTRACT
architecture, data, APIs, state authority, integrations, security

## J. QA CONTRACT
`ORACLE-*`, defects, evidence gaps, required Claude proofs

## K. ALREADY DONE / DO NOT REDO

## L. LAUNCH MANIFEST
hosting, environments, DB, services, secrets, CI/CD, domains, rollback

## M. MINIMAL EXECUTION HARNESS

## N. CONCURRENCY SAFETY

## O. PREFLIGHT

## P. TASK DAG
`TASK-*`

## Q. PER-PHASE EXECUTION LOOP

## R. TEST / QA GATES
`GATE-*`

## S. SOURCE-OF-TRUTH EDITING

## T. NEW-DEFECT RULE

## U. SCOPE-FIDELITY AUDIT

## V. FINAL FREEZE / CI / DEPLOYMENT / CUTOVER

## W. OWNER-ACTION GATES

## X. FINAL RESPONSE FORMAT

## Y. ONE-LINE DIRECTIVE

```text
Execute this intake against the current repository and continue through its defined terminal state without reopening closed product/design decisions unless new authorized evidence proves a contradiction.
```

---

# 28. FINAL INTEGRITY CHECK BEFORE HANDOFF

## Product/design integration
- Are critical SCNs present?
- Does Claude have enough UI/UX/copy detail to implement without inventing product meaning?
- Are owner-only choices isolated?

## QA integration
- Are critical oracles bound to SCNs?
- Are open defects visible?
- Are proof gaps not mislabeled as product work?
- Are downstream Claude tests concrete?

## Technical integration
- Is state authority clear?
- Are data/API/integration contracts sufficient?
- Are migration/rollback needs explicit?
- Are secrets/credentials not invented?

## Launch integration
- Is hosting topology explicit or marked owner/discovery gate?
- Are environments differentiated?
- Is DB migration/back-up/rollback covered when applicable?
- Are domains/DNS/custom routes covered?
- Is old-version archive/cutover covered when replacing live software?
- Is CI/CD exact-commit truth included?
- Is live smoke defined?

## Executor safety
- Does the intake preserve current uncommitted work?
- Is concurrency safe?
- Is source-of-truth editing clear?
- Is the terminal state honest?

If any critical answer is no, revise before marking `READY_FOR_CODE_EXECUTION`.

---

# 29. PORTABILITY / PROJECT-SIZE RULE

## Tiny project

Collapse:
- product authority;
- QA contract;
- technical plan;
into the one final intake.

Do not create a dossier.

## Normal project

Use:
```text
PRODUCT_DESIGN_AUTHORITY.md
QA_CONTRACT.md
CLAUDE_CODE_EXECUTION_INTAKE.md
```

## Large/complex/high-risk project

Keep modular product/design and QA packets, but Claude receives:
- one primary execution intake;
- exact paths to supporting authorities;
- no dependence on prior chat.

The executor should spend context on the repository and changed scope, not on re-reading years of project history.

---

# 30. BEGIN NOW

1. ingest product/design authority and QA middle layer;
2. reconstruct actual repo/technical/deployment truth;
3. verify current platform facts only where decision-relevant;
4. resolve technical architecture;
5. compile launch topology and owner-action gates;
6. build traceable implementation DAG;
7. bind QA obligations to tasks/gates;
8. define cutover/rollback;
9. generate the self-contained Claude Code intake;
10. run the final integrity checklist;
11. emit:

```text
READY_FOR_CODE_EXECUTION
```

or one precise blocking owner decision.

The purpose of this document is to make the middle layer **operationally complete**: Claude Code should receive resolved meaning, resolved proof obligations, resolved technical direction, and an honest launch path—without having to become the product strategist.
