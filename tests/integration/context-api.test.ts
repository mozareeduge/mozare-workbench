import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import { parse } from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { buildApp } from '../../src/server/app.js';

const packSchema = JSON.parse(
  readFileSync(join(process.cwd(), 'CONTEXT', 'context-pack.schema.json'), 'utf8'),
) as object;

function validatePack(pack: unknown): void {
  const ajv = new Ajv({ strict: false, allErrors: true });
  const validate = ajv.compile(packSchema);
  if (!validate(pack)) throw new Error(`schema-invalid pack: ${ajv.errorsText(validate.errors)}`);
}

function demoInput(): Record<string, unknown> {
  return parse(
    readFileSync(join(process.cwd(), 'CONTEXT', 'examples', 'mission-input.yaml'), 'utf8'),
  ) as Record<string, unknown>;
}

describe('context compile/expand API (TASK-P04-03)', () => {
  const apps: ReturnType<typeof buildApp>[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('compiles a mission packet over loopback HTTP and returns a schema-valid pack', async () => {
    const app = buildApp();
    apps.push(app);
    await app.listen({ host: '127.0.0.1', port: 0 });
    const address = app.server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${address.port}/api/context/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(demoInput()),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { pack: unknown };
    expect(() => validatePack(body.pack)).not.toThrow();
    const pack = body.pack as { mission_id: string; metrics: { duplicate_count: number }; escalation_reason: string | null };
    expect(pack.mission_id).toBe('MIS-DEMO-01');
    expect(pack.metrics.duplicate_count).toBe(1);
    expect(pack.escalation_reason).toBeNull();
  });

  it('rejects malformed compile input instead of emitting an invalid pack', async () => {
    const app = buildApp();
    apps.push(app);
    await app.listen({ host: '127.0.0.1', port: 0 });
    const address = app.server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${address.port}/api/context/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mission_id: 'MIS-BAD', profile: 'not-a-profile' }),
    });

    expect(response.status).toBe(400);
  });

  it('expands one handle over HTTP and reports expansion metrics without reloading the packet', async () => {
    const app = buildApp();
    apps.push(app);
    await app.listen({ host: '127.0.0.1', port: 0 });
    const address = app.server.address() as AddressInfo;

    const compileResponse = await fetch(`http://127.0.0.1:${address.port}/api/context/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(demoInput()),
    });
    const { pack } = (await compileResponse.json()) as { pack: unknown };

    const expandResponse = await fetch(`http://127.0.0.1:${address.port}/api/context/expand`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pack,
        ref: 'DEC-014',
        record: {
          ref: 'DEC-014',
          level: 'L3',
          critical: true,
          text: 'Full authoritative DEC-014 record with rationale, consequences, and evidence refs.',
        },
      }),
    });

    expect(expandResponse.status).toBe(200);
    const body = (await expandResponse.json()) as {
      pack: unknown;
      expansion: { ref: string; from_level: string; to_level: string; count: number };
    };
    expect(body.expansion.ref).toBe('DEC-014');
    expect(body.expansion.to_level).toBe('L3');
    expect(body.expansion.count).toBe(1);
    expect(() => validatePack(body.pack)).not.toThrow();
  });

  it('blocks expansion of a ref that is not an allowed handle', async () => {
    const app = buildApp();
    apps.push(app);
    await app.listen({ host: '127.0.0.1', port: 0 });
    const address = app.server.address() as AddressInfo;

    const compileResponse = await fetch(`http://127.0.0.1:${address.port}/api/context/compile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(demoInput()),
    });
    const { pack } = (await compileResponse.json()) as { pack: unknown };

    const expandResponse = await fetch(`http://127.0.0.1:${address.port}/api/context/expand`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pack,
        ref: 'HISTORY-long',
        record: { ref: 'HISTORY-long', level: 'L3', critical: false, text: 'Not an allowed handle.' },
      }),
    });

    expect(expandResponse.status).toBe(409);
    const body = (await expandResponse.json()) as { error: string };
    expect(body.error).toContain('expansion handle');
  });
});
