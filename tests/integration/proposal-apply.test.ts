import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { canonicalHash, loadWorkspace } from '../../src/core/workspace.js';
import { createRelationConnectProposal } from '../../src/core/proposals/RelationProposal.js';
import { applyRelationConnectProposal } from '../../src/core/proposals/applyRelationConnectProposal.js';

const roots: string[] = [];
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'mozare-proposal-apply-'));
  roots.push(root);
  cpSync(join(process.cwd(), 'seed', 'example-project'), root, { recursive: true });
  return root;
}
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

describe('TEST-007: stale proposal blocks accept (ORACLE-011, SCN-REV-07, SCN-X-01)', () => {
  it('returns STALE and performs no filesystem mutation once the base canonical record drifted', () => {
    const root = fixture();
    const baseSnapshot = loadWorkspace(root);
    const baseHash = canonicalHash(baseSnapshot);
    const proposal = createRelationConnectProposal({
      projectId: baseSnapshot.project.id,
      participantIds: ['q_20260914_example01', 'src_20260914_example01'],
      descriptor: 'supports',
      classification: 'evidential',
      baseCanonicalHash: baseHash,
    });

    // Mutate the base canonical record the proposal was created against.
    const projectFile = join(root, 'PROJECT.md');
    const originalProject = readFileSync(projectFile, 'utf8');
    const mutatedProject = originalProject.replace('lifecycle: active', 'lifecycle: blocked');
    expect(mutatedProject).not.toBe(originalProject);
    writeFileSync(projectFile, mutatedProject, 'utf8');

    const driftedHash = canonicalHash(loadWorkspace(root));
    expect(driftedHash).not.toBe(baseHash);

    const relationsBefore = readdirSync(join(root, 'relations')).sort();
    const objectsBefore = readdirSync(join(root, 'objects')).sort();

    const result = applyRelationConnectProposal(root, proposal);

    expect(result.outcome).toBe('stale');
    if (result.outcome === 'stale') {
      expect(result.expectedBaseHash).toBe(baseHash);
      expect(result.actualBaseHash).toBe(driftedHash);
      expect(result.message).toMatch(/re-evaluate or rebase/i);
    }

    // No partial apply: no relation file staged/written, no other canonical file touched.
    expect(readdirSync(join(root, 'relations')).sort()).toEqual(relationsBefore);
    expect(readdirSync(join(root, 'objects')).sort()).toEqual(objectsBefore);
    expect(canonicalHash(loadWorkspace(root))).toBe(driftedHash);
  });
});

describe('TEST-008: transaction rollback on failed canonical apply (ORACLE-012, SCN-ERR-02)', () => {
  it('restores the original canonical hash and reports a truthful recovery receipt when post-write validation fails', () => {
    const root = fixture();
    const baseSnapshot = loadWorkspace(root);
    const baseHash = canonicalHash(baseSnapshot);
    const proposal = createRelationConnectProposal({
      projectId: baseSnapshot.project.id,
      participantIds: ['q_20260914_example01', 'src_20260914_example01'],
      descriptor: 'supports',
      classification: 'evidential',
      baseCanonicalHash: baseHash,
    });

    const relationsBefore = readdirSync(join(root, 'relations')).sort();

    // Force a genuine, non-contrived post-staging failure: assign the new relation
    // the ID of a canonical record that already exists (an object ID). The relation
    // file parses/validates fine on its own, gets staged/written, and only fails
    // when loadWorkspace() re-validates the whole staged workspace and hits its
    // existing duplicate-ID guard (src/core/workspace.ts) — exactly the "failure
    // after staged validation but during apply/post-apply" path TEST-008 requires.
    const collidingId = 'q_20260914_example01';
    const attemptedFile = join(root, 'relations', `${collidingId}.yaml`);

    const result = applyRelationConnectProposal(root, proposal, { relationId: collidingId });

    expect(result.outcome).toBe('rolled_back');
    if (result.outcome === 'rolled_back') {
      expect(result.priorCanonicalHash).toBe(baseHash);
      expect(result.restoredCanonicalHash).toBe(baseHash);
      expect(result.attemptedRelationFile).toBe(attemptedFile);
      expect(result.error).toMatch(/duplicate canonical id/i);
    }

    // The staged file was fully reverted: it does not exist, and the relations
    // directory is byte-for-byte back to its pre-apply listing.
    expect(existsSync(attemptedFile)).toBe(false);
    expect(readdirSync(join(root, 'relations')).sort()).toEqual(relationsBefore);
    expect(canonicalHash(loadWorkspace(root))).toBe(baseHash);
  });

  it('negative control: the same rollback assertions fail against a canary path that suppresses rollback', () => {
    const root = fixture();
    const baseSnapshot = loadWorkspace(root);
    const baseHash = canonicalHash(baseSnapshot);
    const collidingId = 'q_20260914_example01';
    const attemptedFile = join(root, 'relations', `${collidingId}.yaml`);

    // Canary: perform the exact same staged write applyRelationConnectProposal
    // performs (same ID collision, same record shape), but deliberately skip its
    // rollback step — the thing under test. This proves the assertions in the
    // "positive" test above are not vacuously true: when rollback is genuinely
    // suppressed, those same assertions throw.
    writeFileSync(
      attemptedFile,
      YAML.stringify({
        id: collidingId,
        project_id: baseSnapshot.project.id,
        participants: ['q_20260914_example01', 'src_20260914_example01'],
        relation_type: null,
        classification_state: 'evidential',
        evidence_state: 'candidate',
        use_status: 'exploratory',
        claimability: 'blocked',
        origin: { kind: 'relation_connect_proposal' },
      }),
      'utf8',
    );

    expect(() => loadWorkspace(root)).toThrow(/duplicate canonical id/i);
    expect(() => expect(existsSync(attemptedFile)).toBe(false)).toThrow();
    expect(() => expect(canonicalHash(loadWorkspace(root))).toBe(baseHash)).toThrow();

    // Manual cleanup: this test intentionally left an un-rolled-back artifact
    // behind to prove the point above; restore the fixture before it is deleted.
    rmSync(attemptedFile);
    expect(canonicalHash(loadWorkspace(root))).toBe(baseHash);
  });
});
