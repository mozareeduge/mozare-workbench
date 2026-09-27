import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WorkLedger } from '../../src/core/continuity/WorkLedger.js';
import { buildApp } from '../../src/server/app.js';
import { WorkspaceRegistry } from '../../src/server/workspaces/WorkspaceRegistry.js';

describe('CLI work from any project: MAWS thread + git history', () => {
  const roots: string[] = [];
  const apps: ReturnType<typeof buildApp>[] = [];
  const temp = () => { const root = mkdtempSync(join(tmpdir(), 'mwb-cli-')); roots.push(root); return root; };
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
    roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }));
  });

  it('shows who worked in which harness, what is active, blocked and next — for an ordinary code repo', async () => {
    const project = temp();
    const git = (...args: string[]) => execFileSync('git', args, { cwd: project, stdio: 'pipe' });
    git('init', '-q');
    git('config', 'user.email', 'owner@example.test');
    git('config', 'user.name', 'Owner');
    const commit = (file: string, message: string) => { writeFileSync(join(project, file), file, 'utf8'); git('add', file); git('commit', '-q', '-m', message); };
    commit('a.txt', 'feat: parser\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>');
    commit('b.txt', 'fix: tokenizer\n\nCo-authored-by: Codex <codex@openai.com>');
    commit('c.txt', 'docs: readme by hand');
    writeFileSync(join(project, 'dirty.txt'), 'x', 'utf8');

    const thread = join(project, '.maws', 'threads', 't1');
    mkdirSync(thread, { recursive: true });
    writeFileSync(join(project, '.maws', 'ACTIVE'), 't1\n', 'utf8');
    writeFileSync(join(thread, 'state.json'), JSON.stringify({
      title: 'Ship the parser', objective: 'Parse every input format.', status: 'active', phase: 'execute', summary: '',
      blockers: ['Hermes needs a model configured'], decisions: ['Use streaming parser'], host: { last: 'hermes' }, updated_at: '2026-09-27T10:00:00Z',
      work: { active_item: 'P2', items: [
        { id: 'P1', title: 'Tokenizer', status: 'done', closed_at: '2026-09-26T10:00:00Z' },
        { id: 'P2', title: 'Grammar', status: 'active' },
        { id: 'P3', title: 'Docs', status: 'queued' },
        { id: 'P4', title: 'Bench', status: 'blocked' },
      ] },
    }), 'utf8');
    // Real MAWS events name the harness only in message text; there is no host field.
    writeFileSync(join(thread, 'events.jsonl'), [
      { at: '2026-09-25T09:00:00Z', type: 'thread-created', message: 'Created by claude' },
      { at: '2026-09-25T09:00:01Z', type: 'item-added', message: 'P1' },
      { at: '2026-09-25T09:00:02Z', type: 'item-added', message: 'P2' },
      { at: '2026-09-26T09:00:00Z', type: 'resumed', message: 'Resumed by codex' },
      { at: '2026-09-26T09:00:01Z', type: 'item-claimed', message: 'P1' },
      { at: '2026-09-26T10:00:00Z', type: 'item-completed', message: 'P1' },
      { at: '2026-09-27T09:00:00Z', type: 'resumed', message: 'Resumed by hermes' },
      { at: '2026-09-27T09:00:01Z', type: 'item-claimed', message: 'P2' },
    ].map((event) => JSON.stringify(event)).join('\n'), 'utf8');

    const runtime = temp();
    const ledger = new WorkLedger(join(runtime, 'work-ledger'));
    const registry = new WorkspaceRegistry(join(runtime, 'workspaces.json'), ledger);
    const { id } = registry.register(project);
    const app = buildApp({ workspaceRegistry: registry, workLedger: ledger, runtimeDir: runtime });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: `/api/workspaces/${id}/activity` });
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain(project);
    const activity = response.json();
    expect(activity.maws).toMatchObject({ title: 'Ship the parser', lastHarness: 'hermes', activeItem: { id: 'P2', claimedBy: 'hermes' }, blockers: ['Hermes needs a model configured'] });
    expect(activity.maws.items.find((item: { id: string }) => item.id === 'P1')).toMatchObject({ createdBy: 'claude', claimedBy: 'codex', completedBy: 'codex' });
    expect(activity.maws.recentEvents[0]).toMatchObject({ harness: 'hermes', kind: 'item-claimed', itemId: 'P2' });
    expect(activity.threads).toHaveLength(1);
    expect(activity.git.uncommittedFiles).toBe(2); // dirty.txt and the untracked .maws/ folder
    expect(activity.git.commits.map((commit: { harness: string | null }) => commit.harness)).toEqual([null, 'codex', 'claude']);
  });

  it('degrades to empty for a folder with neither MAWS nor git', async () => {
    const project = temp();
    const runtime = temp();
    const ledger = new WorkLedger(join(runtime, 'work-ledger'));
    const registry = new WorkspaceRegistry(join(runtime, 'workspaces.json'), ledger);
    const { id } = registry.register(project);
    const app = buildApp({ workspaceRegistry: registry, workLedger: ledger, runtimeDir: runtime });
    apps.push(app);
    expect((await app.inject({ method: 'GET', url: `/api/workspaces/${id}/activity` })).json()).toEqual({ maws: null, threads: [], git: null });
  });
});
