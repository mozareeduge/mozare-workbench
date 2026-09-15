# 04 — UI / UX Specification

## 1. Experience goal

Opening the workbench should feel like returning to a studio/research table whose state remained arranged, not reopening a transcript of everything said in the studio.

The primary perceptual qualities are:

- low ambient textual volume;
- persistent orientation;
- clear object boundaries;
- visible but non-coercive relations;
- stable locations during inspection;
- deliberate transitions between overview and detail;
- direct access to the produced work.

## 2. Shell

Desktop-first responsive web app, local at `127.0.0.1`.

```text
┌───────────────────────────────────────────────────────────────────┐
│ Project ▾    FIELD  FOCUS  FLOW  REVIEW(2)  OUTPUT      ⌕  Status │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│                      CURRENT SURFACE                              │
│                                                                   │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│ Current question / state                         Agent activity ●  │
└───────────────────────────────────────────────────────────────────┘
```

No permanently open agent chat panel.

## 3. FIELD

Purpose: topology and possibility space.

### Default composition

- current project/object at center;
- current question/object cluster prominent;
- 3–7 primary neighboring objects;
- groups for collapsed clusters;
- relation labels only on hover/select when density is high;
- uncertain relations visibly neutral/dashed and labeled “unsettled” rather than inferred semantics.

### Interactions

- click node → contextual drawer;
- double-click / Enter → Focus;
- click relation → relation-object drawer;
- drag only changes view layout, never canonical relation;
- connect mode explicitly creates a **relation proposal**, not an immediate canonical edge;
- filters: active, evidence, type, project layer, recent change;
- “Why is this here?” shows provenance of the node's inclusion in current view.

### Layout persistence

Coordinates are derived view state. If layout file is deleted, deterministic auto-layout must reconstruct an intelligible map.

## 4. FOCUS

Purpose: bounded working aperture.

```text
┌─────────────────────────────────────────────────────────────┐
│ CURRENT QUESTION                                            │
│ How can OOO become an operational design method?            │
│                                                             │
│ STATE     Active · evidence mixed                            │
│                                                             │
│ RELATED                                                   ▸ │
│ 3 sources · 2 methods · 1 experiment · 2 unresolved links   │
│                                                             │
│ NEXT MEANINGFUL ACTION                                      │
│ Compare method claims against experiment evidence.          │
│                                                             │
│ [Work on this]   [Open field]   [Evidence]   [Trace]        │
└─────────────────────────────────────────────────────────────┘
```

Default textual content should be short. Long bodies open intentionally.

### Orient me

Available from any project. Returns a deterministic card:

- current objective/question;
- last accepted decision;
- active mission(s);
- blockers;
- review items;
- latest verified artifact;
- one recommended next action with explanation.

It may use AI to phrase the card, but all state facts must derive from canonical records.

## 5. FLOW

Purpose: process state and dependency, not generic task management.

Supports two visual modes:

### Pipeline

```text
QUESTION → EVIDENCE → EXPERIMENT → DECISION → ARTIFACT → REVIEW
                  ↘ unresolved ↗
```

### Work board

`Ready | Active | Blocked | Review | Accepted`

Cards show:

- human-readable outcome;
- agent/human owner;
- target object;
- blocker/dependency;
- verification state.

Do not show raw engineering subtasks on the default product/artistic board unless user expands the technical mission.

## 6. REVIEW

Purpose: one queue for human judgment.

Every review opens in this order:

### A. Human/system effect

- What was requested?
- What changed in the project's behavior/argument/form/state?
- What remains unresolved?

### B. Evidence / verification

- tests executed;
- source evidence;
- artifact preview;
- screenshots/report where relevant.

### C. Architecture / rationale

- components/objects affected;
- design decision;
- risks/tradeoffs.

### D. Implementation detail

- files changed;
- diff;
- terminal logs;
- technical diagnostics.

Controls:

`Accept` · `Request revision` · `Reject` · `Preserve as residue`

Accept requires stale-base/conflict check.

## 7. OUTPUT

Purpose: experience produced things rather than read descriptions of them.

Artifact gallery supports previews when safe:

- HTML/local website → embedded or open local preview;
- image → image preview;
- audio → player;
- video → player;
- PDF → embedded viewer/link;
- Markdown/text → rendered reading view;
- JSON/YAML → structured inspector;
- build binary/APK → metadata + checksum + path, not execution by default;
- test report → summarized result + open full report.

Canonical/editable artifact and distributable/generated artifact must be labeled distinctly.

## 8. Contextual panels

### Evidence

Shows sources, authority, evidence state, supporting/counterevidence, route to original.

### System

Shows the 5-level ladder:

`Intent → System behavior → Architecture → Implementation → Verification`

### Trace

Shows selected genesis events; filters out low-value execution noise.

### Technical terms

A term chip expands:

- term;
- plain system meaning;
- why it matters here;
- optional exact technical detail.

## 9. Agent launch interaction

The human should not compose a mega-prompt.

Select `Work on this` and get:

```text
TARGET
[Current object/question]

OUTCOME
[editable one-sentence desired result]

CONTEXT
✓ current object
✓ 4 linked sources
✓ 2 accepted decisions
□ include historical residue

AGENT
Claude Code ▾

ACCEPTANCE
+ Add criterion

[Review mission packet]     [Start]
```

Advanced technical settings remain collapsed.

## 10. Agent activity

Small ambient indicator only:

`Researcher · running · 4m · collecting evidence`

Clicking opens run detail:

- mission;
- current coarse phase;
- subagent names if available;
- latest safe event;
- stop button;
- raw log disclosure.

Do not continuously scroll raw model prose in the main workspace.

## 11. Language and copy

- concrete verbs: Open, Compare, Test, Review, Accept, Preserve;
- avoid AI rhetoric such as “delve,” “comprehensive journey,” “revolutionize”; 
- avoid negative-anchoring explanation patterns when a positive direct statement works;
- status language must be falsifiable (`Tests passed 27/27`) rather than vague (`Looks good`).

## 12. Visual system

### Color

Use a restrained neutral base. Color may reinforce state/type but cannot be the only distinction. The implementation team chooses accessible tokens and validates contrast; this spec does not prescribe a fashionable palette.

### Shape

Use shape/icon/label redundancy:

- question: rounded diamond or `?` mark;
- source: document form;
- decision: hex/decision mark;
- artifact: preview/frame;
- test: check vessel;
- relation: edge plus relation-state marker.

Avoid decorative icon density.

### Typography

Reading text and interface labels should be visually distinct. Persian and English mixed text must receive explicit RTL/LTR handling rather than global RTL hacks.

Requirements:

- detect paragraph/base direction;
- use `dir="auto"` where appropriate;
- isolate code/IDs/URLs with LTR containers;
- tables permit cell-level direction;
- numbers and Latin technical terms remain legible within Persian UI.

## 13. Motion

Motion communicates state transition/spatial continuity, not decoration.

- drawers: short, stable;
- Field → Focus preserves selected object continuity;
- agent completion uses subtle state change, not celebratory animation;
- respect `prefers-reduced-motion`.

## 14. Keyboard / accessibility

Minimum:

- complete primary navigation by keyboard;
- visible focus states;
- semantic headings/landmarks;
- labels for graph nodes/actions;
- no color-only state;
- reduced motion;
- zoom up to 200% without functional loss;
- screen-reader accessible non-graph alternative list for Field relations.

## 15. Error design

Errors answer:

1. What failed?
2. What project state is safe?
3. What was not changed?
4. What can the user do next?

Example:

```text
Codex run stopped before producing a valid handoff.
No canonical project state was changed.
The isolated worktree is preserved at ...
[Inspect partial work] [Retry] [Discard run]
```

## 16. Anti-patterns

Reject implementation if it produces:

- a chatbot as the home screen;
- four permanent sidebars;
- default raw terminal stream;
- “AI summary” cards with no route to evidence;
- automatic relation creation based only on vector similarity;
- task dashboard with no semantic/project topology;
- code diff as the first review representation;
- hundreds of graph nodes on initial load;
- hidden state mutation after agent runs.
