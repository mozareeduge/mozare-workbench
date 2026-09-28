# Mozare Workbench — Purpose Evaluation Pack (2026-09-28)

Prepared by Claude Code (Opus 5.5) for an evaluation of the repository against the owner's purposes.
It records what the owner wanted from the start, what happened afterwards and why, where things
stand now, whether the purposes are still visible, and the shortest path to what the owner wants.

Evidence labels used throughout:

- **Observed**: seen in the running app or in a command result.
- **Code**: read in source or tests only.
- **Agent claim**: reported by an agent session and not independently re-verified.

---

## 0. What to evaluate (repository states)

| State | Git ref | What it contains | Checks when prepared |
|---|---|---|---|
| Released line | `main` = `dd61b9c` (also on GitHub) | Phase A: project discovery, working controls, CLI (MAWS + git) activity, mission → Review → Accept loop | 207 unit/integration + 47 browser tests pass (observed 2026-09-27) |
| Codex Phase B/C | `workbench-phase-b-c` = `cfaa6d4` (GitHub) | Full CLI missions, model/effort controls, carry-over of prior work, MAWS write on Accept, observed Field/Output, runtime moved to `%LOCALAPPDATA%\Mozare Workbench`, wiki evidence | An independent Codex review on 2026-09-27 returned **NOT READY** (5 blockers, §3.9) |
| Codex fixes, never committed by Codex | `wip/codex-review-fixes-20260927` = `aa1d2c4` (GitHub) | Codex's attempted fixes for the review blockers. They were uncommitted in the working tree; saved on 2026-09-28 so they cannot be lost | Observed 2026-09-28: typecheck, lint, build, **215** unit/integration and **47** browser tests pass. **Not independently reviewed.** |
| Evaluation pack | `evaluation/2026-09-28` | `aa1d2c4` plus this document | — |

To reproduce the checks on any state: `npm ci`, `npm run typecheck`, `npm run lint`, `npm run build`,
`npm test`, `npx playwright test` (the browser tests use ports 4183/5184 and do not disturb a running
Workbench), then `python scripts/qa_package.py`. To open the real app, run `START_MOZARE.cmd` or use
the desktop icon.

---

## 1. The owner's purposes (baseline)

### 1.1 Founding purpose (2026-09-14, `HISTORICAL/v0.1_SPEC/00_FRAMING.md`, `01_PRODUCT_SPEC.md`)

**Thesis.** *"Conversation is a control channel. The project is the interface object."* Agentic work
happens in transcripts and terminals, and that flattens multi-layered artistic, research, product and
technical projects. Workbench exists so the owner can see and steer the **project** rather than read
chats and logs.

**Primary user.** Mozare, who is a product manager, artist, researcher and writer. The interface must
not assume comfort with source code, terminals or developer dashboards.

**Jobs to be done (J1–J8).**

| Job | Original wording (short) |
|---|---|
| J1 | Re-enter a complex project and understand question, objects, decisions, active work, blockers, next action — without rereading chat |
| J2 | See interdependent layers (theory, material, method, design, implementation, evaluation) without flattening |
| J3 | Give an agent bounded work without composing a giant prompt |
| J4 | Review agent work first in human/system terms; code, diff and logs only on demand |
| J5 | Preserve decisions and uncertainty without an archive dump |
| J6 | One project grammar across article, artistic research, artwork, proposal, product, technical build |
| J7 | Continue with another agent (Claude Code, Codex, Hermes, …) without losing project identity |
| J8 | Recover without Workbench: files and Git stay intelligible |

**Principles (P1–P10).** State before narration · objects before transcripts · relations are objects ·
explicit authority · one human review queue · **agents work underneath the interface (harnesses are
adapters, not project universes)** · vendor-neutral durable state · every layer earns its existence
(minimum apparatus) · work and instrument stay distinct · completion requires evidence.

**v0.1 release definition.** One real repository-backed project end-to-end:
`orient → choose work → launch agent → receive proposal → inspect system result → verify →
accept/revise/reject → persist state → reopen`.

**Pilot metrics.** One real project over **at least seven active sessions**:
- naming the current state and next action takes 60 seconds or less;
- searches through old chats drop by 70% or more;
- every consequential run has a valid handoff;
- 90% or more of technical runs are understandable without opening the diff;
- no review item is ambiguous;
- post-session overload improves by at least one point on a 1–5 scale.

### 1.2 Purposes the owner restated later (2026-09-22 → 2026-09-27)

1. **Real, not decorative.** Every visible fact comes from the owner's real projects (2026-09-22, P10).
2. **Seamless cross-harness continuity.** The owner may work Codex → Claude Code → Codex. Workbench must
   keep who worked, when, in which harness, what was concretely done, what remains, the latest task
   version, and parked phases (2026-09-23).
3. **General, CLI-first.** *"The work is CLI work, no difference; we just made a light visual/UI layer
   on it, dynamic enough to cover the generativity of agentic harnesses."* This covers all projects,
   not one pilot project (2026-09-27).
4. **Automatic project awareness.** Workbench should see the projects the harnesses already have
   access to, local and cloud, not a hand-registered list (2026-09-27).
5. **Nothing is lost** if the machine is turned off (2026-09-27, Codex session).
6. **Plain product-level reporting and proof**, not self-reported readiness (standing preference).

---

## 2. Timeline — what happened and why

| Date | Event | Consequence |
|---|---|---|
| 09-14 | v0.1 spec written: thesis, J1–J8, P1–P10, pilot metrics | Clear, owner-shaped purpose |
| 09-15 | The v0.3.2 "execution handoff" package replaced the spec with a governance apparatus: 9 AUTHORITY files, 100+ scenarios, 55 oracles, a 37-task DAG and task cards. v0.1 moved to `HISTORICAL/`, and every agent is instructed *"Do not use HISTORICAL/ as current authority"* | **The founding purpose left the agents' field of view.** Agents executed task cards and oracles from then on |
| 09-15 → 09-19 | Claude Code built P01–P08: the five surfaces, projections, review logic, missions, context compiler, OpenUI representation library, accessibility and responsiveness, all against **fixture/demo data** (the TAROKE demo project) | Tests passed and gates were green, but the product showed demo content |
| 09-19 | Owner UI/UX addendum: "nothing is merely text", generative (OpenUI) layer within bounded slots | Representation library built; **never connected to a screen** (§3.8) |
| 09-21 → 09-22 | MAWS resume toward "candidate review". **Owner opened the app and found decorative UI.** ChatGPT produced the P10 recovery package | Scope reopened: live data plus the multi-project requirement |
| 09-23 | Codex: workspace registry, live surfaces, work ledger, adapters. Claude login expired | Live data arrived, but only for **Workbench-format projects** (`PROJECT.md`, `objects/`, `relations/`). Every real project was classified `needs_onboarding`, and onboarding was deferred |
| 09-24 → 09-25 | Claude Code: real three-harness chain, then WIRE-03 (sandbox missions → Review → Accept) | The J3/J4/J7 loop exists in code and was proven with real agents |
| 09-27 (morning) | Owner-path launch proof. The owner found: only 2 projects visible, Add/Create "dead", Flow cards static. An independent investigator found 12 gaps; the root cause was a spec rule that projects enter only by manual Add/Create, and no spec ever read the owner's real CLI work | Phase A fixed discovery, attribution, dead controls and the folder window, and was merged (`dd61b9c`) |
| 09-27 (afternoon) | Codex built Phases B/C on a branch. An independent Codex review said **NOT READY**: agents could write outside the copy, shutdown could strand work, Output could read outside the project via symlinks, a folder containing `artifacts/` got no view, and MAWS recording had no recovery | Codex started fixing, including a real Claude → Hermes → Codex mission chain through Workbench (agent claim), and **stopped before committing**. MAWS still shows `FINAL-VERIFY` active in repair round 3 |
| 09-28 | This evaluation. Codex's uncommitted work was secured on `wip/codex-review-fixes-20260927` | — |

### Why we are here (root causes, in order of weight)

1. **The purpose was replaced by a process.** The founding thesis and the jobs J1–J8 were archived on
   day 2. The agents' authority became a large checklist, so agents optimized for green gates and
   passing tests. Repeatedly, "ready" was declared while the owner still could not do the basic loop on
   their real work.
2. **Built on demo data first; real projects came last.** Eight phases were completed on fixtures. Real
   data (P10) arrived after the owner complained, and it assumed Workbench's own file format. The
   owner's real projects are CLI projects (git plus MAWS threads plus their own folder structures), so
   they appeared as "needs setup" with empty Field and Output. The **sidecar project state** that v0.1
   promised ("canonical sidecar project state"), which would give real projects their questions,
   decisions and relations, was never built.
3. **The human pilot never happened.** `TASK-P09-02` (a real project over seven sessions) has been
   pending since 09-15. Every readiness judgment came from agents, and each one broke on first real use.
4. **Fragmented execution.** Claude Code, Codex, ChatGPT and subagents worked in turn, on different
   branches, sometimes without committing. MAWS state lagged: it says "working tree clean" while
   uncommitted work existed. Self-reports were trusted over observation.
5. **The product repeated the problem it was meant to solve.** The owner had to re-explain the purpose
   in chat several times (09-22, 09-23, 09-27, 09-28). That is the transcript-centric failure v0.1 was
   written to end.

---

## 3. Current state against the purposes

Status key:
- **Met**: works for the owner's real projects (observed).
- **Partial**: exists but narrower than the purpose.
- **Missing**: not built.
- **Unverified**: code exists, not observed by the owner or independently.

| Purpose | main `dd61b9c` | wip `aa1d2c4` | Evidence / gap |
|---|---|---|---|
| Thesis: project is the interface object | Partial | Partial | Observed: Focus shows each project's MAWS thread, items, blockers and commits by harness. Missing: the project's own questions, decisions and relations for CLI projects |
| J1 Re-enter in 60 s or less | Partial | Partial | Observed for MAWS-tracked projects. Not measured. Projects without MAWS show only git and orientation |
| J2 Interdependent layers (Field) | Missing for real projects | Partial | main: Field is empty for CLI projects. wip: "observed" Field from folder structure (code) |
| J3 Bounded work to an agent | Met (code + one real run) | Met, extended (code) | Mission sheet → sandbox copy → proposal. wip adds model/effort and full CLI |
| J4 Review at the right level | Met | Met | Observed (browser tests + a real Claude mission): effect first, claims kept apart from observed evidence, Accept-only writes |
| J5 Decisions and uncertainty | Partial | Partial | Only Workbench-format projects and MAWS decisions. No decision or uncertainty objects for real projects |
| J6 One grammar across domains | Missing | Missing | No domain adapters. Only Workbench-format or raw MAWS/git |
| J7 Continue with another agent | Partial | Met (agent claim) | main: continue restarts from a fresh copy. wip: carries prior work; Codex reports a real Claude → Hermes → Codex chain through Workbench on 09-27 |
| J8 Recover without Workbench | Met | Met | Projects are never written without Accept. wip keeps records in `%LOCALAPPDATA%` and survives app version changes (code) |
| P6 Harnesses are adapters | Met | Met | Three harnesses probed and run. Open harness names in the activity reader |
| Real, not decorative | Met | Met | Static no-demo gate plus live views (observed) |
| Cross-harness continuity visible | Met for MAWS projects | Met | Observed: per-item attribution and parked phases |
| General, all projects | Met (discovery) | Met | Observed: 28 local and 14 GitHub projects found automatically |
| Generative UI layer | **Missing in product** | Missing | `src/core/representation/*` has no imports from `src/web` (code) |
| Nothing lost on shutdown | Partial | Partial→Met (unverified) | wip restores interrupted missions as partial work after restart (code, not re-reviewed) |
| Pilot metrics measured | **Missing** | Missing | `TASK-P09-02` never run |

### 3.9 Open review blockers (independent Codex review of `cfaa6d4`)

| # | Blocker | Addressed in `aa1d2c4`? |
|---|---|---|
| 1 | Agents with shell can write outside the sandbox before Accept | Attempted: OS write-boundary check for Claude and Hermes (Codex uses its own sandbox). **Needs re-review** |
| 2 | Shutdown during a mission strands work | Attempted: restart restores interrupted missions as partial proposals. **Needs re-review** |
| 3 | Output follows symlinks outside the project | Attempted: realpath containment in `ArtifactPreviews.ts`. **Needs re-review** |
| 4 | A folder with `artifacts/` or `objects/` but no Workbench records gets no view | Unknown. **Needs re-review** |
| 5 | MAWS write failure after Accept cannot be retried | Unknown. **Needs re-review** |

---

## 4. Are the purposes still visible?

- **In the repository:** only in `HISTORICAL/v0.1_SPEC`. Agents are explicitly told not to use that
  folder as authority. A text search of `AUTHORITY/`, `EXECUTION/`, `QA/` and `src/` finds **zero**
  occurrences of the thesis sentence, the v0.1 release loop, J8 (recover without Workbench) or the
  seven-session pilot; J7 survives only as a button label.
  `AUTHORITY/00_PRODUCT_HORIZON.md` keeps fragments (re-entry, bounded aperture, minimum apparatus,
  vendor neutrality). So the purposes are **present but not governing**.
- **In the product:** the five surfaces, review-first-at-system-level, Accept-only writes and
  harness-as-adapter are clearly visible. Missing are the parts that make it the owner's instrument
  rather than an agent console: real project objects (questions, decisions, relations) for existing
  projects, cross-domain grammar, the generative representation, and a measured pilot.

---

## 5. How to reach what the owner wants — shortest valid path

1. **Put the purpose back in charge (1 hour).** Add `AUTHORITY/00a_FOUNDING_PURPOSE.md` carrying §1
   verbatim (thesis, J1–J8, P1–P10, release loop, pilot metrics, and the restated purposes of §1.2), and
   make it the first required read and the top acceptance criteria in `CLAUDE.md`, `AGENTS.md` and
   `START_HERE_PROMPT.md`. Retire task-count "progress" as a readiness signal.
2. **Consolidate before adding anything (2–3 hours).** Independently re-review `aa1d2c4` against the
   five blockers in §3.9. Then merge or drop it, close the MAWS `FINAL-VERIFY` item with the result, and
   delete stale branches. The rule afterwards: one branch at a time, and every session commits before
   it stops.
3. **Build the missing sidecar for real projects (1–2 sessions).** Give CLI projects their questions,
   decisions, relations and outputs:
   - read what already exists (MAWS objectives, decisions and items; README and headings; git
     history; the wiki's own objects and relations);
   - write a Workbench sidecar only after the owner confirms it, never into the project without Accept.

   This is what turns J1, J2, J5 and J6 from "partial/missing" into "met".
4. **Run the pilot for real (the owner, 7 short sessions).** Use one real project and measure the §1.1
   metrics. After each session, record five answers:
   - Could you name the current state and next action?
   - Did you need an old chat?
   - Was any review item unclear?
   - Overload rating, 1–5.
   - What felt wrong?

   Fix only what the pilot shows. Nothing is "ready" until the owner says so.
5. **Then the generative layer (1 session).** Connect `RepresentationPlanner` to one slot (for example
   a mission result or a Focus summary) with deterministic fallback, and keep it only if the pilot shows
   it helps (principle P8).
