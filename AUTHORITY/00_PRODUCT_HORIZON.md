# 00 — Product Horizon and Authority

**Authority snapshot:** `MWB-PD-2026-09-15-r3`  
**Mode:** `GREENFIELD + ARTISTIC_SOFTWARE + RESEARCH_INSTRUMENT + INTERNAL_TOOL + MIXED`  
**Artifact mode:** `COLLAGE_PACKAGE` plus a `BOUNDED_FINAL_ARTIFACT` interaction prototype  
**Status:** `PRODUCT_DESIGN_AUTHORITY_CLOSED`

## 1. Current truth

Mozare Workbench does not yet exist as a production application. v0.1 and v0.2 are prior handoff stages. v0.3 freezes product/design meaning together with context-economy and adaptive-representation behavior before code execution.

### PROJECT

- **Name:** Mozare Workbench.
- **Purpose:** a local-first interface for complex artistic, scholarly, writing, product, technical, and QA work performed with AI agents without making long chat transcripts, terminals, or source code the primary human environment.
- **Primary user:** Mohammad Zare / Mozare, working as product manager, artist, artistic researcher, writer, reviewer, and project owner.
- **Maturity:** pre-code architecture and product authority, with validated bounded interaction prototype.
- **Canonical state target:** ordinary local Markdown/YAML/JSON + Git + external authoritative systems referenced by adapters.
- **Primary platforms:** Windows desktop first; browser-local responsive UI at loopback; no mandatory cloud account.
- **Agent harnesses:** Claude Code, Codex, Hermes are worker adapters, not the human-facing source of truth.

### REQUESTED TERMINAL PRODUCT STATE

The production candidate must let the user:

1. re-enter a project and know where things stand without reading previous chats;
2. perceive conceptual, evidentiary, methodological, design, technical, implementation, and QA layers without flattening them;
3. move between a spatial field, bounded focus, process flow, human review queue, and produced artifacts;
4. hand bounded missions to an agent without writing mega-prompts;
5. receive technical work first as system behavior and verification, with implementation detail available progressively;
6. keep consequential agent changes in proposal/review state until accepted;
7. recover project truth from ordinary files/Git even if the Workbench UI disappears;
8. work with Mozare Wiki and project repositories without copying their authoritative truth into a weaker store;
9. reduce ambient text volume and project re-entry cost while preserving depth on demand.

## 2. Authority map

| Role | Material | Use in v0.3 |
|---|---|---|
| OWNER_LOCKED | user's current request and previously accepted core principles | governs target experience |
| ACCEPTED_TARGET | v0.1 handoff invariants retained below | preserved unless explicitly superseded |
| CONTROL | three compiler documents in `CONTROL/` | governs authority/QA/execution structure |
| CURRENT_PRODUCT_TRUTH | v0.1 prototype/package | evidence of prior design, not target by default |
| EXTERNAL_AUTHORITY | filesystem/Git semantics, agent CLI contracts, MCP/tool contracts when implemented | verified during execution if decision-relevant |
| EVIDENCE | package QA, browser tests, screenshots | validates the handoff/prototype only |
| PROPOSAL | optional Tana/Obsidian/MCP Apps integrations | adapters, not required core |
| HISTORICAL | v0.1/v0.2 superseded details | reference only |

## 3. Protected horizon

The following product properties survive all implementation choices.

- **HZN-001 — Canonical/derived separation.** Human layouts, caches, visual projections, AI phrasing, and indexes are replaceable. Canonical project truth remains recoverable from ordinary local records and Git.
- **HZN-002 — No transcript home.** A blank chat, terminal stream, or agent transcript cannot be the default product surface.
- **HZN-003 — Progressive technical disclosure.** Technical work is presented in the order `Intent → System behavior → Architecture → Implementation → Verification`; user-visible review begins at human/system effect.
- **HZN-004 — Proposal boundary.** Consequential canonical changes proposed by agents require human acceptance; agents cannot self-accept through MCP or another adapter.
- **HZN-005 — Authority-aware evidence.** Retrieved source candidates remain candidates until routed to authoritative source/original and deliberately captured/used.
- **HZN-006 — Relation objects.** Important relations can carry uncertainty, evidence, use status, and history; a line between nodes is a projection, not the relation itself.
- **HZN-007 — Work/artifact distinction.** Editable/canonical, generated/distributable, temporary, external, and historical artifacts are visibly distinguished.
- **HZN-008 — Vendor neutrality.** Core recovery and project continuity do not depend on Tana, Obsidian, Claude, Codex, Hermes, or a cloud account.
- **HZN-009 — Human review is bounded.** The product presents a finite queue of decisions/changes needing human judgment rather than ambient agent prose.
- **HZN-010 — Bilingual/mixed-direction integrity.** Persian and English text, identifiers, code, numbers, and tables remain readable without global RTL/LTR corruption.
- **HZN-011 — Safe local operation.** Local service binds loopback by default; agent processes and previews are isolated according to explicit safety policy.
- **HZN-012 — Apparatus must earn its cost.** The first pilot measures project re-entry, transcript-search reduction, comprehension of technical work, subjective overload, and ceremony cost.

## 4. Closed decisions

- **DEC-001 — Human front door:** the Workbench itself, not an agent harness, is the primary human surface.
- **DEC-002 — Core views:** `FOCUS`, `FIELD`, `FLOW`, `REVIEW`, `OUTPUT`. Search/command and project switching are shell utilities, not sixth/seventh conceptual views.
- **DEC-003 — Default landing:** `FOCUS`, because the first need after re-entry is orientation and next action.
- **DEC-004 — Canonical state:** local text/structured files + Git; no mandatory database in first release.
- **DEC-005 — UI technology direction:** local browser application, desktop-first responsive; no Electron/Tauri requirement for first release.
- **DEC-006 — Visual character:** calm studio/control surface, high information clarity, low decorative density, neutral material palette with semantic accents, generous whitespace, stable geometry, no “AI dashboard neon”.
- **DEC-007 — Navigation:** persistent compact left rail on wide desktop; compact top/bottom transformation on narrower widths; human position in project remains visible.
- **DEC-008 — Review detail order:** effect → evidence → rationale/architecture → implementation; implementation stays collapsed by default.
- **DEC-009 — Mission creation:** object-first guided sheet generated from current context, not a blank prompt box.
- **DEC-010 — FIELD default:** curated 10–30 node projection centered on current object/question; not the whole knowledge graph.
- **DEC-011 — FLOW default:** outcome-level work, not engineering microtasks. Technical subtasks remain inside a mission until expanded.
- **DEC-012 — OUTPUT default:** recent/important produced artifacts with canonicality and verification status; no generic file browser.
- **DEC-013 — Typography:** local/system font stacks; no runtime web-font dependency in first release.
- **DEC-014 — Responsive rule:** transform interaction rather than hide product capability. Mobile becomes focused single-pane work; desktop supports spatial comparison.
- **DEC-015 — AI summaries:** permitted only as derived phrasing with routes to canonical facts; never sole authority.
- **DEC-016 — Optional visual ecosystems:** Tana/Obsidian are adapters after core release, not source of truth.
- **DEC-017 — First release pilot:** use one real Mozare project with conceptual + artifact/technical layers, preferably TAROKE RIMIXER or a current artistic-research project.
- **DEC-018 — Release topology:** `NO_PUBLIC_DEPLOYMENT` for v0.3 implementation target; local Windows application served at loopback. Public/cloud release is a future owner decision.

## 5. Explicit non-goals

The first release does not need to become:

- an IDE;
- a replacement for GitHub or Mozare Wiki;
- an autonomous company/org simulator;
- a full personal knowledge-management migration;
- a raw multi-agent observability console;
- a social/collaborative SaaS;
- a vector database for all personal material;
- a generic note-taking application;
- a public cloud product.

## 6. Product success

### Objective acceptance

- re-entry to current state and next action in ≤60 seconds for pilot tasks;
- one bounded mission can complete `FOCUS → agent → evidence → REVIEW` without requiring user to inspect raw transcript;
- every consequential accepted change has a review/event route;
- generated layout/cache can be deleted and reconstructed without canonical data loss;
- technical review can be completed at system level unless user chooses deeper disclosure;
- keyboard-accessible route exists for all primary flows;
- 320px/200% zoom does not make primary actions unreachable.

### Pilot value acceptance

- ≥70% reduction in searching old AI transcripts compared with baseline week;
- ≥90% of technical reviews understandable without opening source code;
- ≥1 point improvement on a 1–5 subjective overload scale;
- no measurable loss in completed meaningful work attributable to Workbench ceremony.

## 7. Owner gates

No product/design blocker remains for initial implementation. Later owner gates are limited to public release authorization, paid-provider choices if introduced, aesthetic acceptance of the production UI, and any irreversible migration of existing personal/project material.

## 7. v0.3 context-economy and generative-representation horizon

The following requirements are product authority, not optional implementation advice.

- **HZN-013 — Minimum-sufficient context.** Agent/model context is compiled per mission from authority, relevance, dependency and change state. Whole-project dumps are exceptional escalation, not normal operation.
- **HZN-014 — State before prose.** Stable facts, statuses, relations, test results and actions are represented as structured state and references. Prose is generated only when synthesis/explanation is itself useful.
- **HZN-015 — Checksum-bound capsules.** Previously fully read unchanged material may use compact derived capsules only while source identity, parser contract, authority metadata and relevant schema remain compatible. A capsule accelerates traversal; it is never independent evidence.
- **HZN-016 — Progressive context resolution.** Durable referents expose `L0 handle → L1 compact → L2 working → L3 source`. Agents expand only the referents required by the current uncertainty.
- **HZN-017 — Stable shell, controlled generative representation.** Focus/Field/Flow/Review/Output remain stable spatial/procedural landmarks. Adaptive UI may compose bounded content inside them but cannot replace navigation, authority boundaries, review semantics or canonical state.
- **HZN-018 — Generative UI is derived and capability-bounded.** Model-generated interface programs are disposable projections over structured project state. They may call only allowlisted read/action tools. Consequential mutation still enters the proposal/review boundary.
- **HZN-019 — Zero-model path first.** Deterministic rendering, cached derivation and ordinary computation are preferred whenever they can meet the same product outcome. A model call must add semantic judgment, synthesis or adaptive representation that cannot be obtained reliably from existing structured state.
- **HZN-020 — Token efficiency is measured with quality.** Context tokens, output tokens, cache hits, expansions and duplicate-context ratio are observable locally and evaluated beside task success, defect rate and human comprehension. Lower token use never justifies lower evidentiary or product quality.

### Additional closed decisions

- **DEC-019 — ContextCompiler is core infrastructure.** Real agent adapters cannot ship before mission-specific context compilation, reference expansion, snapshot/delta and capsule invalidation work against the deterministic fake adapter.
- **DEC-020 — Context resolution contract.** `L0` = stable ID/handle; `L1` = one-line compact statement; `L2` = bounded working record with rationale/consequences/references; `L3` = authoritative source or complete record. Default packets use L0–L2 and fetch L3 on demand.
- **DEC-021 — Default context budgets are enforced by the compiler, not prompts.** UI-composition target/hard = `700/1200` tokens; simple mission = `800/1400`; normal mission = `1800/3200`; complex mission = `3500/6000`; structured handoff = `450/800` excluding referenced artifacts. Budgets are configurable and escalation may exceed them with a recorded reason.
- **DEC-022 — Role-scoped packets.** Research, making/writing, technical implementation and QA receive distinct context profiles. Shared objective/authority/acceptance remains common; unrelated layer detail is omitted until dependency expansion.
- **DEC-023 — Delta-first continuation.** Subsequent work from a known snapshot receives changed objects/relations/decisions/files plus unresolved dependencies. It does not replay unchanged history.
- **DEC-024 — Model routing uses capability tiers, not hard-coded vendors.** Routes are `NONE`, `LIGHT`, `STRONG`, `CODING_AGENT`, `INDEPENDENT_STRONG`. Local adapter configuration maps available models/harnesses to tiers.
- **DEC-025 — Output contract is structured-first.** Agent completion is persisted as structured handoff/evidence/artifact references. Human narrative is rendered on demand. Raw transcript is diagnostic only.
- **DEC-026 — OpenUI is the preferred adaptive representation engine, not a new source of truth.** Production implementation uses a small Mozare semantic component library and OpenUI Lang when adaptive composition is justified; common Workbench states remain deterministic. If OpenUI is unavailable or invalid, deterministic fallbacks preserve all critical actions/information.
- **DEC-027 — Micro-libraries, not one universal GenUI prompt.** The renderer selects a small component subset (`orient`, `compare`, `decide`, `system`, `review`) before generation. This reduces component-prompt tokens and constrains representation choice.
- **DEC-028 — Generated actions are allowlisted.** OpenUI Query/Mutation/action bindings may invoke only declared Workbench tools. Canonical writes cannot be exposed directly; write-like actions create proposals.
- **DEC-029 — AG-UI is an optional transport adapter after the first functional agent loop.** v0.3 does not require a protocol migration. Internal events keep an adapter boundary so AG-UI can later carry state/event/interrupt semantics without redesigning canonical state.
- **DEC-030 — Local token telemetry is privacy-bounded.** Persist counts, route, context IDs, cache/expansion metrics and success linkage; do not persist hidden reasoning, secrets or full prompts merely for telemetry.
