# 13 — Ready-Made Architecture / Process Diagrams

These Mermaid diagrams are implementation assets. They may be rendered in the Workbench's System/Flow surfaces, documentation, or review artifacts. Their semantics matter more than their eventual styling.

## 1. Whole system

```mermaid
flowchart TB
    U["Mozare"] --> W["Mozare Workbench"]
    W --> V1["Field"]
    W --> V2["Focus"]
    W --> V3["Flow"]
    W --> V4["Review"]
    W --> V5["Output"]

    W --> C["Canonical local state\nMarkdown · YAML/JSON · Git"]
    C --> P["Generated projections / caches"]

    W --> M["Bounded Mission"]
    M --> A1["Claude Code"]
    M --> A2["Codex"]
    M --> A3["Hermes"]
    A1 --> R["Run evidence + handoff"]
    A2 --> R
    A3 --> R
    R --> Q["Proposal"]
    Q --> V4
    V4 -->|Accept| C
    V4 -->|Revise / Reject| X["Revision / Residue"]

    W --> K1["Mozare Wiki / QMD"]
    W --> K2["Git repositories"]
    W -. optional .-> K3["Tana / other surfaces"]
```

## 2. Human review ladder

```mermaid
flowchart LR
    I["Intent"] --> B["System behavior"] --> A["Architecture"] --> IM["Implementation"] --> T["Verification"]
```

Default Review opens at `Intent` and `System behavior`. Deeper levels remain one interaction away.

## 3. Mission transaction

```mermaid
sequenceDiagram
    participant H as Human
    participant W as Workbench
    participant A as Agent
    participant G as Git/Artifacts

    H->>W: Work on this object
    W->>W: Build bounded mission packet
    W->>G: Check repo + create isolated worktree
    W->>A: Mission + context + acceptance contract
    A->>G: Implement / research / test
    A->>W: Structured handoff
    W->>G: Independently collect diff/test/artifact evidence
    W->>W: Build proposal
    W->>H: System-level Review
    alt Accept
        H->>W: Accept
        W->>W: stale-base + policy + validation checks
        W->>G: Apply/record accepted state
    else Revise
        H->>W: Request revision
        W->>A: New bounded mission
    else Reject
        H->>W: Reject / preserve residue
    end
```

## 4. Authority-aware research route

```mermaid
flowchart LR
    S["Search / semantic hit"] --> D["Derivative / extracted passage"]
    D --> SR["Source record"]
    SR --> O["Original / primary source"]
    O --> E["Evidence object"]
    E --> C["Claim candidate"]
    C --> R["Relation / implication proposal"]
```

No arrow means automatic truth. Each transition records provenance and evidence state.

## 5. Project field grammar

```mermaid
flowchart TB
    Q["Question"] -->|grounded by| S["Source"]
    S -->|supports / contests| C["Claim"]
    Q --> M["Method"]
    M --> E["Experiment"]
    E -->|evaluated by| T["Test"]
    C --> D["Decision"]
    E --> D
    D --> A["Artifact"]
    A --> T
    R["Relation-object"] -. connects / qualifies .- Q
    R -. connects / qualifies .- C
    R -. connects / qualifies .- A
```

## 6. Canonical vs generated

```mermaid
flowchart TB
    C["Canonical files"] --> F["Field projection"]
    C --> O["Orientation summary"]
    C --> FL["Flow projection"]
    C --> RV["Review projection"]
    C --> IDX["Search/index cache"]

    F -. disposable .-> R["Rebuild"]
    O -. disposable .-> R
    FL -. disposable .-> R
    RV -. disposable .-> R
    IDX -. disposable .-> R
    R --> C
```

The final arrow means views are rebuilt **from** canonical state; it does not mean views write back automatically.
