import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { CapsuleStore, createCapsule } from '../../src/core/context/CapsuleStore.js';
import { sha256Hex } from '../../src/core/context/hash.js';

const ROOT = process.cwd();
const capsuleSchema = JSON.parse(
  readFileSync(join(ROOT, 'CONTEXT', 'evidence-capsule.schema.json'), 'utf8'),
) as object;

function validateCapsule(capsule: unknown): void {
  const ajv = new Ajv({ strict: false, allErrors: true });
  const validate = ajv.compile(capsuleSchema);
  if (!validate(capsule)) throw new Error(`schema-invalid capsule: ${ajv.errorsText(validate.errors)}`);
}

function baseCapsule() {
  return {
    source_id: 'SRC-DOC-01',
    source_sha256: sha256Hex('unchanged source body'),
    parser_contract: 'v1',
    authority_metadata_hash: 'auth-1',
    schema_contract: 'schema-1',
    last_full_read_run: 'RUN-1',
    compact: 'Compact L2 summary of the unchanged source body.',
    claim_refs: ['CLM-1'],
    excerpt_refs: ['EXC-1'],
  };
}

describe('CapsuleStore validity canary (TEST-CTX-03, ORACLE-031)', () => {
  it('reuses a valid capsule for an unchanged source and records a cache hit (SCN-CTX-03)', () => {
    const store = new CapsuleStore();
    const capsule = createCapsule(baseCapsule());
    validateCapsule(capsule);

    const lookup = store.lookup(capsule, {
      source_sha256: sha256Hex('unchanged source body'),
      parser_contract: 'v1',
      authority_metadata_hash: 'auth-1',
      schema_contract: 'schema-1',
    });

    expect(lookup.route).toBe('cache_hit');
    expect(lookup.reason).toBeNull();
    expect(lookup.should_reopen).toBe(false);
  });

  it('invalidates when the source hash changes and requests the source-level route', () => {
    const store = new CapsuleStore();
    const capsule = createCapsule(baseCapsule());

    const lookup = store.lookup(capsule, {
      source_sha256: sha256Hex('mutated source body'),
      parser_contract: 'v1',
      authority_metadata_hash: 'auth-1',
      schema_contract: 'schema-1',
    });

    expect(lookup.route).toBe('source_level');
    expect(lookup.should_reopen).toBe(true);
    expect(lookup.reason).toBe('source_sha256_changed');
  });

  it('invalidates when the parser contract changes', () => {
    const store = new CapsuleStore();
    const capsule = createCapsule(baseCapsule());
    const lookup = store.lookup(capsule, {
      source_sha256: sha256Hex('unchanged source body'),
      parser_contract: 'v2-extraction-fidelity-changed',
      authority_metadata_hash: 'auth-1',
      schema_contract: 'schema-1',
    });
    expect(lookup.route).toBe('source_level');
    expect(lookup.should_reopen).toBe(true);
    expect(lookup.reason).toBe('parser_contract_changed');
    expect(lookup.changed_fields).toContain('parser_contract');
  });

  it('invalidates when the authority metadata changes', () => {
    const store = new CapsuleStore();
    const capsule = createCapsule(baseCapsule());
    const lookup = store.lookup(capsule, {
      source_sha256: sha256Hex('unchanged source body'),
      parser_contract: 'v1',
      authority_metadata_hash: 'auth-2-changed',
      schema_contract: 'schema-1',
    });
    expect(lookup.route).toBe('source_level');
    expect(lookup.should_reopen).toBe(true);
    expect(lookup.reason).toBe('authority_metadata_changed');
    expect(lookup.changed_fields).toContain('authority_metadata_hash');
  });

  it('invalidates when the schema contract changes', () => {
    const store = new CapsuleStore();
    const capsule = createCapsule(baseCapsule());
    const lookup = store.lookup(capsule, {
      source_sha256: sha256Hex('unchanged source body'),
      parser_contract: 'v1',
      authority_metadata_hash: 'auth-1',
      schema_contract: 'schema-2-incompatible',
    });
    expect(lookup.route).toBe('source_level');
    expect(lookup.should_reopen).toBe(true);
    expect(lookup.reason).toBe('schema_contract_changed');
    expect(lookup.changed_fields).toContain('schema_contract');
  });

  it('invalidates when the capsule is already marked invalid', () => {
    const store = new CapsuleStore();
    const capsule = createCapsule(baseCapsule());
    const stored = store.invalidate(capsule, 'explicit_full_or_source_level');
    expect(stored.valid).toBe(false);
    expect(stored.invalidation_reason).toContain('explicit_full_or_source_level');
    validateCapsule(stored);

    const lookup = store.lookup(stored, {
      source_sha256: sha256Hex('unchanged source body'),
      parser_contract: 'v1',
      authority_metadata_hash: 'auth-1',
      schema_contract: 'schema-1',
    });
    expect(lookup.route).toBe('source_level');
    expect(lookup.should_reopen).toBe(true);
    expect(lookup.reason).toBe('capsule_invalidated');
  });

  it.each([
    ['new_intake_mentions_or_contradicts', 'trigger.new_intake_mentions_or_contradicts'],
    ['relation_traversal', 'trigger.relation_traversal'],
    ['authority_or_version_change', 'trigger.authority_or_version_change'],
    ['parser_or_extraction_fidelity_change', 'trigger.parser_or_extraction_fidelity_change'],
    ['systemic_or_architectural_claim', 'trigger.systemic_or_architectural_claim'],
    ['incomplete_low_confidence_or_stale', 'trigger.incomplete_low_confidence_or_stale'],
    ['explicit_full_or_source_level', 'trigger.explicit_full_or_source_level'],
  ])('invalidates on reopening trigger %s', (trigger) => {
    const store = new CapsuleStore();
    const capsule = createCapsule(baseCapsule());
    const lookup = store.lookup(capsule, {
      source_sha256: sha256Hex('unchanged source body'),
      parser_contract: 'v1',
      authority_metadata_hash: 'auth-1',
      schema_contract: 'schema-1',
    }, { triggers: [trigger] });

    expect(lookup.route).toBe('source_level');
    expect(lookup.should_reopen).toBe(true);
    expect(lookup.reason).toBe(`trigger.${trigger}`);
  });

  it('a genuinely new source cannot claim a capsule-only first read (SCN-CTX-09, ORACLE-031)', () => {
    const store = new CapsuleStore();
    // No capsule exists at all for this source — first read cannot be replaced.
    const firstRead = store.routeNewSource('SRC-NEW-99');
    expect(firstRead.route).toBe('source_level');
    expect(firstRead.first_read_required).toBe(true);
    expect(firstRead.reason).toBe('first_source_read_required');
  });

  it('persists capsules to the derived cache dir and reloads them (non-silent persistence)', () => {
    const capsule = createCapsule(baseCapsule());
    const dir = join(ROOT, '.mozare', 'cache', 'context', `test-capsule-${process.pid}-${Date.now()}`);
    const store = new CapsuleStore(dir);
    store.save(capsule);
    const reloaded = new CapsuleStore(dir);
    const found = reloaded.get('SRC-DOC-01');
    expect(found).not.toBeNull();
    expect(found?.source_sha256).toBe(sha256Hex('unchanged source body'));
    expect(found?.valid).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});
