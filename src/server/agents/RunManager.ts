import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { FakeAdapter } from './FakeAdapter.js';

export { FakeAdapter };

export type RunStatus = 'queued' | 'running' | 'completed' | 'stopped' | 'interrupted';

export type RunRecord = {
  run_id: string;
  mission_id: string;
  objective: string;
  status: RunStatus;
  adapter: 'fake';
  steps_done: number;
  steps_total: number;
  handoff_ref: string | null;
  log_ref: string | null;
  partial_work_ref: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * RunManager (TASK-P05-02, SCN-MIS-04/05, SCN-LOC-03, ORACLE-008/028).
 *
 * Owns durable run state under a run directory (never canonical project
 * truth): queued -> running -> completed, with stop preserving inspectable
 * partial work and restart reconciling interrupted runs to a truthful status
 * (no false Running forever).
 */
export class RunManager {
  private readonly dir: string;
  private readonly adapter: FakeAdapter;

  constructor(options: { dir: string; adapter: FakeAdapter }) {
    this.dir = options.dir;
    this.adapter = options.adapter;
    this.reconcileInterrupted();
  }

  /**
   * SCN-LOC-03 / ORACLE-028: a freshly constructed manager owns no live
   * worker, so any durable queued/running record is interrupted. Reconciled
   * once at startup — never left as a false perpetual Running.
   */
  private reconcileInterrupted(): void {
    for (const record of this.list()) {
      if (record.status === 'running' || record.status === 'queued') {
        const reconciled: RunRecord = {
          ...record,
          status: 'interrupted',
          updated_at: new Date().toISOString(),
        };
        this.adapter.buildHandoff({
          runDir: this.runDir(record.run_id),
          mission_id: record.mission_id,
          status: 'interrupted',
          stepsDone: record.steps_done,
        });
        this.write(reconciled);
      }
    }
  }

  private runDir(runId: string): string {
    return join(this.dir, runId);
  }

  private recordPath(runId: string): string {
    return join(this.runDir(runId), 'run.json');
  }

  private write(record: RunRecord): void {
    mkdirSync(this.runDir(record.run_id), { recursive: true });
    writeFileSync(this.recordPath(record.run_id), JSON.stringify(record, null, 2), 'utf8');
  }

  private read(runId: string): RunRecord | null {
    const path = this.recordPath(runId);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8')) as RunRecord;
  }

  start(input: { mission_id: string; objective: string }): RunRecord {
    const runId = `RUN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const record: RunRecord = {
      run_id: runId,
      mission_id: input.mission_id,
      objective: input.objective,
      status: 'queued',
      adapter: 'fake',
      steps_done: 0,
      steps_total: 1,
      handoff_ref: null,
      log_ref: join(this.runDir(runId), 'log.txt'),
      partial_work_ref: null,
      created_at: now,
      updated_at: now,
    };
    this.write(record);
    return record;
  }

  /** Advance one deterministic step. Throws on unknown run ids. */
  tick(runId: string): RunRecord {
    const record = this.read(runId);
    if (!record) throw new Error(`unknown run: ${runId}`);
    if (record.status === 'completed' || record.status === 'stopped') return record;

    const next: RunRecord = {
      ...record,
      status: 'running',
      updated_at: new Date().toISOString(),
    };
    const result = this.adapter.step({
      runDir: this.runDir(runId),
      logPath: next.log_ref as string,
      step: record.steps_done,
      objective: record.objective,
    });
    next.steps_done = result.stepsDone;
    next.partial_work_ref = join(this.runDir(runId), 'partial-work.json');
    writeFileSync(next.partial_work_ref, JSON.stringify({ steps_done: result.stepsDone, objective: record.objective }, null, 2), 'utf8');

    if (result.done) {
      next.status = 'completed';
      const handoff = this.adapter.buildHandoff({
        runDir: this.runDir(runId),
        mission_id: record.mission_id,
        status: 'completed',
        stepsDone: result.stepsDone,
      });
      next.handoff_ref = handoff.handoff_ref;
    }
    this.write(next);
    return next;
  }

  /** Stop a run: terminates it and preserves inspectable partial work (ORACLE-008). */
  stop(runId: string): RunRecord {
    const record = this.read(runId);
    if (!record) throw new Error(`unknown run: ${runId}`);
    if (record.status === 'stopped') return record;

    const stopped: RunRecord = {
      ...record,
      status: 'stopped',
      partial_work_ref: record.partial_work_ref ?? join(this.runDir(runId), 'partial-work.json'),
      updated_at: new Date().toISOString(),
    };
    if (!existsSync(stopped.partial_work_ref as string)) {
      writeFileSync(stopped.partial_work_ref as string, JSON.stringify({ steps_done: record.steps_done, objective: record.objective }, null, 2), 'utf8');
    }
    this.adapter.buildHandoff({
      runDir: this.runDir(runId),
      mission_id: record.mission_id,
      status: 'stopped',
      stepsDone: record.steps_done,
    });
    this.write(stopped);
    return stopped;
  }

  get(runId: string): RunRecord | null {
    return this.read(runId);
  }

  list(): RunRecord[] {
    let entries: string[] = [];
    try {
      entries = existsSync(this.dir) ? readdirSync(this.dir) : [];
    } catch {
      entries = [];
    }
    return entries
      .filter((e) => existsSync(this.recordPath(e)))
      .map((e) => this.read(e) as RunRecord)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
}
