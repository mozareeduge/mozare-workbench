# 06 — Technical Architecture

## 1. Architecture objective

Implement a dependable local application with the fewest moving parts needed for:

- filesystem/Git-backed canonical project state;
- visual React interface;
- agent process launching;
- local MCP server;
- file watching and artifact preview;
- schema validation;
- testable recovery and safety.

Avoid desktop packaging in v0.1 unless browser-local operation fails a real requirement.

## 2. Recommended stack

The implementation agent may adjust versions after compatibility checks, but should keep the architecture.

### Runtime

- current supported Node.js LTS;
- TypeScript;
- npm for lowest setup friction unless the local environment already standardizes another package manager.

### Web UI

- React;
- Vite;
- `@xyflow/react` for Field graph/canvas;
- lightweight state store such as Zustand;
- accessible component primitives chosen during implementation;
- Mermaid rendering for system diagrams where useful.

### Local server

- Fastify or similarly small Node HTTP server;
- explicit REST/stream endpoints;
- static serving of built UI;
- WebSocket/SSE for coarse run events;
- `child_process.spawn` with argv for process execution.

### Data

- canonical files: Markdown, YAML, JSON, JSONL;
- schema validation: AJV/JSON Schema or Zod + JSON Schema compatibility;
- no mandatory database in v0.1;
- derived in-memory/index cache can be serialized under gitignored cache directory;
- QMD is an optional semantic retrieval adapter rather than internal truth store.

This avoids a database migration problem before the object grammar stabilizes.

## 3. Process topology

```text
Browser (127.0.0.1)
       │
       ▼
Local Workbench Server
  │      │       │        │
  │      │       │        ├── MCP stdio/server entrypoint
  │      │       │
  │      │       ├── Git/filesystem adapter
  │      │
  │      ├── Agent adapter manager
  │      │      ├── claude
  │      │      ├── codex
  │      │      └── hermes
  │      │
  │      └── Integration adapters
  │             ├── Mozare Wiki/QMD
  │             ├── external repositories
  │             └── optional Tana MCP
  │
  └── Canonical workspace files
```

## 4. Suggested repository structure

```text
mozare-workbench/
  src/
    server/
      main.ts
      api/
      security/
      workspace/
      agents/
      integrations/
      git/
      mcp/
    web/
      app/
      views/
        Field/
        Focus/
        Flow/
        Review/
        Output/
      components/
      system-view/
      evidence/
  config/
  workspace/
  tests/
    unit/
    integration/
    e2e/
    fixtures/
  scripts/
  public/
  .agents/skills/
  .claude/skills/
  AGENTS.md
  CLAUDE.md
```

The implementer may use `src/web` as a Vite root or standard Vite layout; preserve conceptual separation.

## 5. Workspace engine

Responsibilities:

- load/validate `workspace.yaml` and project records;
- parse object frontmatter;
- resolve relations by stable ID;
- compute current state projection;
- expose query/filter methods;
- apply accepted proposals transactionally;
- append events;
- detect stale proposal bases;
- rebuild derived indexes/layouts.

### Transactional apply

For canonical proposal acceptance:

1. validate manifest;
2. check base hashes/revisions;
3. stage all file changes in temp directory;
4. validate staged workspace;
5. atomically replace/write files where possible;
6. append event records;
7. run post-apply validation;
8. on failure restore backup/staged originals;
9. report exact resulting state.

For external Git repositories, acceptance may mean “mark review accepted” rather than automatically merge. Actual merge/commit behavior follows project adapter policy.

## 6. Projection engine

The Field/Flow/Focus views consume a projection rather than raw files.

Example internal projection:

```ts
interface ProjectProjection {
  project: ProjectSummary;
  focus: FocusSummary;
  nodes: ViewNode[];
  edges: ViewEdge[];
  activeMissions: MissionSummary[];
  reviewQueue: ReviewSummary[];
  latestArtifacts: ArtifactSummary[];
  orientation: OrientationFacts;
}
```

This projection can be rebuilt from canonical state.

## 7. Search

v0.1 search layers:

1. exact metadata/title/tag search over loaded canonical records;
2. body text search;
3. optional `ripgrep` acceleration if available;
4. external QMD adapter for Mozare Wiki / large corpora;
5. no automatic vector-similarity relation creation.

Semantic retrieval returns candidates with source route, never automatic canonical facts.

## 8. Agent process manager

Responsibilities:

- capability detection at startup and refresh;
- no global installation without explicit human action;
- build run packet;
- establish isolation path/worktree;
- launch process with argv/env allowlist;
- stream coarse events;
- capture logs;
- stop child process tree safely;
- validate handoff;
- collect observed Git/test evidence;
- create proposal.

On Windows, implement process-tree termination correctly rather than leaving subagents running after Stop.

## 9. Worktree manager

For Git-backed implementation missions:

```text
<repo>/.git                     canonical Git metadata
<workspace-runtime>/worktrees/<run-id>/
```

Rules:

- never create worktree over dirty uncommitted user work;
- branch name `mozare/run/<run-id>-<short-slug>`;
- no auto-delete until proposal is resolved;
- reject destructive cleanup if worktree contains unrecorded changes;
- show user path and branch in Review detail.

## 10. Artifact preview subsystem

Artifact registry chooses safe previewers by MIME/kind.

Security:

- HTML previews are sandboxed;
- do not serve arbitrary filesystem roots;
- only registry-authorized paths are previewable;
- PDFs/images/media served with correct content type;
- binaries download/open externally only by explicit user action.

## 11. MCP server implementation

Expose stdio first because Claude/Codex/Hermes can start a local command without requiring the UI server to be running.

The MCP server shares the workspace loader and proposal APIs.

No tool allows arbitrary shell execution or generic filesystem mutation.

Add optional HTTP transport only after authentication/origin rules are defined and tested.

## 12. Optional adapters

Adapters are plugins behind typed interfaces. Unavailable integrations do not break the core.

```ts
interface ExternalKnowledgeAdapter {
  id: string;
  detect(): Promise<Availability>;
  search(query: StructuredQuery): Promise<SearchResult[]>;
  get(ref: ExternalRef): Promise<ExternalDocument>;
}
```

Examples: QMD, Tana MCP, GitHub, Ganjoor corpus.

## 13. Local startup

Required human path:

- `START_MOZARE.ps1` detects dependencies, starts server, opens browser.
- An optional `.cmd` wrapper can call PowerShell for double-click use.
- Startup never automatically changes PATH or installs global software.
- Missing dependencies render a clear diagnostic with exact missing item and setup action.

## 14. Logging

Three levels:

### user-visible event
Small state transition.

### diagnostic log
Structured application diagnostics; rotates locally.

### raw agent log
Per-run, disposable, potentially verbose, collapsed in UI.

Secrets must be redacted at ingestion when practical. The UI warns raw agent logs may contain externally generated sensitive text and keeps them local.

## 15. Performance targets

Pilot scale:

- 10–50 active projects in registry;
- 10k canonical workbench objects should remain usable;
- large corpora such as Mozare Wiki/Ganjoor are queried through their own index/adapters rather than fully rendered as graph nodes;
- project initial orientation render < 2 seconds after warm startup on typical desktop hardware;
- Field default projection < 100 rendered nodes, usually < 30.

These are targets, not claims until measured.

## 16. Dependency policy

Prefer mature, narrow libraries over adopting a whole experimental AI workspace as a runtime dependency.

Open-source projects such as OpenCanvas, OpenGraph, Tuval, and typed context-graph systems are useful design references. v0.1 should own its small critical core so the human interface and canonical model do not depend on an immature external project's roadmap.
