import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  TelemetryPrivacyError,
  TokenTelemetry,
  classifyEfficiency,
  telemetryFromPack,
} from '../../src/core/context/TokenTelemetry.js';
import { ContextCompiler } from '../../src/core/context/ContextCompiler.js';
import type { ContextPack } from '../../src/shared/contextTypes.js';

const ROOT = process.cwd();
const metricsSchema = JSON.parse(
  readFileSync(join(ROOT, 'CONTEXT', 'token-metrics.schema.json'), 'utf8'),
) as object;

function validateMetrics(instance: unknown, label = 'token metrics'): void {
  const ajv = new Ajv({ strict: false, allErrors: true });
  const validate = ajv.compile(metricsSchema);
  if (!validate(instance)) {
    throw new Error(`schema-invalid ${label}: ${ajv.errorsText(validate.errors)}`);
  }
}

const SECRET = 'sk-super-secret-fixture-value-9f2c';

/** Representative compiled pack build (ContextCompiler flow, TASK-P04-03). */
function compilePack(): ContextPack {
  const compiler = new ContextCompiler();
  return compiler.compile({
    mission_id: 'MIS-MET-01',
    profile: 'technical',
    budget: 'simple_mission',
    objective: 'summarize route decision deterministically',
    items: [
      { ref: 'obj:OBJ-1', level: 'L2', critical: false, text: 'working record text' },
      { ref: 'obj:OBJ-1', level: 'L1', critical: false, text: 'duplicate ref entry' },
      { ref: 'dec:DEC-9', level: 'L1', critical: true, text: 'accepted decision to keep' },
    ],
  });
}

let telemetry: TokenTelemetry;
let dir: string;

beforeEach(() => {
  dir = join(ROOT, '.mozare', 'cache', 'telemetry', `test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  telemetry = new TokenTelemetry({ dir });
});

describe('TokenTelemetry privacy bounds (TEST-MET-01, SCN-MET-01, ORACLE-039)', () => {
  it('records schema-valid metrics with numeric/token/route ids after a representative run', () => {
    const record = telemetry.record({
      run_id: 'RUN-MET-01',
      route: 'deterministic_status',
      compiled_estimate: 42,
      cache_hits: 1,
      expansions: 0,
      duplicate_ratio: 0.5,
      task_result: 'completed',
      qa_verdict: 'PASS',
    });

    expect(record.run_id).toBe('RUN-MET-01');
    expect(record.route).toBe('deterministic_status');
    validateMetrics(record);
  });

  it('persists metrics locally without ever writing prompt bodies, hidden reasoning or secrets', () => {
    telemetry.record({
      run_id: 'RUN-MET-02',
      route: 'compact_or_classify',
      compiled_estimate: 120,
      provider_input_tokens: 118,
      provider_output_tokens: 30,
      cache_hits: 2,
      expansions: 1,
      duplicate_ratio: 0,
      task_result: 'completed',
    });

    const files = telemetry.list();
    expect(files.length).toBe(1);
    const raw = readFileSync(join(dir, files[0]), 'utf8');
    expect(raw).toContain('RUN-MET-02');
    expect(raw).toContain('compact_or_classify');
    expect(raw).not.toContain('prompt_body');
    expect(raw).not.toContain('reasoning');
    expect(raw).not.toContain(SECRET);
  });

  it('rejects prompt bodies, hidden reasoning and secret-like fields outright (no silent storage)', () => {
    expect(() =>
      telemetry.record({
        run_id: 'RUN-MET-03',
        route: 'deterministic_status',
        compiled_estimate: 10,
        cache_hits: 0,
        expansions: 0,
        duplicate_ratio: 0,
        prompt_body: 'the full verbatim prompt text would live here',
      } as never),
    ).toThrow(TelemetryPrivacyError);

    expect(() =>
      telemetry.record({
        run_id: 'RUN-MET-04',
        route: 'deterministic_status',
        compiled_estimate: 10,
        cache_hits: 0,
        expansions: 0,
        duplicate_ratio: 0,
        hidden_reasoning: 'chain of thought',
      } as never),
    ).toThrow(TelemetryPrivacyError);

    expect(() =>
      telemetry.record({
        run_id: 'RUN-MET-05',
        route: 'deterministic_status',
        compiled_estimate: 10,
        cache_hits: 0,
        expansions: 0,
        duplicate_ratio: 0,
        api_key: SECRET,
      } as never),
    ).toThrow(TelemetryPrivacyError);
  });

  it('rejects a prompt body smuggled inside a string field (secret scanning is not enough)', () => {
    expect(() =>
      telemetry.record({
        run_id: 'RUN-MET-06',
        route: 'deterministic_status',
        compiled_estimate: 10,
        cache_hits: 0,
        expansions: 0,
        duplicate_ratio: 0,
        task_result: `${SECRET} leaked into a string field`,
      }),
    ).toThrow(TelemetryPrivacyError);
  });

  it('derives privacy-bounded metrics directly from a compiled pack build', () => {
    const pack = compilePack();
    const record = telemetryFromPack('RUN-PACK-1', 'NONE', pack, { cache_hits: 3 });
    validateMetrics(record);
    expect(record.compiled_estimate).toBe(pack.budget.estimated_tokens);
    expect(record.duplicate_ratio).toBeCloseTo(pack.metrics.duplicate_ratio, 5);
    expect(record.cache_hits).toBe(3);
    expect(record.task_result).toBeNull();
    expect(record.qa_verdict).toBeNull();
  });
});

describe('Efficiency quality gate (TEST-MET-02, SCN-MET-02, ORACLE-040)', () => {
  const baseline = { tokens: 5000, critical_outcome: 'pass', unresolved_expansions: 0, failed_tasks: 0 };

  it('accepts lower tokens only when the critical outcome does not regress', () => {
    const verdict = classifyEfficiency(baseline, { tokens: 1800, critical_outcome: 'pass', unresolved_expansions: 0, failed_tasks: 0 });
    expect(verdict).toBe('optimization');
  });

  it('classifies lower tokens with a worse critical outcome as regression, not optimization', () => {
    const verdict = classifyEfficiency(baseline, { tokens: 1200, critical_outcome: 'fail', unresolved_expansions: 0, failed_tasks: 0 });
    expect(verdict).toBe('regression');
    expect(verdict).not.toBe('optimization');
  });

  it('classifies regressions in expansions/failed tasks as regression even when tokens drop', () => {
    const expansions = classifyEfficiency(baseline, { tokens: 900, critical_outcome: 'pass', unresolved_expansions: 4, failed_tasks: 0 });
    const failures = classifyEfficiency(baseline, { tokens: 900, critical_outcome: 'pass', unresolved_expansions: 0, failed_tasks: 2 });
    expect(expansions).toBe('regression');
    expect(failures).toBe('regression');
  });

  it('does not claim an optimization when tokens increase', () => {
    const verdict = classifyEfficiency(baseline, { tokens: 6000, critical_outcome: 'pass', unresolved_expansions: 0, failed_tasks: 0 });
    expect(verdict).toBe('no_gain');
  });
});

describe('Pack-flow integration: pack builds carry their route/metrics', () => {
  it('records a NONE-route metric with zero model tokens for a deterministic pack build (SCN-TOK-02)', () => {
    const pack = compilePack();
    const record = telemetryFromPack('RUN-NONE-1', 'NONE', pack);
    expect(record.route).toBe('NONE');
    expect(record.provider_input_tokens).toBeNull();
    expect(record.provider_output_tokens).toBeNull();
    expect((record as { model_tokens?: unknown }).model_tokens).toBeUndefined();
    validateMetrics(record);
  });

  it('survives a full record→persist→reload round trip through the store', () => {
    const pack = compilePack();
    const record = telemetryFromPack('RUN-RT-1', 'NONE', pack, { task_result: 'completed', qa_verdict: 'PASS' });
    telemetry.record(record);
    const reloaded = new TokenTelemetry({ dir });
    const loaded = reloaded.get('RUN-RT-1');
    expect(loaded).not.toBeNull();
    expect(loaded?.run_id).toBe('RUN-RT-1');
    expect(loaded?.qa_verdict).toBe('PASS');
    rmSync(dir, { recursive: true, force: true });
  });
});
