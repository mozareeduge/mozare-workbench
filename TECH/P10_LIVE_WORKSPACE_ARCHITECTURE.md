# P10 Live Workspace Architecture Contract

**Consumes:** `AUTHORITY/07_P10_LIVE_MULTI_PROJECT_ADDENDUM.md`
**Tasks:** `TASK-P10-01` (MAWS `WIRE-01`), `TASK-P10-02` (MAWS `WIRE-02`), `TASK-P10-03` (MAWS `REOPEN-GATE`)

## 1. Preserve the locked architecture

- React/Vite browser UI and Fastify server bind to loopback.
- Local files, Git, and referenced external authorities remain source of truth.
- `WorkspaceEngine` and projection logic remain server-side.
- Registry and layouts are derived/operator state; no database or public cloud is introduced.
- Consequential canonical changes still cross proposal/human-acceptance boundaries.

## 2. Persistent registry

Persist an atomic, test-injectable registry under ignored Workbench runtime state (default `.mozare/runtime/workspaces.json`). Internal records contain the normalized absolute root; public API records do not.

```ts
type WorkspaceClassification = 'ready' | 'needs_onboarding' | 'invalid';

type RegisteredWorkspaceInternal = {
  id: string;
  root: string;
  displayName: string;
  classification: WorkspaceClassification;
  lastOpenedAt: string | null;
  validationError: string | null;
};

type WorkspaceSummary = Omit<RegisteredWorkspaceInternal, 'root' | 'validationError'> & {
  errorReceipt: { code: string; message: string; safeState: string } | null;
};
```

Registration resolves and validates a selected directory, reuses the stable ID for an already registered normalized root, classifies through the canonical loader, persists registry state, and performs zero writes inside the target folder. Complete canonical structure is `ready`; absence is `needs_onboarding`; partial/corrupt canonical structure is `invalid`.

## 3. Folder-selection boundary

The production browser initiates `POST /api/system/pick-folder`. The server opens a fixed Windows-native folder dialog through the existing argv-safe process boundary and stores the selected path behind a short-lived single-use token. Register/create requests consume that token. Direct absolute-root input is test-only or an explicitly configured operator-recovery path, never the normal web contract.

Cancel returns a normal cancellation response. Unsupported environments return `unsupported`; no generic shell or filesystem endpoint is exposed.

## 4. Minimal HTTP semantics

Exact endpoint names may adapt if client, server, and tests move together:

```text
GET  /api/workspaces
POST /api/system/pick-folder
POST /api/workspaces/register       { selectionToken }
POST /api/workspaces/create         { parentSelectionToken, name, kind, currentObjective }
POST /api/workspaces/:id/activate
GET  /api/workspaces/:id/projection
```

All public responses use opaque workspace IDs and safe summaries. Registering an existing folder never mutates it. Create refuses an existing/conflicting child path, writes the minimum scaffold transactionally, validates it with `loadWorkspace`, then registers/activates it.

## 5. Canonical compatibility correction

`current_question_id` accepts `null`/absence. Validation requires a referenced question only when non-null. `ProjectionEngine` produces a bounded Focus projection from objective/current artifact/mission when no question exists, and Field returns an honest empty/no-current-object state.

## 6. Live projection

The projection route derives current bounded state at request time:

- safe workspace summary and orientation facts;
- Focus projection or honest absence;
- Field objects/relations or setup/empty state;
- Flow project-scoped outcome/run data or an explicit empty state;
- Review project-scoped proposal/capture data or accepted empty state;
- Output entries from the active artifact registry only;
- capabilities such as canonical/read-only/setup-required.

For `needs_onboarding`, orientation facts may include display name, Git branch/dirty state, bounded file counts, and bounded safe representative names. File contents, protected paths, secrets, and invented semantic records are excluded.

## 7. Client and launcher

The browser uses relative `/api` URLs. Vite proxies `/api` to the loopback server in development/E2E; the owner launcher starts both services. A missing API is a visible degraded/error state, never “fully usable.” Switching invalidates prior-workspace requests so stale project truth cannot remain visible.

## 8. Security and stop conditions

- preserve realpath/symlink containment and protected-path exclusions;
- bind loopback and retain origin protections;
- never return registered absolute roots in ordinary web responses;
- never add generic read/write/shell APIs;
- never overwrite onboarding/create collisions;
- stop for reframe if arbitrary-folder support would require a new database/cloud authority or destructive mutation of an existing project.
