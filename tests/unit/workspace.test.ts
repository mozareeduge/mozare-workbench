import { cpSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CACHE_DIRECTORY, DERIVED_DIRECTORY, WorkspaceValidationError, canonicalHash, clearDerivedWorkspace, isCanonicalPath, rebuildDerivedWorkspace } from '../../src/core/workspace.js';

const roots: string[] = [];
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'mozare-workspace-'));
  roots.push(root);
  cpSync(join(process.cwd(), 'seed', 'example-project'), root, { recursive: true });
  return root;
}
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

describe('canonical workspace reconstruction (TEST-001)', () => {
  it('rebuilds derived cache from unchanged accepted canonical records', () => {
    const root = fixture();
    const before = rebuildDerivedWorkspace(root);
    const beforeHash = canonicalHash(before);
    const firstProjection = readFileSync(join(root, CACHE_DIRECTORY, 'projection.json'), 'utf8');
    clearDerivedWorkspace(root);
    expect(() => readFileSync(join(root, DERIVED_DIRECTORY, 'cache', 'projection.json'))).toThrow();
    const after = rebuildDerivedWorkspace(root);
    expect(canonicalHash(after)).toBe(beforeHash);
    expect(after.objects.map(({ id }) => id)).toEqual(before.objects.map(({ id }) => id));
    expect(after.relations.map(({ id }) => id)).toEqual(before.relations.map(({ id }) => id));
    expect(after.artifacts.map(({ id }) => id)).toEqual(before.artifacts.map(({ id }) => id));
    expect(readFileSync(join(root, CACHE_DIRECTORY, 'projection.json'), 'utf8')).toBe(firstProjection);
  });

  it('fails safely for a missing or corrupt canonical record instead of inventing data', () => {
    const root = fixture();
    unlinkSync(join(root, 'objects', 'src_20260914_example01.md'));
    expect(() => rebuildDerivedWorkspace(root)).toThrow(WorkspaceValidationError);
    writeFileSync(join(root, 'relations', 'rel_20260914_example01.yaml'), 'id: [not valid', 'utf8');
    expect(() => rebuildDerivedWorkspace(root)).toThrow(WorkspaceValidationError);
  });

  it('does not treat derived paths as canonical input', () => {
    const root = fixture();
    expect(isCanonicalPath(root, join(root, 'objects', 'q_20260914_example01.md'))).toBe(true);
    expect(isCanonicalPath(root, join(root, DERIVED_DIRECTORY, 'cache', 'projection.json'))).toBe(false);
  });
});
