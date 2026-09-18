import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/server/app.js';

const ROOT = process.cwd();
const metricsSchema = JSON.parse(
  readFileSync(join(ROOT, 'CONTEXT', 'token-metrics.schema.json'), 'utf8'),
) as object;
const SECRET = 'sk-integration-secret-fixture-31a9';

const telemetryDir = join(ROOT, '.mozare', 'cache', 'telemetry', `test-api-${process.pid}-${Date.now()}`);
const apps: ReturnType<typeof buildApp>[] = [];

afterAll(() => {
  rmSync(telemetryDir, { recursive: true, force: true });
});

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function startApp() {
  const app = buildApp({ telemetryDir });
  apps.push(app);
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function postJson(url: string, path: string, body: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(`${url}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

function validateMetrics(instance: unknown): void {
  const ajv = new Ajv({ strict: false, allErrors: true });
  const validate = ajv.compile(metricsSchema);
  if (!validate(instance)) throw new Error(`schema-invalid metrics: ${ajv.errorsText(validate.errors)}`);
}

describe('model routing API (TASK-P04-05, SCN-TOK-02/03 over HTTP)', () => {
  it('resolves a deterministic status request to route NONE with zero model tokens (ORACLE-032)', async () => {
    const url = await startApp();
    const { status, body } = await postJson(url, '/api/model/route', {
      role: 'deterministic_status',
      task: 'aggregate accepted counts',
    });

    expect(status).toBe(200);
    const decision = body.decision as { route: string; tier: string; available: boolean; provider: string | null };
    expect(decision.tier).toBe('NONE');
    expect(decision.route).toBe('deterministic_status');
    expect(decision.available).toBe(true);
    expect(decision.provider).toBeNull();
    const modelTokens = body.model_tokens as { input: number; output: number };
    expect(modelTokens).toEqual({ input: 0, output: 0 });
  });

  it('escalates synthesis to STRONG and returns route-unavailable gracefully when unconfigured (SCN-TOK-03)', async () => {
    const url = await startApp();
    const { status, body } = await postJson(url, '/api/model/route', {
      role: 'research_synthesis',
      task: 'synthesize cross-source theory',
    });

    expect(status).toBe(200);
    const decision = body.decision as { tier: string; available: boolean; unavailable_reason: string | null };
    expect(decision.tier).toBe('STRONG');
    // No providers are configured in the test app: the route is unavailable but
    // the server must not fail startup or 500 — it reports unavailability.
    expect(decision.available).toBe(false);
    expect(decision.unavailable_reason).toMatch(/no configured provider/i);
  });

  it('rejects unknown role classes with a 400 instead of guessing', async () => {
    const url = await startApp();
    const { status, body } = await postJson(url, '/api/model/route', {
      role: 'made_up_role',
      task: 'nonsense',
    });
    expect(status).toBe(400);
    expect((body as { error: string }).error).toContain('unknown route role');
  });
});

describe('token telemetry API (TEST-MET-01 over HTTP, ORACLE-039)', () => {
  it('records privacy-bounded metrics and serves them back by run id', async () => {
    const url = await startApp();
    const recorded = await postJson(url, '/api/telemetry/metrics', {
      run_id: 'RUN-API-MET-1',
      route: 'compact_or_classify',
      compiled_estimate: 220,
      provider_input_tokens: 210,
      provider_output_tokens: 64,
      cache_hits: 1,
      expansions: 0,
      duplicate_ratio: 0,
      task_result: 'completed',
      qa_verdict: 'PASS',
    });

    expect(recorded.status).toBe(200);
    validateMetrics(recorded.body.record);

    const fetched = await fetch(`${url}/api/telemetry/metrics/RUN-API-MET-1`);
    expect(fetched.status).toBe(200);
    const body = (await fetched.json()) as { record: Record<string, unknown> };
    expect(body.record.run_id).toBe('RUN-API-MET-1');
    validateMetrics(body.record);
  });

  it('never stores prompt bodies, hidden reasoning or secret fixture values via the API', async () => {
    const url = await startApp();
    const rejected = await postJson(url, '/api/telemetry/metrics', {
      run_id: 'RUN-API-MET-2',
      route: 'deterministic_status',
      compiled_estimate: 5,
      cache_hits: 0,
      expansions: 0,
      duplicate_ratio: 0,
      prompt_body: 'whole verbatim prompt',
    });
    expect(rejected.status).toBe(422);

    const accepted = await postJson(url, '/api/telemetry/metrics', {
      run_id: 'RUN-API-MET-3',
      route: 'deterministic_status',
      compiled_estimate: 5,
      cache_hits: 0,
      expansions: 0,
      duplicate_ratio: 0,
      task_result: 'completed',
    });
    expect(accepted.status).toBe(200);

    const listing = await fetch(`${url}/api/telemetry/metrics`);
    const body = (await listing.json()) as { records: Record<string, unknown>[] };
    const raw = JSON.stringify(body);
    expect(raw).not.toContain('prompt_body');
    expect(raw).not.toContain('hidden_reasoning');
    expect(raw).not.toContain(SECRET);
  });

  it('links metrics to task/QA outcome (SCN-MET-01) and keeps unknown runs 404', async () => {
    const url = await startApp();
    await postJson(url, '/api/telemetry/metrics', {
      run_id: 'RUN-API-MET-4',
      route: 'implementation',
      compiled_estimate: 900,
      cache_hits: 0,
      expansions: 2,
      duplicate_ratio: 0.1,
      task_result: 'failed',
      qa_verdict: 'FAIL',
    });

    const fetched = await fetch(`${url}/api/telemetry/metrics/RUN-API-MET-4`);
    const body = (await fetched.json()) as { record: { task_result: string | null; qa_verdict: string | null } };
    expect(body.record.task_result).toBe('failed');
    expect(body.record.qa_verdict).toBe('FAIL');

    const missing = await fetch(`${url}/api/telemetry/metrics/RUN-NOPE`);
    expect(missing.status).toBe(404);
  });
});

describe('pack build carries route + metrics (ContextCompiler flow, SCN-TOK-02)', () => {
  it('compileWithRoute returns the pack plus its route decision and telemetry record', async () => {
    const url = await startApp();
    const { status, body } = await postJson(url, '/api/context/compile', {
      mission_id: 'MIS-ROUTE-API-1',
      profile: 'technical',
      budget: 'simple_mission',
      objective: 'deterministic summary',
      route_role: 'deterministic_status',
      items: [{ ref: 'obj:OBJ-1', level: 'L1', critical: false, text: 'hello' }],
    });

    expect(status).toBe(200);
    const pack = body.pack as Record<string, unknown>;
    expect(pack.mission_id).toBe('MIS-ROUTE-API-1');

    const decision = body.route as { tier: string; route: string };
    expect(decision.tier).toBe('NONE');
    expect(decision.route).toBe('deterministic_status');

    const metrics = body.metrics as Record<string, unknown>;
    validateMetrics(metrics);
    expect(metrics.route).toBe('NONE');
    expect(metrics.compiled_estimate).toBe((pack.budget as { estimated_tokens: number }).estimated_tokens);
  });
});
