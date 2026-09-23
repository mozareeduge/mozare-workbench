import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/server/app.js';

describe('workspace browser API', () => {
  const roots: string[] = [];
  const apps: ReturnType<typeof buildApp>[] = [];
  const temporaryRoot = () => {
    const root = mkdtempSync(join(tmpdir(), 'mwb-api-'));
    roots.push(root);
    return root;
  };

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  it('uses a single-use selection token and never returns the selected absolute path', async () => {
    const runtime = temporaryRoot();
    const target = temporaryRoot();
    const app = buildApp({
      workspaceRegistryFile: join(runtime, 'workspaces.json'),
      folderPicker: async () => target,
    });
    apps.push(app);

    const picked = await app.inject({ method: 'POST', url: '/api/system/pick-folder' });
    expect(picked.statusCode).toBe(200);
    const { selectionToken } = picked.json() as { selectionToken: string };
    const registered = await app.inject({ method: 'POST', url: '/api/workspaces/register', payload: { selectionToken } });
    const replayed = await app.inject({ method: 'POST', url: '/api/workspaces/register', payload: { selectionToken } });

    expect(registered.statusCode).toBe(200);
    expect(replayed.statusCode).toBe(400);
    expect(registered.body).not.toContain(target);
    expect(registered.json()).toMatchObject({ workspace: { classification: 'needs_onboarding', active: true } });

    const absolutePathEvidence = await app.inject({ method: 'GET', url: `/api/evidence/search?workspaceId=${encodeURIComponent(target)}&query=x` });
    expect(absolutePathEvidence.statusCode).toBe(400);
    expect(absolutePathEvidence.body).not.toContain(target);
  });

  it('creates, persists, lists, activates and projects by opaque workspace ID', async () => {
    const runtime = temporaryRoot();
    const parent = temporaryRoot();
    const registryFile = join(runtime, 'workspaces.json');
    const first = buildApp({ workspaceRegistryFile: registryFile, folderPicker: async () => parent });
    apps.push(first);
    const picked = await first.inject({ method: 'POST', url: '/api/system/pick-folder' });
    const { selectionToken } = picked.json() as { selectionToken: string };
    const created = await first.inject({
      method: 'POST',
      url: '/api/workspaces/create',
      payload: { parentSelectionToken: selectionToken, name: 'Durable Project', kind: 'research', currentObjective: 'Prove durable reality' },
    });
    const { workspace } = created.json() as { workspace: { id: string } };
    await first.close();
    apps.splice(apps.indexOf(first), 1);

    const restarted = buildApp({ workspaceRegistryFile: registryFile, folderPicker: async () => null });
    apps.push(restarted);
    const listed = await restarted.inject({ method: 'GET', url: '/api/workspaces' });
    const activated = await restarted.inject({ method: 'POST', url: `/api/workspaces/${workspace.id}/activate` });
    const projection = await restarted.inject({ method: 'GET', url: `/api/workspaces/${workspace.id}/projection` });

    expect(created.statusCode).toBe(200);
    expect(listed.json()).toMatchObject({ workspaces: [{ id: workspace.id, classification: 'ready', active: true }] });
    expect(activated.statusCode).toBe(200);
    expect(projection.json()).toMatchObject({ focus: { projectName: 'Durable Project', currentObjective: 'Prove durable reality', currentQuestion: null } });
    expect(`${listed.body}${activated.body}${projection.body}`).not.toContain(parent);
  });

  it('does not accept an arbitrary filesystem path in place of a selection token', async () => {
    const runtime = temporaryRoot();
    const target = temporaryRoot();
    const app = buildApp({ workspaceRegistryFile: join(runtime, 'workspaces.json'), folderPicker: async () => target });
    apps.push(app);

    const response = await app.inject({ method: 'POST', url: '/api/workspaces/register', payload: { selectionToken: target } });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: 'registration_rejected' });
  });
});
