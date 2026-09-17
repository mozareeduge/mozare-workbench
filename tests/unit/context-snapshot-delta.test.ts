import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { SnapshotService } from '../../src/core/context/SnapshotService.js';
import { DeltaService } from '../../src/core/context/DeltaService.js';
import { sha256Hex } from '../../src/core/context/hash.js';

const ROOT = process.cwd();
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

const projectA = {
  project_id: 'PRJ-1',
  authority_snapshot: 'MWB-PD-2026-09-15-r3',
  fingerprints: {
    'obj:OBJ-REVIEW': sha256Hex('review object record v1'),
    'rel:REL-1': sha256Hex('relation record v1'),
    'dec:DEC-014': sha256Hex('decision record v1'),
  },
};

const projectB = {
  project_id: 'PRJ-1',
  authority_snapshot: 'MWB-PD-2026-09-15-r3',
  fingerprints: {
    // OBJ-REVIEW unchanged; REL-1 changed; DEC-014 removed; OBJ-NEW added.
    'obj:OBJ-REVIEW': sha256Hex('review object record v1'),
    'rel:REL-1': sha256Hex('relation record v2 changed'),
    'obj:OBJ-NEW': sha256Hex('brand new object'),
  },
};

describe('SnapshotService (TEST-CTX-04)', () => {
  it('creates a deterministic, reproducible snapshot for unchanged state', () => {
    const dir = join(ROOT, '.mozare', 'cache', 'context', `test-snap-${process.pid}-${Date.now()}`);
    const service = new SnapshotService(dir);
    const a1 = service.createSnapshot(projectA);
    const a2 = new SnapshotService(dir).createSnapshot(projectA);

    expect(a1.id).toBe(a2.id);
    expect(a1.project_id).toBe('PRJ-1');
    expect(a1.authority_snapshot).toBe('MWB-PD-2026-09-15-r3');
    validateWith(snapshotSchema, a1, 'snapshot');
    rmSync(dir, { recursive: true, force: true });
  });

  it('produces a different snapshot id when any fingerprint changes', () => {
    const dir = join(ROOT, '.mozare', 'cache', 'context', `test-snap2-${process.pid}-${Date.now()}`);
    const service = new SnapshotService(dir);
    const a = service.createSnapshot(projectA);
    const b = service.createSnapshot(projectB);
    expect(a.id).not.toBe(b.id);
    rmSync(dir, { recursive: true, force: true });
  });

  it('persists and reloads snapshots', () => {
    const dir = join(ROOT, '.mozare', 'cache', 'context', `test-snap3-${process.pid}-${Date.now()}`);
    const service = new SnapshotService(dir);
    const a = service.createSnapshot(projectA);
    const reloaded = new SnapshotService(dir).get(a.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.fingerprints).toEqual(a.fingerprints);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('DeltaService (TEST-CTX-04, ORACLE-033, SCN-CTX-05)', () => {
  const dir = join(ROOT, '.mozare', 'cache', 'context', `test-delta-${process.pid}-${Date.now()}`);
  const snapshots = new SnapshotService(dir);
  const a = snapshots.createSnapshot(projectA);
  const b = snapshots.createSnapshot(projectB);
  const deltas = new DeltaService(dir);

  it('computes changed and removed refs between snapshot A and B', () => {
    const delta = deltas.computeDelta(a, b);
    validateWith(deltaSchema, delta, 'delta');

    expect(delta.from_snapshot).toBe(a.id);
    expect(delta.to_snapshot).toBe(b.id);
    expect(delta.changed_refs).toEqual(expect.arrayContaining(['rel:REL-1', 'obj:OBJ-NEW']));
    expect(delta.changed_refs).not.toContain('obj:OBJ-REVIEW');
    expect(delta.removed_refs).toEqual(expect.arrayContaining(['dec:DEC-014']));
  });

  it('is deterministic: same snapshots yield the same delta', () => {
    const delta1 = deltas.computeDelta(a, b);
    const delta2 = new DeltaService(dir).computeDelta(a, b);
    expect(delta1).toEqual(delta2);
  });

  it('yields an empty delta for identical snapshots', () => {
    const delta = deltas.computeDelta(a, a);
    expect(delta.changed_refs).toEqual([]);
    expect(delta.removed_refs).toEqual([]);
    expect(delta.summary).toContain('0 changed');
  });

  it('builds a delta-first continuation packet without repeating unchanged L2 history (SCN-CTX-05)', () => {
    const delta = deltas.computeDelta(a, b);
    const packet = deltas.buildContinuationPacket(a, b, {
      mission_id: 'MIS-CONT-01',
      unresolved: ['DEP-1: pending acceptance for REL-1'],
    });

    expect(packet.mission_id).toBe('MIS-CONT-01');
    expect(packet.snapshot_id).toBe(b.id);
    expect(packet.delta_id).toBe(delta.id);
    // Only changed refs appear as working items — unchanged history is not replayed.
    const refs = packet.items.map((item) => item.ref);
    expect(refs).toContain('rel:REL-1');
    expect(refs).toContain('obj:OBJ-NEW');
    expect(refs).toContain('dec:DEC-014'); // removed ref is flagged as unresolved dependency
    expect(refs).not.toContain('obj:OBJ-REVIEW');
    // Unresolved dependencies ride along in the packet.
    expect(packet.unresolved).toEqual(['DEP-1: pending acceptance for REL-1']);
    // The packet is delta-first: a marker states what it was built from.
    expect(packet.delta_summary).toBe(delta.summary);
  });

  it('persists and reloads deltas', () => {
    const delta = deltas.computeDelta(a, b);
    const reloaded = new DeltaService(dir).get(delta.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.changed_refs).toEqual(delta.changed_refs);
    rmSync(dir, { recursive: true, force: true });
  });
});
