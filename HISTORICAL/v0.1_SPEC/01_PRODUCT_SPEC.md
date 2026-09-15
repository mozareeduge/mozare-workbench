# 01 — Product Specification

## 1. Product name

**Mozare Workbench**

Working descriptor: **a local project field for human–agent artistic, scholarly, product, and technical work**.

## 2. Primary user

Mozare / Mohammad Zare: product manager, artist, writer/researcher, artistic researcher, and maker of browser-native/procedural works. The primary interface must not assume comfort with source code, terminal semantics, or developer dashboards.

## 3. Jobs to be done

### J1 — Re-enter a complex project
After an interruption, open the project and understand its current question, important objects, latest decisions, active work, blockers, and next action without rereading chat history.

### J2 — See interdependent layers
Perceive relations among research/theory, materials, methods, design decisions, implementation, and evaluation without flattening them into one document.

### J3 — Give an agent bounded work
Select an object or problem, define intended result and acceptance criteria, choose an agent, and launch work without manually composing a giant context prompt.

### J4 — Review agent work at the right level
First see what changed in human/system terms. Then inspect architecture, files, diff, logs, or source passages only when needed.

### J5 — Preserve decisions and uncertainty
Keep accepted decisions, unresolved questions, rejected routes, counterevidence, and residual material without turning the current surface into an archive dump.

### J6 — Move across domains
Use the same project grammar for an article, artistic research project, interactive artwork, proposal, product/service design, or technical implementation while allowing domain-specific objects and views.

### J7 — Continue with another agent
Switch among Claude Code, Codex, Hermes, or another harness without losing project identity or reconstructing the whole context manually.

### J8 — Recover without the workbench
Open the canonical files and Git history if the UI breaks or is abandoned.

## 4. Core scenarios

### Scenario A — Artistic research

1. User opens an Ontograph/Ganjoor-like project.
2. Field view shows research question, theoretical objects, source clusters, materials, experiments, design decisions, and open relations.
3. User selects an unresolved relation.
4. Focus view shows evidence/counterevidence, current use-status, and two candidate next operations.
5. User launches Researcher agent on a bounded mission.
6. Agent returns sources and relation proposal.
7. Review view shows proposed state change and confidence/evidence, not a 4,000-word transcript.
8. User accepts only the supported relation and leaves another unresolved.
9. Event trace records the accepted transformation.

### Scenario B — Writing / proposal

1. User opens current proposal.
2. Flow shows research question → argument sections → evidence coverage → review status.
3. Reviewer flags two unsupported claims and one rhetorical redundancy.
4. User selects only one section for revision.
5. Writer agent returns a revised artifact plus a change rationale.
6. Review shows passage-level diff, source support, and resulting argument structure.

### Scenario C — Technical build

1. User opens Sangar-like project.
2. Focus shows intended behavior and current milestone.
3. User selects “Joiner local-network proof.”
4. Technical Lead composes mission with system behavior + acceptance test and launches Claude/Codex/Hermes in a worktree.
5. Workbench tracks run state without streaming every command by default.
6. Returned review shows:
   - behavior now achieved;
   - architecture affected;
   - risk;
   - tests run;
   - artifact/APK path;
   - code diff as optional detail.
7. User can approve, request revision, or reject.

### Scenario D — Browser-native artwork

1. User opens TAROKE-like project.
2. Output shows current playable artifact and project archive separately.
3. Field shows material banks, transformation devices, surface behavior, and experiments.
4. User creates a mission from an aesthetic/design problem.
5. Agent modifies an isolated implementation branch.
6. Review links directly to local preview plus visual/interaction QA evidence.

## 5. Product surfaces

The top navigation has only five primary modes:

1. **FIELD** — topology: what exists and how it relates.
2. **FOCUS** — bounded current object/question/action.
3. **FLOW** — process: stages, dependencies, missions, blockers.
4. **REVIEW** — what needs human judgment.
5. **OUTPUT** — inspectable produced artifacts.

Contextual panels provide Source/Evidence, System, Trace, and Technical Details without becoming top-level destinations.

## 6. Core object types

Mandatory base grammar:

- Project
- Question
- Source
- Material
- Concept
- Claim
- Relation
- Method
- Experiment
- Decision
- Artifact
- Task
- Mission
- Test
- Review
- Residue

Projects can add domain-specific subtypes but must map to the base grammar when agents exchange state.

## 7. State vocabulary

Avoid a single overloaded status field. Use independent dimensions:

### lifecycle
`captured | active | blocked | review | accepted | superseded | archived`

### evidence state
`unexamined | candidate | supported | contested | contradicted | verified`

### use status
`inactive | exploratory | active | restricted | rejected`

### verification state
`untested | partial | passed | failed | not_applicable`

A claim can therefore be `active + contested`; an artistic relation can be `active + candidate`; a build can be `review + passed`.

## 8. Product boundaries

### Workbench owns

- visual project orientation;
- canonical sidecar project state;
- relations and event trace;
- mission packets;
- proposal/review state;
- agent adapters;
- artifact registry;
- system-level translation of technical work;
- safe local MCP interface.

### External systems retain authority for

- Mozare Wiki records and its validation/release controller;
- Git repositories and their own source/test rules;
- Tana/Obsidian content when used;
- Claude/Codex/Hermes internal sessions;
- original source files;
- domain-specific editors (audio, image, code IDE, etc.).

The workbench integrates; it does not silently import ownership.

## 9. Success metrics for pilot

Measure with one real project over at least seven active sessions.

| Metric | Target |
|---|---:|
| Time from launch to naming current project state + next action | ≤ 60 sec |
| Old-chat searches needed to resume work | ≥ 70% reduction from baseline week |
| Consequential agent runs with valid handoff | 100% |
| Technical runs understandable without opening code diff | ≥ 90% self-rated yes/no |
| Accepted changes with linked verification/evidence | 100% where applicable |
| Recovery after deleting derived cache/views | 100% canonical objects restored |
| Human review queue ambiguity | zero items without clear requested judgment |

Subjective pilot measure: post-session overload, 1–5. Target is at least one-point improvement over transcript/terminal baseline without lower task completion.

## 10. UX acceptance heuristics

- Home is never an empty chat prompt.
- Raw transcript is never auto-expanded.
- Default Focus view contains one primary question/action.
- Default overview exposes at most seven primary cards/nodes before grouping/filtering.
- Every state badge has textual/shape redundancy; do not rely on color alone.
- A user can reach provenance or verification in at most two interactions from a claim/decision/result.
- No technical acronym appears in the main result summary without expansion or tooltip.
- Review never begins with file diff; it begins with intended/system effect.
- The UI never labels a run “verified” solely because an agent says it succeeded.

## 11. Release v0.1 definition

v0.1 is successful when it can manage one real repository-backed project end-to-end through:

`orient → choose work → launch agent → receive proposal → inspect system result → verify → accept/revise/reject → persist state → reopen`.

Multi-agent autonomous planning is not required for v0.1.
