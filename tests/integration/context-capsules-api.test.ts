import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/server/app.js';
import { sha256Hex } from '../../src/core/context/hash.js';

const ROOT = process.cwd();
const capsuleSchema = JSON.parse(
  readFileSync(join(ROOT, 'CONTEXT', 'evidence-capsule.schema.json'), 'utf8'),
) as object;
const snapshotSchema = JSON.parse(
  readFileSync(join(ROOT, 'CONTEXT', 'context-snapshot.schema.json'), 'utf8'),
) as object;
const deltaSchema = JSON.parse(
  readFileSync(join(ROOT, 'CONTEXT', 'context-delta.schema.json'), 'utf8'),
) as object;

function validateWith(schema: object, instance: unknown, label: string): void {
  const ajv = new Ajv({ strict: false, allErrors: true });
  const validate = ajv.compile(schema);
  if (!validate(instance)) throw new Error(`schema-invalid ${label}: ${ajv.errorsText(validate.errors)}`);
}

const cacheDir = join(ROOT, '.mozare', 'cache', 'context', `test-api-${process.pid}-${Date.now()}`);
const apps: ReturnType<typeof buildApp>[] = [];

afterAll(() => {
  rmSync(cacheDir, { recursive: true, force: true });
});

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function startApp() {
  const app = buildApp({ contextCacheDir: cacheDir });
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

const validCapsule = {
  id: 'CAP-SRC-DOC-01',
  source_id: 'SRC-DOC-01',
  source_sha256: sha256Hex('unchanged source body'),
  parser_contract: 'v1',
  authority_metadata_hash: 'auth-1',
  schema_contract: 'schema-1',
  last_full_read_run: 'RUN-1',
  compact: 'Compact summary of the unchanged source.',
  valid: true,
};

const unchangedFingerprints = {
  source_sha256: sha256Hex('unchanged source body'),
  parser_contract: 'v1',
  authority_metadata_hash: 'auth-1',
  schema_contract: 'schema-1',
};

const projectA = {
  project_id: 'PRJ-API-1',
  authority_snapshot: 'MWB-PD-2026-09-15-r3',
  fingerprints: {
    'obj:OBJ-REVIEW': sha256Hex('review object record v1'),
    'rel:REL-1': sha256Hex('relation record v1'),
  },
};

const projectB = {
  project_id: 'PRJ-API-1',
  authority_snapshot: 'MWB-PD-2026-09-15-r3',
  fingerprints: {
    'obj:OBJ-REVIEW': sha256Hex('review object record v1'),
    'rel:REL-1': sha256Hex('relation record v2 changed'),
    'obj:OBJ-NEW': sha256Hex('brand new object'),
  },
};

describe('context capsule/snapshot/delta API (TASK-P04-04)', () => {
  it('routes a valid unchanged capsule to cache_hit (TEST-CTX-03 over HTTP, SCN-CTX-03)', async () => {
    const url = await startApp();
    const { status, body } = await postJson(url, '/api/context/capsules/check', {
      capsule: validCapsule,
      observed: unchangedFingerprints,
    });

    expect(status).toBe(200);
    const decision = body.decision as { route: string; should_reopen: boolean; reason: string | null };
    expect(decision.route).toBe('cache_hit');
    expect(decision.should_reopen).toBe(false);
    validateWith(capsuleSchema, body.capsule, 'capsule');
  });

  it('routes a hash-mutated capsule to source_level with a reopen request (TEST-CTX-03, SCN-CTX-04)', async () => {
    const url = await startApp();
    const { status, body } = await postJson(url, '/api/context/capsules/check', {
      capsule: validCapsule,
      observed: { ...unchangedFingerprints, source_sha256: sha256Hex('mutated source body') },
    });

    expect(status).toBe(200);
    const decision = body.decision as { route: string; should_reopen: boolean; reason: string; changed_fields: string[] };
    expect(decision.route).toBe('source_level');
    expect(decision.should_reopen).toBe(true);
    expect(decision.reason).toBe('source_sha256_changed');
    expect(decision.changed_fields).toContain('source_sha256');
    // The stored capsule record turns invalid with a visible reason.
    const capsule = body.capsule as { valid: boolean; invalidation_reason: string | null };
    expect(capsule.valid).toBe(false);
    expect(capsule.invalidation_reason).toContain('source_sha256');
  });

  it('refuses a first read of a genuinely new source (SCN-CTX-09 over HTTP)', async () => {
    const url = await startApp();
    const { status, body } = await postJson(url, '/api/context/capsules/check', {
      capsule: null,
      source_id: 'SRC-BRAND-NEW',
      observed: unchangedFingerprints,
    });

    expect(status).toBe(200);
    const decision = body.decision as { route: string; first_read_required: boolean; reason: string };
    expect(decision.route).toBe('source_level');
    expect(decision.first_read_required).toBe(true);
    expect(decision.reason).toBe('first_source_read_required');
  });

  it('creates snapshots and computes a schema-valid delta (TEST-CTX-04 over HTTP)', async () => {
    const url = await startApp();
    const snapA = await postJson(url, '/api/context/snapshots', projectA);
    const snapB = await postJson(url, '/api/context/snapshots', projectB);

    expect(snapA.status).toBe(200);
    expect(snapB.status).toBe(200);
    const a = snapA.body.snapshot as { id: string };
    const b = snapB.body.snapshot as { id: string };
    expect(a.id).not.toBe(b.id);
    validateWith(snapshotSchema, snapA.body.snapshot, 'snapshot');

    const deltaResp = await postJson(url, '/api/context/deltas', { from_snapshot: a.id, to_snapshot: b.id });
    expect(deltaResp.status).toBe(200);
    const delta = deltaResp.body.delta as { id: string; from_snapshot: string; to_snapshot: string; changed_refs: string[]; removed_refs: string[] };
    validateWith(deltaSchema, delta, 'delta');
    expect(delta.from_snapshot).toBe(a.id);
    expect(delta.to_snapshot).toBe(b.id);
    expect(delta.changed_refs).toEqual(expect.arrayContaining(['rel:REL-1', 'obj:OBJ-NEW']));
    expect(delta.removed_refs).toEqual([]);
  });

  it('builds a delta-first continuation packet that does not repeat unchanged history (SCN-CTX-05, ORACLE-033)', async () => {
    const url = await startApp();
    const snapA = await postJson(url, '/api/context/snapshots', projectA);
    const snapB = await postJson(url, '/api/context/snapshots', projectB);
    const a = snapA.body.snapshot as { id: string };
    const b = snapB.body.snapshot as { id: string };

    const cont = await postJson(url, '/api/context/continuation', {
      from_snapshot: a.id,
      to_snapshot: b.id,
      mission_id: 'MIS-CONT-API-01',
      unresolved: ['DEP-2: REL-1 acceptance pending'],
    });

    expect(cont.status).toBe(200);
    const packet = cont.body.packet as {
      mission_id: string;
      snapshot_id: string;
      delta_id: string;
      delta_summary: string;
      items: { ref: string }[];
      unresolved: string[];
    };
    expect(packet.mission_id).toBe('MIS-CONT-API-01');
    expect(packet.snapshot_id).toBe(b.id);
    expect(packet.delta_id).not.toBeNull();
    const refs = packet.items.map((item) => item.ref);
    expect(refs).toContain('rel:REL-1');
    expect(refs).toContain('obj:OBJ-NEW');
    expect(refs).not.toContain('obj:OBJ-REVIEW');
    expect(packet.unresolved).toEqual(['DEP-2: REL-1 acceptance pending']);
  });

  it('rejects deltas for unknown snapshot ids instead of inventing state', async () => {
    const url = await startApp();
    const { status, body } = await postJson(url, '/api/context/deltas', {
      from_snapshot: 'SNAP-DOES-NOT-EXIST',
      to_snapshot: 'SNAP-ALSO-NOT',
    });
    expect(status).toBe(404);
    expect((body as { error: string }).error).toContain('unknown snapshot');
  });
});
