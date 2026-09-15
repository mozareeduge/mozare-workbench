# 07 — Integration Specification

## 1. Integration principle

External systems keep their own authority. The workbench stores references, projections, mission context, and review state. It does not silently copy an external system into a new competing truth source.

## 2. Mozare Wiki adapter

### Role

The Mozare Wiki is the richest authoritative contextual system around Mozare's works, research, sources, methods, relations, and AI operations. It should be available for orientation and evidence retrieval without being merged into the workbench's own object store.

### Current architecture to respect

The supplied Wiki release uses:

- Git-versioned Markdown;
- immutable source witnesses;
- canonical records and typed relations;
- QMD collections/indexing;
- a controller with explicit preflight/reconcile/validate/package stages;
- generated graph/views subordinate to records;
- validation scripts and semantic benchmarks.

### Adapter modes

#### Read mode — default

- detect configured Wiki root;
- read current `SYSTEM_DESIGN.md` / release manifest dynamically;
- use QMD/MCP where available for search;
- preserve collection/source information;
- route candidate evidence to canonical/source records;
- expose source authority/evidence state in the workbench.

#### Mutation mode — explicit only

The workbench must **not** invent its own Wiki write semantics.

A Wiki mutation mission must use the Wiki's current controller/agent instructions and validation commands. The workbench merely creates the mission/proposal envelope and presents the resulting Wiki handoff for review.

### Important anti-staleness rule

Do not hard-code Wiki counts/version state from hand-written instruction files. Resolve the current release/system design/manifest at runtime. The supplied package itself demonstrates why: some operational instructions may lag the current release metadata.

### QMD route

The adapter should support the Wiki's established retrieval discipline:

`canonical → claim/relation → source record → derivative/extracted passage → original`.

A QMD score routes attention; it is not evidence state.

## 3. Public Mozare GitHub repositories

Seed from `seed/github-projects.seed.yaml`.

Known examples include:

- `the-black-bird-field`
- `the-black-bird`
- `black-bird-lab`
- `winter-road`
- `UNHAPPY-scenario`
- `grave-machine`
- `taroke-remixer`
- `Taroko-Gorge-Ecosystem`
- `Ganjoor-Ontogrph`
- `The-Near-Field`
- `HAMLET-POP-UPPER`
- `mozare-deep-research`

The registry must preserve repository role where known. For example:

- a development lab is not automatically the canonical artwork;
- a portfolio host is not automatically the source-of-truth for each work;
- generated output is not an editable archive;
- active construction can coexist with immutable release checkpoints.

### Local mapping

Remote URL can ship in seed. `local_path` is configured on the user's machine and stored only in a gitignored local override.

### Project adapter reads

- Git branch/status;
- repo instructions (`AGENTS.md`, `CLAUDE.md`, etc.);
- README/project metadata;
- configured test commands;
- configured artifact/preview paths.

### Project adapter writes

Only through bounded mission worktree/branch or explicitly accepted proposal.

## 4. TAROKE RIMIXER as a reference integration

TAROKE RIMIXER is a particularly useful pilot because it already distinguishes:

- authoritative editable project archive;
- browser-local draft/autosave;
- generated standalone artifact;
- embedded preview;
- legacy release checkpoint;
- extensive automated tests.

The workbench should represent those as separate artifact/state types rather than one “file.”

Pilot mappings can include:

- `.taroke.json` → canonical/editable artifact;
- `.taroke.html` → distributable artifact;
- embedded preview → temporary generated preview;
- test suite → verification source;
- archived release → immutable checkpoint.

## 5. Black Bird ecosystem integration

Seed relationships should make canonicality explicit:

- `the-black-bird` = canonical public source archive;
- `black-bird-lab` = development/experiment history;
- `the-black-bird-field` = portfolio host/documentation layer.

The workbench should visually distinguish these roles rather than merging them by project-name similarity.

## 6. Ganjoor / Ontograph adapter

The `Ganjoor-Ontogrph` repository already contains a strong local-agent pattern:

- source data;
- generated Markdown corpus;
- project-local QMD collections;
- explicit exact vs semantic search separation;
- MCP exposure;
- agent playbook;
- source-following workflow.

The workbench can register its MCP/QMD endpoint as an external knowledge adapter. Search results remain external refs until intentionally captured into a Mozare project object/proposal.

## 7. Claude Code

### Desired connection

- Workbench can launch Claude Code locally on bounded missions.
- Claude can call the workbench MCP server for project reads and proposal submission.
- Existing project `CLAUDE.md` instructions remain in force.

### Setup generated by implementation

Provide a documented command/config snippet appropriate to the detected Claude Code version. Do not overwrite the user's global Claude settings.

Project-local workbench skills may be mirrored to `.claude/skills/` where the setup repo needs them.

## 8. Codex

### Desired connection

- Workbench launches `codex exec` or current supported non-interactive mode.
- Codex receives mission packet + repo instructions.
- Codex can call workbench MCP server.
- Repo `AGENTS.md` scope remains authoritative for implementation behavior.

Use project-local configuration rather than altering global user settings whenever possible.

## 9. Hermes

### Desired connection

- Workbench launches finite Hermes runs through query files / one-shot mode.
- Hermes project context and trusted local skills remain visible.
- Hermes can connect to workbench MCP.
- Optional Hermes↔Codex MCP delegation may exist, but it is not required for the Workbench core and must not obscure which executor actually changed files.

## 10. Tana — optional semantic/visual adapter

Tana is useful for cloud/shared structured objects, visual spaces, agents, and proposal-style AI edits. The current Tana MCP supports read/write interaction where AI writes appear as reviewable proposals.

However, v0.1 treats Tana as optional because the workbench must survive without a cloud account.

Supported future/optional flows:

- search/read Tana project objects;
- capture selected Workbench object as Tana proposal;
- pull Tana references into mission context;
- “open in coding tool” remains an optional handoff path.

Do not require Tana for canonical recovery.

## 11. Obsidian — optional human reader

Because canonical state is Markdown/YAML, the workspace can be readable as an Obsidian vault or linked into one.

Do not make Obsidian-specific metadata necessary for core operation.

## 12. MCP interoperability

The workbench MCP should make one project state available to any compatible harness without vendor-specific prompt duplication.

The implementation should provide tested configuration examples for each installed agent, but configuration generation must be idempotent and non-destructive.

## 13. Future MCP Apps

Phase 2 may expose Field/Review/System views as MCP Apps so an agent client can render interactive project surfaces inline.

This is explicitly deferred until the standalone local workbench proves the interaction grammar.

## 14. Integration degradation

Missing integrations must degrade cleanly:

- no QMD → exact/local workspace search remains;
- no Claude → Codex/Hermes remain;
- no Codex → Claude/Hermes remain;
- no Hermes → Claude/Codex remain;
- no Tana → no core loss;
- no GitHub network → local repositories still work;
- no internet → local workspace, agents that can run locally/API-auth as configured, Wiki, and local artifacts remain accessible as far as those tools permit.
