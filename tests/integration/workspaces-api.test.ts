import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

  it('shows bounded observed Field structure and output files for an existing project without inventing canonical records', async () => {
    const runtime = temporaryRoot();
    const target = temporaryRoot();
    mkdirSync(join(target, 'docs'));
    mkdirSync(join(target, 'outputs'));
    mkdirSync(join(target, 'artifacts'));
    writeFileSync(join(target, 'README.md'), '# Existing project\n', 'utf8');
    writeFileSync(join(target, 'outputs', 'report.txt'), 'Project result', 'utf8');
    writeFileSync(join(target, 'artifacts', 'render.txt'), 'Rendered result', 'utf8');
    const app = buildApp({ workspaceRegistryFile: join(runtime, 'workspaces.json'), folderPicker: async () => target });
    apps.push(app);
    const picked = await app.inject({ method: 'POST', url: '/api/system/pick-folder' });
    const registered = await app.inject({ method: 'POST', url: '/api/workspaces/register', payload: { selectionToken: picked.json().selectionToken } });
    const id = registered.json().workspace.id as string;
    const projection = (await app.inject({ method: 'GET', url: `/api/workspaces/${id}/projection` })).json();
    const artifacts = (await app.inject({ method: 'GET', url: `/api/workspaces/${id}/artifacts` })).json().artifacts;

    expect(projection).toMatchObject({ workspace: { classification: 'needs_onboarding' }, focus: null, field: { source: 'observed', relations: [] } });
    expect(projection.field.nodes.map((node: { name: string }) => node.name)).toEqual(expect.arrayContaining(['docs', 'outputs', 'README.md']));
    expect(artifacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'report.txt', canonicality: 'external', verification: 'unverified', lineage: expect.stringContaining('Observed in this project') }),
      expect.objectContaining({ title: 'render.txt', canonicality: 'external', verification: 'unverified' }),
    ]));
    expect(readFileSync(join(target, 'outputs', 'report.txt'), 'utf8')).toBe('Project result');
  });
});
