# 02 — Information Architecture

## 1. Principle: project state is a field, not a folder tree

Folders remain useful for storage. The human-facing architecture is a typed field of objects and relations.

```text
                           [PROJECT]
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
          [QUESTION]        [MATERIAL]        [OUTPUT]
              │                │                ▲
      grounded-by          used-in             │
              ▼                ▼                │
          [SOURCE] ───► [EXPERIMENT] ──► [DECISION]
              │              │                  │
          supports        evaluated-by       implemented-by
              ▼              ▼                  ▼
           [CLAIM]         [TEST]           [ARTIFACT]
              │                                  │
              └───── related through ─────── [RELATION]
```

The graph is a view. Relation records are persistent objects with evidence and history.

## 2. Project object

Each project answers:

- What is this?
- Why is it active?
- What is the current question or objective?
- What phase/state is it in?
- Which external repositories/corpora/files belong to it?
- What is the latest accepted decision?
- What requires human judgment?
- What are the current outputs?

Minimum project frontmatter is defined in `config/project.schema.json`.

## 3. Relation-object

A relation is stored as more than `A -> B`.

Minimum fields:

- relation ID;
- participants;
- provisional or settled relation type;
- descriptors;
- evidence state;
- evidence references;
- counterevidence references;
- uncertainty note;
- use status;
- contexts of use;
- origin (human/agent/import);
- history/event references;
- current claimability.

This supports statements such as:

```text
Grave ──[material resonance?]──► Ontograph experiment
Evidence: direct reuse of X, Y
Use: active in artistic development
Scholarly assertion: restricted pending source comparison
```

The visual edge can remain simple; clicking it opens the relation-object.

## 4. Source/evidence route

Source authority is explicit. A result derived from a summary must retain a route back to the source.

Default authority ladder:

```text
immutable original
    ↓
verified primary source
    ↓
explicit author confirmation
    ↓
accepted canonical record
    ↓
derivative / extraction
    ↓
interpretive synthesis
    ↓
candidate / AI-generated note
    ↓
generated view
```

This hierarchy can be overridden by project rules but never silently.

## 5. Claim object

A claim must distinguish:

- proposition;
- scope/context;
- evidence refs;
- counterevidence refs;
- evidence state;
- author/origin;
- last review;
- related decisions/artifacts;
- whether it is permitted in scholarly/public output.

“Useful in ideation” and “safe to assert in an article” are different states.

## 6. Decision object

A decision captures:

- decision statement;
- decision owner;
- date;
- problem/trigger;
- alternatives considered;
- rationale;
- evidence/relations used;
- consequences;
- supersedes/superseded-by;
- implementation links;
- review/reversal conditions.

Do not let a chat message become the only record of a consequential decision.

## 7. Artifact object

Artifact covers produced things: text draft, HTML work, image, audio, PDF, APK, diagram, dataset, API spec, prototype, test report, etc.

Important fields:

- kind;
- local path or external URI;
- source project/run;
- canonical vs generated;
- version/checksum when applicable;
- preview affordance;
- validation state;
- related decisions/tests.

## 8. Mission object

A Mission is the bounded contract given to an agent.

It contains:

- target project/object;
- desired outcome;
- why this matters;
- allowed context;
- constraints;
- protected paths;
- acceptance criteria;
- selected agent adapter;
- worktree/branch;
- output contract;
- timeout/turn bound when used;
- current status.

A Mission is not a chat transcript.

## 9. Proposal object

A Proposal represents a consequential change awaiting human judgment.

It contains:

- proposer/run;
- intended effect;
- system-level change summary;
- canonical object changes;
- target repo/file changes;
- verification evidence;
- risks;
- unresolved issues;
- approval options;
- rollback/reject behavior.

Proposal status:

`draft → submitted → under_review → accepted | revision_requested | rejected | superseded`

## 10. Event / visible genesis

Append-only events capture selected project transformations:

- object created/updated;
- relation created/retyped;
- mission started/completed/failed;
- proposal submitted/accepted/rejected;
- artifact registered;
- test result recorded;
- decision accepted/superseded.

Do **not** dump chain-of-thought, every terminal line, or every token into the event store.

Event fields:

```json
{
  "id": "evt_...",
  "timestamp": "ISO-8601",
  "project_id": "...",
  "actor": {"kind": "human|agent|system", "id": "..."},
  "action": "proposal.accepted",
  "object_refs": ["..."],
  "summary": "...",
  "evidence_refs": ["..."],
  "run_id": "..."
}
```

## 11. Residue

Residue is material intentionally preserved outside the active argument/workflow:

- rejected fragment with future value;
- unresolved contradiction;
- failed experiment;
- aesthetic material not currently used;
- private/protected trace.

Residue is excluded from default views but searchable and linkable.

## 12. Project presets

The base grammar supports presets. Presets change default views and suggested object types, not the core schema.

### Artistic research preset

Primary: Question, Material, Source, Concept, Relation, Method, Experiment, Decision, Artifact.

### Writing / academic preset

Primary: Question, Claim, Source, Section, Review, Artifact.

### Product preset

Primary: UserNeed, Constraint, Decision, Flow, Service/API, Risk, Test, Artifact.

### Technical build preset

Primary: Behavior, Component, Decision, Mission, Test, Artifact, Defect.

### Born-digital artwork preset

Primary: Material, Rule/Constraint, Device, Flow, Surface, Experiment, Artifact, Test.

These domain types map to generic base types via `base_type`.

## 13. Navigation rules

- A project always opens to the last stable view, but provides one-click “Orient me.”
- “Orient me” is deterministic: current objective, latest accepted decision, active/blocked missions, review queue, latest verified artifact, next recommended action.
- Search results are grouped by object type and authority/evidence state.
- Selecting a node never destroys current spatial context; details open in a drawer or focus transition with a back path.
- Cross-project relations are visible only when requested to avoid accidental context flooding.

## 14. Information density rules

- Group large clusters; do not draw hundreds of nodes by default.
- Collapse historical/superseded items unless Trace mode is active.
- Labels use short human names; IDs remain secondary.
- Relations with uncertain type use neutral visual treatment rather than fake semantic certainty.
- Edge thickness/color must not be the sole carrier of evidence state.
