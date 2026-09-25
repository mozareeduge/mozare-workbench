import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { WorkLedger } from '../src/core/continuity/WorkLedger.js';
import { HarnessCoordinator, type CoordinatedMission } from '../src/server/agents/HarnessCoordinator.js';
import { realHarnessAdapters, type RealHarnessId } from '../src/server/agents/HarnessAdapter.js';

const execute = process.argv.includes('--execute');
const adapters = realHarnessAdapters();
const harnessIndex = process.argv.indexOf('--harness');
// --harness accepts one id or an ordered chain, e.g. codex,claude,hermes,codex
const selected = harnessIndex >= 0 ? process.argv[harnessIndex + 1].split(',') as RealHarnessId[] : Object.keys(adapters) as RealHarnessId[];
if (selected.some((id) => !['claude', 'codex', 'hermes'].includes(id))) throw new Error('Unknown --harness value');
const matrix = await Promise.all([...new Set(selected)].map((id) => adapters[id].probe()));
console.log(JSON.stringify({ mode: execute ? 'safe-mission' : 'capability-only', matrix }, null, 2));
if (!execute) process.exit(0);
// --effort applies where the adapter forwards it (Claude --effort, Hermes --reasoning); Codex keeps its own configured effort.
const effortIndex = process.argv.indexOf('--effort');
const effort = effortIndex >= 0 ? process.argv[effortIndex + 1] : null;

const root = join(process.cwd(), '.mozare-runtime', `harness-probe-${Date.now()}`);
mkdirSync(join(root, 'config'), { recursive: true });
copyFileSync(join(process.cwd(), 'config', 'handoff.schema.json'), join(root, 'config', 'handoff.schema.json'));
const ledger = new WorkLedger(join(root, '.mozare', 'runtime', 'work-ledger'));
const coordinator = new HarnessCoordinator(adapters, ledger);
const results = [];
for (const [step, harness] of selected.entries()) {
  const runId = selected.length > 1 ? `probe-${step + 1}-${harness}` : `probe-${harness}`;
  const runDirectory = join(root, '.mozare', 'runtime', 'runs', runId);
  mkdirSync(runDirectory, { recursive: true });
  const contextPackRef = join(runDirectory, 'context-pack.json');
  writeFileSync(contextPackRef, `${JSON.stringify({
    id: 'CTX-HARNESS-PROBE', mission_id: 'mission-harness-probe', profile: 'technical',
    objective: 'Prove a harmless structured handoff without changing canonical project files.',
    authority: ['AUTHORITY/08'], items: [], expansion_handles: [], metrics: { duplicate_count: 0, duplicate_ratio: 0 },
    budget: { target_tokens: 600, hard_tokens: 1200, estimated_tokens: 100, tier: 'simple_mission' },
  }, null, 2)}\n`, 'utf8');
  const mission: CoordinatedMission = {
    runId, projectId: 'project-harness-probe', missionId: 'mission-harness-probe', taskId: 'task-harness-probe', taskVersion: 1,
    workspaceRoot: root, runDirectory, objective: 'Read the bounded contract and write a schema-valid handoff. Do not modify canonical content.',
    contextPackRef, contextSnapshotRef: null, authorityRefs: ['AUTHORITY/08'], oracleRefs: ['ORACLE-054', 'ORACLE-055'],
    model: null, effort: harness === 'codex' ? null : effort, routeTier: 'CODING_AGENT', nextAction: 'Continue the same task in the next available harness.',
  };
  const result = await coordinator.begin(harness, mission).completion;
  results.push({
    harness,
    capability: result.capability,
    status: result.record.status,
    handoffRef: result.record.handoffRef,
    model: result.record.model ?? 'unknown',
    effort: result.record.effort ?? 'unknown',
    failure: result.harnessResult?.failureReason ?? result.record.blockers[0] ?? null,
  });
}
const chain = ledger.records({ projectId: 'project-harness-probe', missionId: 'mission-harness-probe', taskId: 'task-harness-probe' });
const continuity = {
  sameIdentity: chain.length === selected.length,
  harnessSequence: chain.map((record) => record.harness),
  allCompleted: results.every((result) => result.status === 'completed'),
  resolved: ledger.resolveTask('project-harness-probe', 'mission-harness-probe', 'task-harness-probe'),
};
console.log(JSON.stringify({ root, results, continuity }, null, 2));
