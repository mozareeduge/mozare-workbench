import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Deterministic fake adapter (TASK-P05-02, TEST-005 fixture).
 *
 * Simulates an agent run step-by-step with no external process: each step
 * appends verbose diagnostics to a run-local log (never into durable
 * structured state) and reports step progress. The adapter is probeable and
 * produces a schema-shaped handoff without embedding logs.
 */

export type FakeAdapterOptions = { steps?: number };

export type StepContext = {
  runDir: string;
  logPath: string;
  step: number;
  objective: string;
};

export type FakeHandoff = {
  state: 'completed' | 'stopped' | 'interrupted';
  mission_id: string;
  steps_done: number;
  handoff_ref: string;
};

export class FakeAdapter {
  private readonly steps: number;

  constructor(options: FakeAdapterOptions = {}) {
    this.steps = options.steps ?? 1;
  }

  probe(): { available: true; adapter: 'fake' } {
    return { available: true, adapter: 'fake' };
  }

  /** One deterministic unit of work; verbose output goes to the log file only. */
  step(context: StepContext): { done: boolean; stepsDone: number } {
    mkdirSync(context.runDir, { recursive: true });
    writeFileSync(context.logPath, `step diagnostic line ${context.step}: ${context.objective}\n`, { flag: 'a' });
    const stepsDone = context.step + 1;
    return { done: stepsDone >= this.steps, stepsDone };
  }

  buildHandoff(input: { runDir: string; mission_id: string; status: 'completed' | 'stopped' | 'interrupted'; stepsDone: number }): FakeHandoff {
    const handoff: FakeHandoff = {
      state: input.status,
      mission_id: input.mission_id,
      steps_done: input.stepsDone,
      handoff_ref: join(input.runDir, 'handoff.json'),
    };
    writeFileSync(handoff.handoff_ref, JSON.stringify(handoff, null, 2), 'utf8');
    return handoff;
  }
}
