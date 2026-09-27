import { createHash, randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import YAML from 'yaml';
import { ProjectionEngine } from '../../core/projection/ProjectionEngine.js';
import { projectField } from '../../core/projection/FieldProjection.js';
import { loadWorkspace } from '../../core/workspace.js';
import type { ContinuitySummary } from '../../core/continuity/WorkLedger.js';
import { canonicalPathKey, isProtectedRelativePath } from '../../mcp/pathSafety.js';
import { observeStructure } from './ObservedStructure.js';

export type WorkspaceClassification = 'ready' | 'needs_onboarding' | 'invalid';

type StoredWorkspace = {
  id: string;
  root: string;
  displayName: string;
  classification: WorkspaceClassification;
  registeredAt: string;
  lastOpenedAt: string | null;
  validationError: string | null;
};

type RegistryFile = {
  version: 1;
  activeWorkspaceId: string | null;
  workspaces: StoredWorkspace[];
};

export type PublicWorkspace = Omit<StoredWorkspace, 'root' | 'validationError'> & {
  active: boolean;
  errorReceipt: { code: string; message: string; safeState: 'read_only' } | null;
};

export type ContinuityProvider = { summary(projectId: string): ContinuitySummary | null };

const emptyRegistry = (): RegistryFile => ({ version: 1, activeWorkspaceId: null, workspaces: [] });

function isDirectory(path: string): boolean {
  try { return statSync(path).isDirectory(); } catch { return false; }
}

function isInside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`);
}

function projectSlug(name: string): string {
  return name.normalize('NFKC').trim().toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/** Persistent server-side map from opaque browser IDs to private local paths. */
export class WorkspaceRegistry {
  constructor(private readonly file: string, private readonly continuity: ContinuityProvider | null = null) {}

  list(): PublicWorkspace[] {
    const state = this.read();
    let changed = false;
    for (const record of state.workspaces) {
      const inspected = this.inspect(record.root);
      if (inspected.classification !== record.classification || inspected.validationError !== record.validationError) {
        record.classification = inspected.classification;
        record.validationError = inspected.validationError;
        changed = true;
      }
    }
    if (changed) this.write(state);
    return state.workspaces.map((record) => this.publicRecord(record, state));
  }

  register(rootInput: string): PublicWorkspace {
    const root = resolve(rootInput);
    if (!isDirectory(root)) throw new Error('Selected folder does not exist or is not a directory');
    const state = this.read();
    const key = canonicalPathKey(root);
    let record = state.workspaces.find((item) => canonicalPathKey(item.root) === key);
    if (!record) {
      const id = `ws_${createHash('sha256').update(key).digest('hex').slice(0, 16)}`;
      const inspected = this.inspect(root);
      record = {
        id,
        root,
        displayName: basename(root) || 'Workspace',
        classification: inspected.classification,
        registeredAt: new Date().toISOString(),
        lastOpenedAt: null,
        validationError: inspected.validationError,
      };
      state.workspaces.push(record);
    } else {
      const inspected = this.inspect(root);
      record.classification = inspected.classification;
      record.validationError = inspected.validationError;
    }
    state.activeWorkspaceId ??= record.id;
    this.write(state);
    return this.publicRecord(record, state);
  }

  create(parentInput: string, name: string, kind: string, currentObjective: string): PublicWorkspace {
    const parent = resolve(parentInput);
    if (!isDirectory(parent)) throw new Error('Selected parent folder does not exist or is not a directory');
    const slug = projectSlug(name);
    if (!slug) throw new Error('Project name must contain at least one letter or number');
    if (!kind.trim()) throw new Error('Project kind is required');
    if (!currentObjective.trim()) throw new Error('Current objective is required');
    const root = resolve(parent, slug);
    if (!isInside(parent, root)) throw new Error('Project path escaped the selected parent');
    if (existsSync(root)) throw new Error('A file or folder with that project name already exists');
    const projectId = `project_${createHash('sha256').update(`${slug}:${randomUUID()}`).digest('hex').slice(0, 12)}`;
    try {
      mkdirSync(join(root, 'objects'), { recursive: true });
      mkdirSync(join(root, 'relations'), { recursive: true });
      mkdirSync(join(root, 'artifacts'), { recursive: true });
      const project = {
        id: projectId,
        name: name.trim(),
        kind: kind.trim(),
        lifecycle: 'active',
        current_objective: currentObjective.trim(),
        current_question_id: null,
      };
      writeFileSync(join(root, 'PROJECT.md'), `---\n${YAML.stringify(project)}---\n\n# ${name.trim()}\n`, 'utf8');
      writeFileSync(join(root, 'artifacts', 'registry.yaml'), 'artifacts: []\n', 'utf8');
      loadWorkspace(root);
      const registered = this.register(root);
      return this.activate(registered.id);
    } catch (error) {
      if (existsSync(root) && isInside(parent, root)) rmSync(root, { recursive: true, force: true });
      throw error;
    }
  }

  activate(id: string): PublicWorkspace {
    const state = this.read();
    const record = state.workspaces.find((item) => item.id === id);
    if (!record) throw new Error('Unknown workspace');
    state.activeWorkspaceId = id;
    record.lastOpenedAt = new Date().toISOString();
    const inspected = this.inspect(record.root);
    record.classification = inspected.classification;
    record.validationError = inspected.validationError;
    this.write(state);
    return this.publicRecord(record, state);
  }

  rootFor(id: string): string | null {
    return this.read().workspaces.find((item) => item.id === id)?.root ?? null;
  }

  /** Shared lookup contract used by the read/proposal-only MCP adapter. */
  get(id: string): { id: string; root: string } {
    const root = this.rootFor(id);
    if (!root) throw new Error(`unknown workspace id: ${id}`);
    return { id, root };
  }

  projection(id: string): Record<string, unknown> {
    const state = this.read();
    const record = state.workspaces.find((item) => item.id === id);
    if (!record) throw new Error('Unknown workspace');
    const inspected = this.inspect(record.root);
    const classification = inspected.classification;
    if (classification !== record.classification || inspected.validationError !== record.validationError) {
      record.classification = classification;
      record.validationError = inspected.validationError;
      this.write(state);
    }
    if (classification !== 'ready') {
      const observed = classification === 'needs_onboarding' ? observeStructure(record.root) : null;
      return {
        workspace: this.publicRecord(record, state),
        focus: null,
        field: observed?.field ?? null,
        artifacts: observed?.artifacts ?? [],
        orientation: this.orientation(record.root),
        continuity: null,
      };
    }
    const snapshot = loadWorkspace(record.root);
    return {
      workspace: this.publicRecord(record, state),
      focus: new ProjectionEngine().project(snapshot),
      field: projectField(snapshot),
      artifacts: snapshot.artifacts,
      orientation: null,
      continuity: this.continuity?.summary(snapshot.project.id) ?? null,
    };
  }

  classify(root: string): WorkspaceClassification {
    return this.inspect(root).classification;
  }

  private inspect(root: string): { classification: WorkspaceClassification; validationError: string | null } {
    if (!isDirectory(root)) return { classification: 'invalid', validationError: 'workspace_unavailable' };
    const markers = ['PROJECT.md', 'objects', 'relations', 'artifacts'];
    if (!markers.some((marker) => existsSync(join(root, marker)))) return { classification: 'needs_onboarding', validationError: null };
    try {
      loadWorkspace(root);
      return { classification: 'ready', validationError: null };
    } catch {
      return { classification: 'invalid', validationError: 'canonical_validation_failed' };
    }
  }

  private orientation(root: string): { label: string; entryCount: number; entries: string[] } {
    if (!isDirectory(root)) return { label: basename(root), entryCount: 0, entries: [] };
    const entries = readdirSync(root)
      .map((name) => basename(name))
      .filter((name) => !isProtectedRelativePath(name))
      .sort();
    return { label: basename(root), entryCount: entries.length, entries: entries.slice(0, 20) };
  }

  private publicRecord(record: StoredWorkspace, state: RegistryFile): PublicWorkspace {
    return {
      id: record.id,
      displayName: record.displayName,
      classification: record.classification,
      registeredAt: record.registeredAt,
      lastOpenedAt: record.lastOpenedAt,
      active: state.activeWorkspaceId === record.id,
      errorReceipt: record.classification === 'invalid'
        ? { code: record.validationError ?? 'invalid_workspace', message: 'Workspace records failed validation', safeState: 'read_only' }
        : null,
    };
  }

  private read(): RegistryFile {
    if (!existsSync(this.file)) return emptyRegistry();
    const parsed = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<RegistryFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.workspaces)) throw new Error('Workspace registry is invalid');
    return {
      version: 1,
      activeWorkspaceId: typeof parsed.activeWorkspaceId === 'string' ? parsed.activeWorkspaceId : null,
      workspaces: (parsed.workspaces as Partial<StoredWorkspace>[]).map((record) => ({
        id: String(record.id ?? ''),
        root: String(record.root ?? ''),
        displayName: String(record.displayName ?? (record as { label?: string }).label ?? basename(String(record.root ?? ''))) || 'Workspace',
        classification: record.classification ?? 'invalid',
        registeredAt: String(record.registeredAt ?? new Date(0).toISOString()),
        lastOpenedAt: typeof record.lastOpenedAt === 'string' ? record.lastOpenedAt : null,
        validationError: typeof record.validationError === 'string' ? record.validationError : null,
      })),
    };
  }

  private write(state: RegistryFile): void {
    mkdirSync(dirname(this.file), { recursive: true });
    const temporary = `${this.file}.${process.pid}.${randomUUID()}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    renameSync(temporary, this.file);
  }
}

/** Single-use, short-lived bridge between the native folder picker and APIs. */
export class FolderSelectionTokens {
  private readonly selections = new Map<string, { root: string; expiresAt: number }>();

  constructor(private readonly ttlMs = 60_000) {}

  issue(root: string): { selectionToken: string; expiresAt: string } {
    if (!isDirectory(root)) throw new Error('Selected folder does not exist or is not a directory');
    const selectionToken = randomUUID();
    const expiresAt = Date.now() + this.ttlMs;
    this.selections.set(selectionToken, { root: resolve(root), expiresAt });
    return { selectionToken, expiresAt: new Date(expiresAt).toISOString() };
  }

  consume(token: string): string {
    const selection = this.selections.get(token);
    this.selections.delete(token);
    if (!selection || selection.expiresAt < Date.now()) throw new Error('Folder selection expired or was already used');
    return selection.root;
  }
}
