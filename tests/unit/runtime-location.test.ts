import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { configuredWikiRoot, durableRuntimeDirectory, userDataRoot } from '../../src/server/RuntimeLocation.js';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

it('migrates prior records to the user folder once without deleting the old copy or overwriting new records', () => {
  const root = mkdtempSync(join(tmpdir(), 'mwb-runtime-'));
  roots.push(root);
  const repository = join(root, 'checkout');
  const old = join(repository, '.mozare', 'runtime');
  mkdirSync(old, { recursive: true });
  writeFileSync(join(old, 'workspaces.json'), '{"saved":true}', 'utf8');
  const env = { MWB_DATA_DIR: join(root, 'user-data') };
  const runtime = durableRuntimeDirectory(repository, env);
  expect(runtime).toBe(join(root, 'user-data', 'runtime'));
  expect(readFileSync(join(runtime, 'workspaces.json'), 'utf8')).toBe('{"saved":true}');
  expect(existsSync(join(old, 'workspaces.json'))).toBe(true);
  writeFileSync(join(runtime, 'workspaces.json'), '{"new":true}', 'utf8');
  expect(durableRuntimeDirectory(repository, env)).toBe(runtime);
  expect(readFileSync(join(runtime, 'workspaces.json'), 'utf8')).toBe('{"new":true}');
});

it('reads wiki location from durable user settings without writing to the wiki', () => {
  const root = mkdtempSync(join(tmpdir(), 'mwb-settings-'));
  roots.push(root);
  const env = { MWB_DATA_DIR: join(root, 'user-data') };
  mkdirSync(userDataRoot(env), { recursive: true });
  writeFileSync(join(userDataRoot(env), 'settings.json'), JSON.stringify({ wikiRoot: join(root, 'wiki') }), 'utf8');
  expect(configuredWikiRoot(env)).toBe(join(root, 'wiki'));
});
