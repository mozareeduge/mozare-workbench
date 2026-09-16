import { existsSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { GitAdapter, GitPathSafetyError, GitRepositoryRegistry } from '../../src/server/git/GitAdapter.js';
import { DirtyRepositoryError, WorktreeManager } from '../../src/server/git/WorktreeManager.js';
import { ProcessRunner } from '../../src/server/process/ProcessRunner.js';

const roots: string[] = [];

async function repository(): Promise<string> {
  const root = mkdtempSync(join(tmpdir(), 'mozare-git-'));
  roots.push(root);
  const process = new ProcessRunner();
  await process.run('git', ['init', '--initial-branch=main'], root);
  await process.run('git', ['config', 'user.email', 'tests@mozare.local'], root);
  await process.run('git', ['config', 'user.name', 'Mozare tests'], root);
  writeFileSync(join(root, 'tracked.txt'), 'initial\n');
  await process.run('git', ['add', 'tracked.txt'], root);
  await process.run('git', ['commit', '-m', 'initial'], root);
  return root;
}

afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

describe('Git/command/secret safety (TEST-012)', () => {
  it('protects a dirty registered repository before an isolated mission worktree is made', async () => {
    const root = await repository();
    writeFileSync(join(root, 'tracked.txt'), 'dirty\n');
    const registry = new GitRepositoryRegistry();
    const git = new GitAdapter(registry);
    const registered = await git.register(root);

    await expect(git.status(registered.id)).resolves.toMatchObject({ dirty: true, modified: ['tracked.txt'] });
    await expect(new WorktreeManager(git).create(registered.id, join(tmpdir(), 'mozare-worktree-target'))).rejects.toBeInstanceOf(DirtyRepositoryError);
  });

  it('rejects traversal, symlink escape, and protected secret paths', async () => {
    const root = await repository();
    const outside = mkdtempSync(join(tmpdir(), 'mozare-outside-'));
    roots.push(outside);
    writeFileSync(join(root, '.env'), 'TOKEN=not-for-context\n');
    writeFileSync(join(outside, 'outside.txt'), 'outside\n');
    symlinkSync(outside, join(root, 'escape'), 'junction');
    const registry = new GitRepositoryRegistry();
    const registered = await new GitAdapter(registry).register(root);

    expect(() => registry.resolvePath(registered.id, '../../outside.txt')).toThrow(GitPathSafetyError);
    expect(() => registry.resolvePath(registered.id, 'escape/outside.txt')).toThrow(GitPathSafetyError);
    expect(() => registry.resolvePath(registered.id, '.env')).toThrow(GitPathSafetyError);
  });

  it('passes shell metacharacters as a literal argv value rather than executing a shell', async () => {
    const root = await repository();
    const marker = join(root, 'must-not-exist');
    const result = await new ProcessRunner().run(process.execPath, ['-e', 'process.stdout.write(process.argv[1])', `literal; touch ${marker}`], root);

    expect(result.stdout).toBe(`literal; touch ${marker}`);
    expect(existsSync(marker)).toBe(false);
  });
});
