# 03 — Canonical Data Model

## 1. Storage strategy

The canonical model must remain readable without the application.

Default **sidecar workspace**:

```text
mozare-workbench/
  workspace/
    workspace.yaml
    projects/
      <project-id>/
        PROJECT.md
        objects/
          <object-id>.md
        relations/
          <relation-id>.yaml
        missions/
          <mission-id>.json
        proposals/
          <proposal-id>/
            PROPOSAL.md
            manifest.json
            handoff.json
        events/
          2026-09.jsonl
        artifacts/
          registry.yaml
        views/
          field-layout.json       # derived
        cache/                    # derived, gitignored
```

External repositories stay in their own directories and are referenced by registry records. They do not have to be restructured.

## 2. Canonical versus derived

### Canonical

- `workspace.yaml`
- `PROJECT.md`
- accepted object records
- accepted relation records
- accepted decisions
- mission contracts
- proposal manifests and review decisions
- event log
- artifact registry metadata

### Derived / disposable

- layout coordinates;
- graph projections;
- semantic/search caches;
- thumbnails;
- preview bundles;
- agent stdout/stderr logs;
- temporary mission context bundles;
- generated summaries that have not been accepted as records.

The app must successfully rebuild after deleting every derived location.

## 3. IDs

IDs must be stable and non-semantic enough to survive renaming.

Format:

`<type>_<YYYYMMDD>_<8-char-random>`

Examples:

- `q_20260914_a91c3f20`
- `rel_20260914_82f0bcad`
- `dec_20260914_7c2931af`
- `run_20260914_5d2203ee`

Human slugs are separate fields.

## 4. Markdown object format

Objects use YAML frontmatter plus human-readable Markdown body.

```markdown
---
id: q_20260914_a91c3f20
type: question
project_id: ontograph
name: How can OOO become an operational design method?
lifecycle: active
evidence_state: candidate
use_status: active
created_at: 2026-09-14T12:00:00+03:30
updated_at: 2026-09-14T12:00:00+03:30
origin:
  kind: human
relations:
  - rel_20260914_82f0bcad
---

## Working formulation
...

## Notes
...
```

Metadata used for filtering belongs in frontmatter. Extended content belongs in Markdown.

## 5. Schema contracts

Machine-facing schemas live in `config/` and must be validated on write.

At minimum:

- `project.schema.json`
- `object.schema.json`
- `relation.schema.json`
- `mission.schema.json`
- `handoff.schema.json`
- `proposal.schema.json`

The implementation may derive TypeScript types from these schemas or mirror them with Zod, but the JSON Schema remains a portable contract.

## 6. Workspace registry

`workspace.yaml` records external locations without making absolute paths portable truth.

```yaml
workspace_version: 1
projects:
  - id: taroke-remixer
    name: TAROKE RIMIXER
    kind: born_digital_artwork
    remote: https://github.com/mozareeduge/taroke-remixer.git
    local_path: null
    canonical_branch: main
    test_commands:
      - ./tests/run_all_tests.sh
```

When the user maps `local_path`, keep the absolute mapping in a local override such as `workspace.local.yaml`, which is gitignored.

## 7. Protected paths

Every project integration may define paths that agents must not mutate unless an explicit mission allows it.

Example:

```yaml
protected_paths:
  - .git/**
  - .env
  - "**/.env.*"
  - archive/**
  - sources/originals/**
  - _originals/**
```

The Mozare Wiki adapter inherits its controller-protected originals and validation rules rather than replacing them.

## 8. Agent run files

Each run has a disposable working directory:

```text
.mozare-runtime/runs/<run-id>/
  mission.md
  context.json
  expected-output.schema.json
  stdout.log
  stderr.log
  events.jsonl
  result/
    handoff.json
    artifacts.json
```

`.mozare-runtime/` is never canonical and is gitignored.

A run can fail and disappear without corrupting project state.

## 9. Handoff envelope

Every consequential agent run returns a machine-readable envelope. Required concepts:

```json
{
  "run_id": "run_...",
  "state": "completed",
  "summary": "Implemented the bounded joiner proof and verified on device.",
  "system_view": {
    "intent": "Let the joiner reach the host local network.",
    "behavior": "The OS grants the requested peer network and the app binds only scoped traffic.",
    "architecture": ["Network request", "callback lifecycle", "binding lease"],
    "implementation": ["app/.../Joiner.kt"],
    "verification": ["27 unit tests", "device scenario D1"]
  },
  "changed": [],
  "decisions": [],
  "tests": [],
  "artifacts": [],
  "technical_terms": [],
  "blockers": [],
  "open_questions": [],
  "next_action": "Review the device evidence."
}
```

Full contract: `config/handoff.schema.json`.

## 10. Proposal manifest

A proposal is transaction-like. It declares intended canonical changes before acceptance.

Manifest concepts:

- base workspace revision / Git HEADs;
- target records/files;
- create/update/delete operations;
- expected preconditions (hash or last-updated value);
- evidence/run IDs;
- verification evidence;
- protected paths checked;
- rollback behavior.

If the base has moved since proposal generation, acceptance must stop and request rebase/review rather than overwrite.

## 11. Event sourcing boundary

The event log exists for visible genesis and reconstruction of meaningful transitions, not total process surveillance.

Store:

- accepted canonical mutation;
- mission lifecycle;
- proposal lifecycle;
- decision acceptance/supersession;
- verification result;
- artifact registration.

Do not store:

- model hidden reasoning;
- entire prompts by default;
- secret-containing environment;
- unbounded terminal output;
- temporary derived cache changes.

## 12. Versioning

Schemas carry a semantic version. Records include `schema_version` when migration becomes necessary.

Migration requirements:

- migrations are deterministic;
- original record is preserved in Git history;
- migration produces a report;
- cache/view rebuild is separate from canonical migration;
- downgrade expectations are documented.

## 13. Conflict policy

Canonical writes use optimistic concurrency:

1. proposal records base revision/hash;
2. review checks current revision;
3. mismatch blocks direct apply;
4. system shows conflicting objects/lines;
5. new proposal or explicit human reconciliation is required.

No last-writer-wins for consequential records.
