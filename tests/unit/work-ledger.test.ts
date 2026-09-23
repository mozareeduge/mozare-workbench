import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { afterEach, describe, expect, it } from 'vitest';
import { ContinuationService } from '../../src/core/continuity/ContinuationService.js';
import { WorkLedger, WorkLedgerConflictError, type WorkRecordInput } from '../../src/core/continuity/WorkLedger.js';

const roots: string[] = [];
const temp = () => { const root = mkdtempSync(join(tmpdir(), 'mwb-ledger-')); roots.push(root); return root; };

function record(overrides: Partial<WorkRecordInput> = {}): WorkRecordInput {
  return {
    runId: 'run-codex-v1', projectId: 'project-1', missionId: 'mission-1', taskId: 'task-1', taskVersion: 1,
    supersedesRunId: null, harness: 'codex', model: 'gpt-codex', effort: 'medium',
    capabilitySnapshotRef: 'capabilities/codex-1.json', contextPackRef: 'context/pack-1.json', contextSnapshotRef: 'context/snapshot-1.json',
    authorityRefs: ['AUTHORITY/08'], oracleRefs: ['ORACLE-050'], candidateBefore: 'abc123', candidateAfter: 'def456',
    status: 'parked', resultSummary: 'Registry work is safe and partially complete.', changedRefs: ['src/registry.ts'], evidenceRefs: ['TEST-026:pass'],
    decisions: ['Keep registry derived.'], blockers: ['Claude capability pending.'], remaining: ['Continue adapter integration.'], nextAction: 'Continue the same task in Claude Code.',
    handoffRef: 'handoffs/run-codex-v1.json', operatorRole: 'agent', startedAt: '2026-09-23T08:00:00Z', endedAt: '2026-09-23T08:30:00Z',
    ...overrides,
  };
}

afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

describe('TEST-026: durable append-only work ledger and task versions', () => {
  it('survives restart, resolves the latest intact successor, and retains parked history', () => {
    const directory = temp();
    const ledger = new WorkLedger(directory);
    const codex = ledger.append(record());
    const claude = ledger.append(record({
      runId: 'run-claude-v1', supersedesRunId: codex.runId, harness: 'claude', model: null, effort: null,
      status: 'completed', resultSummary: 'Claude completed version one.', blockers: [], remaining: ['Start version two.'], nextAction: 'Create the explicit successor.',
    }));
    ledger.append(record({
      runId: 'run-hermes-v2', taskVersion: 2, expectedTaskVersion: 1, supersedesRunId: claude.runId,
      harness: 'hermes', model: 'hermes-observed', status: 'completed', resultSummary: 'Hermes completed version two.', blockers: [], remaining: [], nextAction: 'Review the candidate.',
    }));

    const restarted = new WorkLedger(directory);
    const resolved = restarted.resolveTask('project-1', 'mission-1', 'task-1');

    expect(resolved.current).toMatchObject({ runId: 'run-hermes-v2', taskVersion: 2, harness: 'hermes', status: 'completed' });
    expect(resolved.history).toHaveLength(3);
    expect(resolved.parked.map(({ runId }) => runId)).toContain('run-codex-v1');
    expect(resolved.superseded.map(({ runId }) => runId)).toEqual(expect.arrayContaining(['run-codex-v1', 'run-claude-v1']));
  });

  it('rejects a stale returning harness with a bounded conflict receipt', () => {
    const ledger = new WorkLedger(temp());
    const first = ledger.append(record({ status: 'completed' }));
    ledger.append(record({ runId: 'run-claude-v2', taskVersion: 2, expectedTaskVersion: 1, supersedesRunId: first.runId, harness: 'claude', status: 'completed' }));

    expect(() => ledger.append(record({ runId: 'run-stale-codex', expectedTaskVersion: 1 }))).toThrow(WorkLedgerConflictError);
    try { ledger.append(record({ runId: 'run-stale-codex-2', expectedTaskVersion: 1 })); } catch (error) {
      expect((error as WorkLedgerConflictError).receipt).toEqual({
        code: 'stale_task_version', taskId: 'task-1', attemptedVersion: 1, currentVersion: 2,
        currentRunId: 'run-claude-v2', safeRoute: 'continue_current_or_create_successor',
      });
    }
    expect(ledger.records()).toHaveLength(2);
  });

  it('rejects a successor that skips an immutable task version', () => {
    const ledger = new WorkLedger(temp());
    const first = ledger.append(record({ status: 'completed' }));
    expect(() => ledger.append(record({ runId: 'run-v3', taskVersion: 3, supersedesRunId: first.runId }))).toThrow(/cannot skip/i);
    expect(ledger.records()).toHaveLength(1);
  });

  it('persists only the allowlisted bounded record and rejects secret/transcript/log canaries', () => {
    const directory = temp();
    const ledger = new WorkLedger(directory);
    ledger.append({ ...record(), promptBody: 'not durable', rawTranscript: 'not durable', hiddenReasoning: 'not durable' } as WorkRecordInput);
    const stored = readdirSync(directory).map((name) => readFileSync(join(directory, name), 'utf8')).join('\n');
    expect(stored).not.toContain('promptBody');
    expect(stored).not.toContain('rawTranscript');
    expect(stored).not.toContain('hiddenReasoning');
    expect(() => ledger.append(record({ runId: 'run-secret', supersedesRunId: 'run-codex-v1', remaining: ['api_key=SECRET_CANARY'] }))).toThrow(/forbidden/i);
    expect(() => ledger.append(record({ runId: 'run-log', supersedesRunId: 'run-codex-v1', resultSummary: 'step diagnostic line 9000' }))).toThrow(/forbidden/i);
  });

  it('writes a schema-valid complete record and rejects malformed required facts', () => {
    const ledger = new WorkLedger(temp());
    const stored = ledger.append(record());
    const schema = JSON.parse(readFileSync(join(process.cwd(), 'config', 'work-run.schema.json'), 'utf8'));
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);

    expect(validate(stored), ajv.errorsText(validate.errors)).toBe(true);
    expect(() => new WorkLedger(temp()).append(record({ resultSummary: '   ' }))).toThrow(/must not be empty/i);
    expect(() => new WorkLedger(temp()).append(record({ operatorRole: 'observer' as 'agent' }))).toThrow(/operator role/i);
    expect(() => new WorkLedger(temp()).append(record({ endedAt: '2026-09-23T07:59:59Z' }))).toThrow(/earlier/i);
  });
});

describe('TEST-027: bounded cross-harness continuation packet', () => {
  it('reconstructs continuation from durable refs without transcript replay', () => {
    const ledger = new WorkLedger(temp());
    ledger.append(record());
    const packet = new ContinuationService(ledger).compile('project-1', 'mission-1', 'task-1');

    expect(packet).toMatchObject({
      projectId: 'project-1', missionId: 'mission-1', taskId: 'task-1', taskVersion: 1,
      priorRunId: 'run-codex-v1', priorHarness: 'codex', priorStatus: 'parked', candidateId: 'def456',
      contextPackRef: 'context/pack-1.json', remaining: ['Continue adapter integration.'], nextAction: 'Continue the same task in Claude Code.',
    });
    expect(JSON.stringify(packet)).not.toMatch(/prompt|transcript|reasoning/i);
    expect(packet.mutableFactsToRecheck).toContain('candidate identity');
  });
});
