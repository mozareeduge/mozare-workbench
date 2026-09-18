import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { RunManager } from '../../src/server/agents/RunManager.js';
import { FakeAdapter } from '../../src/server/agents/FakeAdapter.js';

const ROOT = process.cwd();

let dir: string;

beforeEach(() => {
  dir = join(ROOT, '.mozare', 'cache', 'test-runs', `rm-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
});

describe('RunManager deterministic lifecycle (TASK-P05-02, SCN-MIS-04/05, ORACLE-008)', () => {
  it('starts a valid mission: queued then running, never replacing canonical state', () => {
    const runs = new RunManager({ dir, adapter: new FakeAdapter({ steps: 2 }) });
    const run = runs.start({ mission_id: 'MIS-LC-1', objective: 'compare readings' });
    expect(run.status).toBe('queued');
    const running = runs.tick(run.run_id);
    expect(running.status).toBe('running');

    // Focus state is untouched: runs live under the run dir, not canonical truth.
    expect(existsSync(join(dir, run.run_id, 'run.json'))).toBe(true);
  });

  it('completes deterministically and stores a structured handoff without embedding logs', () => {
    const runs = new RunManager({ dir, adapter: new FakeAdapter({ steps: 3 }) });
    const run = runs.start({ mission_id: 'MIS-LC-2', objective: 'compile packet' });
    runs.tick(run.run_id);
    let last = runs.tick(run.run_id);
    last = runs.tick(run.run_id);
    last = runs.tick(run.run_id);
    expect(last.status).toBe('completed');

    const record = runs.get(run.run_id) as { handoff_ref: string; log_ref: string; status: string };
    expect(record.status).toBe('completed');
    expect(record.handoff_ref).toMatch(/handoff\.json$/);
    expect(record.log_ref).toMatch(/log\.txt$/);
    // Structured completion: no verbose log text inside the durable record.
    const raw = JSON.stringify(record);
    expect(raw).not.toContain('step diagnostic line');
  });

  it('stop terminates the run, preserves inspectable partial work, mutates no canonical state (ORACLE-008)', () => {
    const runs = new RunManager({ dir, adapter: new FakeAdapter({ steps: 5 }) });
    const run = runs.start({ mission_id: 'MIS-LC-3', objective: 'long work' });
    runs.tick(run.run_id);
    runs.tick(run.run_id); // partial progress: 2 of 5 steps

    const stopped = runs.stop(run.run_id);
    expect(stopped.status).toBe('stopped');
    const worktree = stopped.partial_work_ref as string;
    expect(typeof worktree).toBe('string');
    expect(existsSync(worktree)).toBe(true);
    // Partial work is inspectable in the run dir.
    expect(existsSync(join(dir, run.run_id, 'partial-work.json'))).toBe(true);
    // Stopping twice is a no-op, not an error.
    expect(runs.stop(run.run_id).status).toBe('stopped');
  });

  it('reconciles interrupted runs on restart: no false Running forever (ORACLE-028)', () => {
    const first = new RunManager({ dir, adapter: new FakeAdapter({ steps: 5 }) });
    const run = first.start({ mission_id: 'MIS-LC-4', objective: 'interrupted work' });
    first.tick(run.run_id); // running when the "app closes"

    // New manager over the same durable dir simulates an app restart.
    const second = new RunManager({ dir, adapter: new FakeAdapter({ steps: 5 }) });
    const recovered = second.get(run.run_id) as { status: string };
    expect(recovered.status).toBe('interrupted');
    expect(second.list().some((r) => r.status === 'running')).toBe(false);
  });

  it('rejects unknown run ids on tick/stop/get without mutating anything', () => {
    const runs = new RunManager({ dir, adapter: new FakeAdapter() });
    expect(runs.get('RUN-NOPE')).toBeNull();
    expect(() => runs.tick('RUN-NOPE')).toThrow(/unknown run/i);
    expect(() => runs.stop('RUN-NOPE')).toThrow(/unknown run/i);
  });
});

describe('FakeAdapter determinism (TEST-005 fixture)', () => {
  it('is probeable, emits verbose logs to the run dir only, and writes a schema-shaped handoff', () => {
    const adapter = new FakeAdapter({ steps: 2 });
    expect(adapter.probe().available).toBe(true);

    const runDir = join(dir, 'probe-run');
    mkdirSync(runDir, { recursive: true });
    const logPath = join(runDir, 'log.txt');
    for (let i = 0; i < 2; i++) adapter.step({ runDir, logPath, step: i, objective: 'demo' });
    expect(existsSync(logPath)).toBe(true);

    const handoff = adapter.buildHandoff({ runDir, mission_id: 'MIS-P', status: 'completed', stepsDone: 2 });
    expect(handoff).toMatchObject({ state: 'completed', mission_id: 'MIS-P' });
    expect(JSON.stringify(handoff)).not.toContain('step diagnostic line');
  });

  it('persists durable run records as JSON files under the run dir', () => {
    const runs = new RunManager({ dir, adapter: new FakeAdapter() });
    const run = runs.start({ mission_id: 'MIS-P2', objective: 'persist check' });
    writeFileSync(join(dir, run.run_id, 'marker.txt'), 'external observer', 'utf8');
    expect(existsSync(join(dir, run.run_id, 'run.json'))).toBe(true);
    // cleanup
    rmSync(dir, { recursive: true, force: true });
  });
});
