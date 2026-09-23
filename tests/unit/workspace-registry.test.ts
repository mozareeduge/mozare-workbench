import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WorkspaceRegistry } from '../../src/server/workspaces/WorkspaceRegistry.js';

describe('TEST-022: persistent safe workspace registry', () => {
  const roots: string[] = [];
  const temporaryRoot = () => {
    const root = mkdtempSync(join(tmpdir(), 'mwb-registry-'));
    roots.push(root);
    return root;
  };
  const treeHash = (root: string) => {
    const hash = createHash('sha256');
    for (const relative of readdirSync(root, { recursive: true }).map(String).sort()) {
      const full = join(root, relative);
      hash.update(relative);
      if (statSync(full).isFile()) hash.update(readFileSync(full));
    }
    return hash.digest('hex');
  };

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  it('registers an ordinary folder without writing inside it and reuses its opaque ID', () => {
    const runtime = temporaryRoot();
    const target = temporaryRoot();
    mkdirSync(join(target, 'notes'));
    writeFileSync(join(target, 'notes', 'idea.txt'), 'unchanged', 'utf8');
    const before = treeHash(target);
    const registryFile = join(runtime, 'workspaces.json');

    const first = new WorkspaceRegistry(registryFile).register(target);
    const after = treeHash(target);
    const second = new WorkspaceRegistry(registryFile).register(target);

    expect(first.classification).toBe('needs_onboarding');
    expect(first.id).toMatch(/^ws_[a-f0-9]{16}$/);
    expect(second.id).toBe(first.id);
    expect(after).toEqual(before);
    expect(readFileSync(join(target, 'notes', 'idea.txt'), 'utf8')).toBe('unchanged');
    expect(JSON.stringify(first)).not.toContain(target);
  });

  it('recognizes an existing valid canonical workspace as ready', () => {
    const runtime = temporaryRoot();
    const target = temporaryRoot();
    cpSync(join(process.cwd(), 'seed', 'example-project'), target, { recursive: true });

    const registered = new WorkspaceRegistry(join(runtime, 'workspaces.json')).register(target);

    expect(registered.classification).toBe('ready');
    expect(registered.errorReceipt).toBeNull();
  });

  it('creates a valid empty canonical project and projects an honest no-question state', () => {
    const runtime = temporaryRoot();
    const parent = temporaryRoot();
    const registry = new WorkspaceRegistry(join(runtime, 'workspaces.json'));

    const created = registry.create(parent, 'First Real Project', 'artistic-research', 'Make the first real output');
    const projection = registry.projection(created.id);

    expect(created.classification).toBe('ready');
    expect(projection).toMatchObject({
      workspace: { id: created.id, active: true, classification: 'ready' },
      focus: {
        projectName: 'First Real Project',
        currentQuestion: null,
        nextAction: { label: 'Create or select the first question' },
      },
      field: { currentObject: null, nodes: [], relations: [] },
      artifacts: [],
    });
    expect(() => registry.create(parent, 'First Real Project', 'artistic-research', 'Do not overwrite')).toThrow('already exists');
    expect(readFileSync(join(parent, 'first-real-project', 'PROJECT.md'), 'utf8')).toContain('First Real Project');
  });

  it('persists activation when switching between two workspaces', () => {
    const runtime = temporaryRoot();
    const firstParent = temporaryRoot();
    const secondParent = temporaryRoot();
    const registryFile = join(runtime, 'workspaces.json');
    const registry = new WorkspaceRegistry(registryFile);
    const first = registry.create(firstParent, 'First', 'research', 'First objective');
    const second = registry.create(secondParent, 'Second', 'research', 'Second objective');

    registry.activate(first.id);
    const afterRestart = new WorkspaceRegistry(registryFile).list();

    expect(afterRestart.find(({ id }) => id === first.id)?.active).toBe(true);
    expect(afterRestart.find(({ id }) => id === second.id)?.active).toBe(false);
  });

  it('classifies partial Workbench-shaped folders as invalid', () => {
    const runtime = temporaryRoot();
    const target = temporaryRoot();
    writeFileSync(join(target, 'PROJECT.md'), 'not valid front matter', 'utf8');

    const registered = new WorkspaceRegistry(join(runtime, 'workspaces.json')).register(target);

    expect(registered.classification).toBe('invalid');
    expect(registered.errorReceipt).toEqual({
      code: 'canonical_validation_failed',
      message: 'Workspace records failed validation',
      safeState: 'read_only',
    });
    expect(JSON.stringify(registered)).not.toContain(target);
  });
});
