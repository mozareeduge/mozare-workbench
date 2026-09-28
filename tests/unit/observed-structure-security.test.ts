import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { resolveArtifactFile } from '../../src/server/missions/ArtifactPreviews.js';
import { observeStructure } from '../../src/server/workspaces/ObservedStructure.js';

const roots: string[] = [];
const temporaryRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'mwb-observed-security-'));
  roots.push(root);
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

it('does not discover or preview output through a junction outside the project', () => {
  const project = temporaryRoot();
  const outside = temporaryRoot();
  mkdirSync(join(outside, 'nested'));
  writeFileSync(join(outside, 'nested', 'private.txt'), 'outside', 'utf8');
  symlinkSync(outside, join(project, 'outputs'), process.platform === 'win32' ? 'junction' : 'dir');

  expect(observeStructure(project).artifacts).toEqual([]);
  expect(resolveArtifactFile(project, 'outputs/nested/private.txt')).toBeNull();
});
