import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { WorkspaceRegistry } from '../../src/server/workspaces/WorkspaceRegistry.js';
import { WorkLedger } from '../../src/core/continuity/WorkLedger.js';

export default async function setup() {
  const e2eRuntime = join(process.cwd(), '.mozare-runtime', 'e2e');
  const registryFile = join(e2eRuntime, 'workspaces.json');
  rmSync(e2eRuntime, { recursive: true, force: true });
  const tempRoot = mkdtempSync(join(tmpdir(), 'mwb-live-e2e-'));
  const alpha = join(tempRoot, 'alpha-live-project');
  const beta = join(tempRoot, 'beta-live-project');
  cpSync(join(process.cwd(), 'seed', 'example-project'), alpha, { recursive: true });
  cpSync(join(process.cwd(), 'seed', 'example-project'), beta, { recursive: true });
  for (const [root, name] of [[alpha, 'Alpha Live Project'], [beta, 'پروژه Beta Live Project ۲']] as const) {
    const projectFile = join(root, 'PROJECT.md');
    writeFileSync(projectFile, readFileSync(projectFile, 'utf8').replace('name: Example Artistic Research Field', `name: ${name}`), 'utf8');
  }
  mkdirSync(dirname(registryFile), { recursive: true });
  const ledger = new WorkLedger(join(e2eRuntime, 'work-ledger'));
  const registry = new WorkspaceRegistry(registryFile, ledger);
  const first = registry.register(alpha);
  registry.register(beta);
  registry.activate(first.id);
  ledger.append({
    runId: 'run-e2e-codex-v1', projectId: 'example-artistic-research', missionId: 'mission-e2e', taskId: 'task-e2e', taskVersion: 1,
    supersedesRunId: null, harness: 'codex', model: 'observed-test-model', effort: 'medium', capabilitySnapshotRef: 'evidence/capability.json',
    contextPackRef: 'context/pack.json', contextSnapshotRef: 'context/snapshot.json', authorityRefs: ['AUTHORITY/08'], oracleRefs: ['ORACLE-050'],
    candidateBefore: 'candidate-before', candidateAfter: 'candidate-after', status: 'parked', resultSummary: 'Codex completed the live workspace foundation.',
    changedRefs: ['src/web/App.tsx'], evidenceRefs: ['TEST-023:pass'], decisions: ['Keep continuity vendor-neutral.'], blockers: [],
    remaining: ['Continue the same mission in another harness.'], nextAction: 'Continue in Claude Code.', handoffRef: 'handoffs/run-e2e-codex-v1.json',
    operatorRole: 'agent', startedAt: '2026-09-23T08:00:00Z', endedAt: '2026-09-23T08:30:00Z',
  });

  return async () => {
    rmSync(tempRoot, { recursive: true, force: true });
    rmSync(e2eRuntime, { recursive: true, force: true });
  };
}
