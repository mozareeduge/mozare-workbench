import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WorkLedger } from '../../src/core/continuity/WorkLedger.js';
import { buildApp } from '../../src/server/app.js';
import { WorkspaceRegistry } from '../../src/server/workspaces/WorkspaceRegistry.js';

describe('TEST-027: continuity projection and detailed provenance route', () => {
  const roots: string[] = [];
  const apps: ReturnType<typeof buildApp>[] = [];
  const temp = () => { const root = mkdtempSync(join(tmpdir(), 'mwb-continuity-')); roots.push(root); return root; };
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
    roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }));
  });

  it('shows a bounded summary in projection and keeps detailed records behind continuity detail', async () => {
    const runtime = temp();
    const root = temp();
    cpSync(join(process.cwd(), 'seed', 'example-project'), root, { recursive: true });
    const ledger = new WorkLedger(join(runtime, 'ledger'));
    const registry = new WorkspaceRegistry(join(runtime, 'workspaces.json'), ledger);
    const workspace = registry.register(root);
    ledger.append({
      runId: 'run-codex-1', projectId: 'example-artistic-research', missionId: 'mission-live', taskId: 'task-live', taskVersion: 1,
      supersedesRunId: null, harness: 'codex', model: null, effort: null, capabilitySnapshotRef: 'caps/codex.json', contextPackRef: 'context/pack.json',
      contextSnapshotRef: null, authorityRefs: ['AUTHORITY/08'], oracleRefs: ['ORACLE-050'], candidateBefore: 'before', candidateAfter: 'after',
      status: 'parked', resultSummary: 'Codex parked a safe partial result.', changedRefs: ['src/example.ts'], evidenceRefs: ['TEST-026:pass'], decisions: [], blockers: [],
      remaining: ['Continue in Claude Code.'], nextAction: 'Resume the same task.', handoffRef: 'handoffs/codex.json', operatorRole: 'agent',
      startedAt: '2026-09-23T08:00:00Z', endedAt: '2026-09-23T08:20:00Z',
    });
    const app = buildApp({ workspaceRegistry: registry, workLedger: ledger });
    apps.push(app);

    const projection = await app.inject({ method: 'GET', url: `/api/workspaces/${workspace.id}/projection` });
    const detail = await app.inject({ method: 'GET', url: `/api/workspaces/${workspace.id}/continuity` });

    expect(projection.json()).toMatchObject({ continuity: { currentTaskId: 'task-live', currentTaskVersion: 1, harness: 'codex', model: 'unknown', status: 'parked', nextAction: 'Resume the same task.' } });
    expect(detail.json()).toMatchObject({ summary: { latestRunId: 'run-codex-1' }, records: [{ runId: 'run-codex-1', contextPackRef: 'context/pack.json' }] });
    expect(`${projection.body}${detail.body}`).not.toContain(root);
    expect(`${projection.body}${detail.body}`).not.toMatch(/rawTranscript|hiddenReasoning|promptBody/);
  });
});
