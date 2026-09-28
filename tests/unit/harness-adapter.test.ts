import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WorkLedger } from '../../src/core/continuity/WorkLedger.js';
import { HarnessAdapter, type HarnessMission, type RealHarnessId } from '../../src/server/agents/HarnessAdapter.js';
import { HarnessCoordinator, type CoordinatedMission } from '../../src/server/agents/HarnessCoordinator.js';
import { ProcessRunner, type ProcessOptions, type ProcessResult, type RunningProcess } from '../../src/server/process/ProcessRunner.js';

const roots: string[] = [];
const temp = () => { const root = mkdtempSync(join(tmpdir(), 'mwb-harness-')); roots.push(root); return root; };
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

function handoff(runId: string) {
  return {
    run_id: runId, state: 'completed', summary: 'Harmless continuity mission completed.',
    system_view: { intent: 'Prove continuity', behavior: 'No canonical files changed.', architecture: [], implementation: [], verification: ['handoff observed'] },
    changed: [], decisions: [], tests: [], artifacts: [], technical_terms: [], blockers: [], open_questions: [], next_action: 'Continue in the next harness.',
  };
}

class ObservedRunner extends ProcessRunner {
  override readonly workspaceIsolated = true;
  readonly calls: Array<{ command: string; args: string[]; cwd: string; stdin?: string; timeoutMs?: number }> = [];
  constructor(private readonly runDirectory: string, private readonly block = false) { super(); }

  override async run(command: string, args: string[], cwd: string, options: ProcessOptions = {}): Promise<ProcessResult> {
    this.calls.push({ command, args, cwd, stdin: options.stdin, timeoutMs: options.timeoutMs });
    return { command, args, cwd, exitCode: 0, stdout: args.includes('--version') ? `${command} test-version` : 'help', stderr: '' };
  }

  override start(command: string, args: string[], cwd: string, options: ProcessOptions = {}): RunningProcess {
    this.calls.push({ command, args, cwd, stdin: options.stdin, timeoutMs: options.timeoutMs });
    let finish: ((result: ProcessResult) => void) | null = null;
    const completion = this.block
      ? new Promise<ProcessResult>((resolve) => { finish = resolve; })
      : Promise.resolve().then(() => {
          mkdirSync(this.runDirectory, { recursive: true });
          writeFileSync(join(this.runDirectory, 'handoff.json'), JSON.stringify(handoff(this.runDirectory.split(/[\\/]/).at(-1) ?? 'run')), 'utf8');
          return { command, args, cwd, exitCode: 0, stdout: 'provider output is diagnostic only', stderr: '' };
        });
    return {
      completion,
      stop: () => {
        finish?.({ command, args, cwd, exitCode: 143, stdout: '', stderr: 'terminated' });
        return true;
      },
    };
  }
}

class ExpiredAuthRunner extends ObservedRunner {
  override start(command: string, args: string[], cwd: string): RunningProcess {
    return {
      completion: Promise.resolve({ command, args, cwd, exitCode: 1, stdout: 'Failed to authenticate: OAuth session expired', stderr: '' }),
      stop: () => true,
    };
  }
}

class PartialHandoffRunner extends ObservedRunner {
  constructor(private readonly target: string) { super(target); }
  override start(command: string, args: string[], cwd: string): RunningProcess {
    const value = handoff('run-partial');
    value.state = 'partial';
    writeFileSync(join(this.target, 'handoff.json'), JSON.stringify(value), 'utf8');
    return { completion: Promise.resolve({ command, args, cwd, exitCode: 0, stdout: '', stderr: '' }), stop: () => true };
  }
}

function mission(root: string, harness: RealHarnessId, runId: string): CoordinatedMission {
  const runDirectory = join(root, '.mozare', 'runtime', 'runs', runId);
  const contextPackRef = join(runDirectory, 'context-pack.json');
  mkdirSync(runDirectory, { recursive: true });
  writeFileSync(contextPackRef, JSON.stringify({
    id: 'CTX-1', mission_id: 'mission-1', profile: 'technical', objective: 'Harmless handoff.', authority: ['AUTHORITY/08'],
    budget: { target_tokens: 600, hard_tokens: 1200, estimated_tokens: 100, tier: 'simple_mission' },
    items: [], expansion_handles: [], metrics: { duplicate_count: 0, duplicate_ratio: 0 },
  }), 'utf8');
  return {
    runId, projectId: 'project-1', missionId: 'mission-1', taskId: 'task-1', taskVersion: 1,
    workspaceRoot: root, runDirectory, objective: 'Produce a harmless structured handoff.', contextPackRef,
    contextSnapshotRef: null, authorityRefs: ['AUTHORITY/08'], oracleRefs: ['ORACLE-054'],
    model: `${harness}-observed-model`, effort: 'medium', routeTier: 'CODING_AGENT', nextAction: 'Continue safely.',
  };
}

describe('TEST-028: common three-adapter contract and lifecycle', () => {
  it('preserves one identity through Codex, Claude, and Hermes with argv-safe contained execution', async () => {
    const root = temp();
    const ledger = new WorkLedger(join(root, '.mozare', 'runtime', 'work-ledger'));
    const adapters = {} as Record<RealHarnessId, HarnessAdapter>;
    const runners = {} as Record<RealHarnessId, ObservedRunner>;
    for (const harness of ['codex', 'claude', 'hermes'] as const) {
      const runId = `run-${harness}`;
      runners[harness] = new ObservedRunner(join(root, '.mozare', 'runtime', 'runs', runId));
      adapters[harness] = new HarnessAdapter(harness, harness, runners[harness]);
    }
    const coordinator = new HarnessCoordinator(adapters, ledger, async () => ({ candidate: 'candidate-1', changedRefs: [] }));
    for (const harness of ['codex', 'claude', 'hermes'] as const) {
      const result = await coordinator.begin(harness, mission(root, harness, `run-${harness}`)).completion;
      expect(result.record).toMatchObject({ projectId: 'project-1', missionId: 'mission-1', taskId: 'task-1', taskVersion: 1, harness, status: 'completed' });
      expect(result.harnessResult?.handoffRef).toMatch(/handoff\.json$/);
      const processCall = runners[harness].calls.at(-1)!;
      expect(processCall.cwd).toBe(root);
      expect(processCall.args.join(' ')).not.toContain('Produce a harmless structured handoff');
    }
    const restarted = new WorkLedger(join(root, '.mozare', 'runtime', 'work-ledger'));
    expect(restarted.resolveTask('project-1', 'mission-1', 'task-1').current).toMatchObject({ runId: 'run-hermes', harness: 'hermes' });
    expect(restarted.records()).toHaveLength(3);
  });

  it('runs work without an adapter time cap and passes model, effort, shell and tests to each CLI', async () => {
    const root = temp();
    for (const harness of ['codex', 'claude', 'hermes'] as const) {
      const current = mission(root, harness, `run-full-${harness}`);
      current.mode = 'work';
      const runner = new ObservedRunner(current.runDirectory);
      const result = await new HarnessAdapter(harness, harness, runner).start(current).completion;
      const call = runner.calls.at(-1)!;
      expect(result.status).toBe('completed');
      expect(call.timeoutMs).toBeUndefined();
      expect(call.args).toContain(current.model);
      if (harness === 'claude') expect(call.args).toEqual(expect.arrayContaining(['--allowedTools', 'Read,Write,Edit,Glob,Grep,Bash', '--effort', 'medium']));
      if (harness === 'codex') expect(call.args).toEqual(expect.arrayContaining(['--sandbox', 'workspace-write', '-c', 'model_reasoning_effort="medium"']));
      if (harness === 'hermes') {
        expect(call.args).toEqual(expect.arrayContaining(['--toolsets', 'code_execution', '--reasoning', 'medium']));
        expect(call.args).not.toContain('--run-budget');
        expect(call.args).not.toContain('--max-turns');
      }
    }
  });

  it('stops an active process and records interruption rather than false completion', async () => {
    const root = temp();
    const runId = 'run-stop';
    const runner = new ObservedRunner(join(root, '.mozare', 'runtime', 'runs', runId), true);
    const adapter = new HarnessAdapter('codex', 'codex', runner);
    const coordinator = new HarnessCoordinator({ codex: adapter, claude: adapter, hermes: adapter }, new WorkLedger(join(root, 'ledger')));
    const active = coordinator.begin('codex', mission(root, 'codex', runId));
    for (let index = 0; index < 20 && !coordinator.stop(runId); index += 1) await new Promise((resolve) => setTimeout(resolve, 5));
    const result = await active.completion;
    expect(result.record.status).toBe('interrupted');
    expect(result.record.remaining).toEqual(['Continue safely.']);
  });

  it('rejects a run directory outside the registered project before process spawn', () => {
    const root = temp();
    const outside = temp();
    const adapter = new HarnessAdapter('claude', 'claude', new ObservedRunner(outside));
    const input = mission(root, 'claude', 'run-escape') as HarnessMission;
    input.runDirectory = outside;
    expect(() => adapter.prepare(input)).toThrow(/inside the registered workspace/i);
  });

  it('refuses an uncompiled or malformed context packet before process spawn', () => {
    const root = temp();
    const runner = new ObservedRunner(join(root, 'unused'));
    const adapter = new HarnessAdapter('codex', 'codex', runner);
    const input = mission(root, 'codex', 'run-bad-context');
    writeFileSync(input.contextPackRef, JSON.stringify({ raw_prompt: 'unbounded' }), 'utf8');
    expect(() => adapter.prepare(input)).toThrow(/schema-valid compiled context pack/i);
    expect(runner.calls).toHaveLength(0);
  });

  it('turns an expired provider session into an exact durable blocker', async () => {
    const root = temp();
    const runId = 'run-auth';
    const adapter = new HarnessAdapter('claude', 'claude', new ExpiredAuthRunner(join(root, 'unused')));
    const coordinator = new HarnessCoordinator({ codex: adapter, claude: adapter, hermes: adapter }, new WorkLedger(join(root, 'ledger')));
    const result = await coordinator.begin('claude', mission(root, 'claude', runId)).completion;
    expect(result.record.status).toBe('failed');
    expect(result.record.blockers).toEqual(['harness authentication is unavailable or expired']);
  });

  it('does not mistake a schema-valid partial handoff for completion', async () => {
    const root = temp();
    const runId = 'run-partial';
    const runDirectory = join(root, '.mozare', 'runtime', 'runs', runId);
    mkdirSync(runDirectory, { recursive: true });
    const adapter = new HarnessAdapter('hermes', 'hermes', new PartialHandoffRunner(runDirectory));
    const coordinator = new HarnessCoordinator({ codex: adapter, claude: adapter, hermes: adapter }, new WorkLedger(join(root, 'ledger')));
    const result = await coordinator.begin('hermes', mission(root, 'hermes', runId)).completion;
    expect(result.record.status).toBe('failed');
    expect(result.record.blockers).toEqual(['handoff reported partial']);
  });
});

describe('TEST-029: route provenance and privacy boundaries', () => {
  it('records actual selected route metadata but no prompt, transcript, raw log, or secret', async () => {
    const root = temp();
    const runId = 'run-private';
    const runner = new ObservedRunner(join(root, '.mozare', 'runtime', 'runs', runId));
    const adapter = new HarnessAdapter('claude', 'claude', runner);
    const ledgerDir = join(root, 'ledger');
    const coordinator = new HarnessCoordinator({ codex: adapter, claude: adapter, hermes: adapter }, new WorkLedger(ledgerDir));
    const result = await coordinator.begin('claude', mission(root, 'claude', runId)).completion;
    expect(result.record).toMatchObject({ model: 'claude-observed-model', effort: 'medium' });
    const durable = readFileSync(join(ledgerDir, (await import('node:fs')).readdirSync(ledgerDir)[0]), 'utf8');
    expect(durable).not.toMatch(/prompt|transcript|hidden reasoning|provider output|api_key/i);
    expect(existsSync(join(root, '.mozare', 'runtime', 'runs', runId, 'query.txt'))).toBe(true);
  });
});
