import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  CapsuleFingerprints,
  CapsuleLookupResult,
  CapsuleValidityField,
  EvidenceCapsule,
} from '../../shared/contextTypes.js';
import { CAPSULE_VALIDITY_FIELDS, CAPSULE_REOPEN_TRIGGERS } from '../../shared/contextTypes.js';
import { sha256Hex, stableJson } from './hash.js';

/**
 * CapsuleStore (TASK-P04-04, AUTHORITY/06 §C, CONTEXT/context-policy.yaml).
 *
 * Caches previously fully read source material as evidence capsules bound to
 * content checksums/fingerprints. A capsule is only ever an accelerator:
 * - a valid unchanged capsule yields a `cache_hit` (SCN-CTX-03, ORACLE-031);
 * - any changed validity field (source_sha256, parser_contract,
 *   authority_metadata_hash, schema_contract) invalidates it and the judgment
 *   is routed back to source-level material with a reopen request (SCN-CTX-04);
 * - any policy reopen trigger invalidates it for the affected judgment;
 * - a genuinely new source has no capsule shortcut: the first read is
 *   required at source level before a reusable capsule may exist
 *   (SCN-CTX-09, `first_source_read_required: true`).
 *
 * The store itself stays pure: lookup returns decisions and derived records;
 * persistence is explicit via save/get under the derived cache
 * (`.mozare/cache/context/capsules/` by default).
 */

export const DEFAULT_CAPSULE_DIR = join(process.cwd(), '.mozare', 'cache', 'context', 'capsules');

/** Per-policy-field invalidation reason labels, in policy order. */
const FIELD_REASONS: Record<CapsuleValidityField, string> = {
  source_sha256: 'source_sha256_changed',
  parser_contract: 'parser_contract_changed',
  authority_metadata_hash: 'authority_metadata_changed',
  schema_contract: 'schema_contract_changed',
};

export type CapsuleLookupOptions = {
  /** Policy reopen triggers observed for this judgment (each invalidates). */
  triggers?: string[];
};

export class CapsuleStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CapsuleStoreError';
  }
}

/**
 * Build a schema-valid capsule from a fingerprint record. `id`/`valid` are
 * derived when absent; unknown fields are rejected (binding schema has
 * additionalProperties: false).
 */
export function createCapsule(input: Partial<EvidenceCapsule> & Pick<EvidenceCapsule, 'source_id' | 'source_sha256' | 'parser_contract' | 'authority_metadata_hash' | 'schema_contract' | 'last_full_read_run' | 'compact'>): EvidenceCapsule {
  return {
    id: input.id ?? `CAP-${input.source_id}`,
    source_id: input.source_id,
    source_sha256: input.source_sha256,
    parser_contract: input.parser_contract,
    authority_metadata_hash: input.authority_metadata_hash,
    schema_contract: input.schema_contract,
    last_full_read_run: input.last_full_read_run,
    compact: input.compact,
    ...(input.claim_refs !== undefined ? { claim_refs: input.claim_refs } : {}),
    ...(input.excerpt_refs !== undefined ? { excerpt_refs: input.excerpt_refs } : {}),
    valid: input.valid ?? true,
    ...(input.confidence !== undefined ? { confidence: input.confidence } : {}),
    invalidation_reason: input.invalidation_reason ?? null,
  };
}

/** Return an invalidated copy with a visible, explicit reason. */
export function invalidateCapsule(capsule: EvidenceCapsule, reason: string): EvidenceCapsule {
  return { ...capsule, valid: false, invalidation_reason: reason };
}

export class CapsuleStore {
  private readonly dir: string | null;

  constructor(dir: string = DEFAULT_CAPSULE_DIR) {
    this.dir = dir;
  }

  /**
   * Route a judgment that needs a source: reuse the capsule only when every
   * validity dimension matches and no reopen trigger fires.
   */
  lookup(
    capsule: EvidenceCapsule,
    observed: CapsuleFingerprints,
    options: CapsuleLookupOptions = {},
  ): CapsuleLookupResult {
    if (!capsule.valid) {
      const record = capsule.invalidation_reason
        ? capsule
        : invalidateCapsule(capsule, 'capsule_invalidated');
      return {
        route: 'source_level',
        should_reopen: true,
        reason: 'capsule_invalidated',
        changed_fields: [],
        first_read_required: false,
        capsule: record,
      };
    }

    const changed = CAPSULE_VALIDITY_FIELDS.filter((field) => capsule[field] !== observed[field]);
    if (changed.length > 0) {
      const first = changed[0];
      return {
        route: 'source_level',
        should_reopen: true,
        reason: FIELD_REASONS[first],
        changed_fields: changed,
        first_read_required: false,
        capsule: invalidateCapsule(capsule, `${FIELD_REASONS[first]}: ${changed.join(', ')}`),
      };
    }

    const trigger = options.triggers?.find((t) => (CAPSULE_REOPEN_TRIGGERS as readonly string[]).includes(t));
    if (trigger) {
      return {
        route: 'source_level',
        should_reopen: true,
        reason: `trigger.${trigger}`,
        changed_fields: [],
        first_read_required: false,
        capsule: invalidateCapsule(capsule, `trigger.${trigger}`),
      };
    }

    return {
      route: 'cache_hit',
      should_reopen: false,
      reason: null,
      changed_fields: [],
      first_read_required: false,
      capsule,
    };
  }

  /**
   * A source with no capsule cannot claim a capsule-only full read: the
   * governing source system requires the first read at source level.
   */
  routeNewSource(sourceId: string): CapsuleLookupResult {
    if (!sourceId) throw new CapsuleStoreError('routeNewSource requires a source_id');
    return {
      route: 'source_level',
      should_reopen: true,
      reason: 'first_source_read_required',
      changed_fields: [],
      first_read_required: true,
      capsule: null,
    };
  }

  /** Explicit invalidation with a recorded reason (validity reason visible). */
  invalidate(capsule: EvidenceCapsule, reason: string): EvidenceCapsule {
    return invalidateCapsule(capsule, reason);
  }

  /** Persist a capsule record under the derived cache dir. */
  save(capsule: EvidenceCapsule): void {
    if (!this.dir) return;
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(this.capsulePath(capsule.source_id), JSON.stringify(capsule, null, 2), 'utf8');
  }

  /** Load a previously persisted capsule by source id (null when absent). */
  get(sourceId: string): EvidenceCapsule | null {
    if (!this.dir) return null;
    try {
      return JSON.parse(readFileSync(this.capsulePath(sourceId), 'utf8')) as EvidenceCapsule;
    } catch {
      return null;
    }
  }

  private capsulePath(sourceId: string): string {
    return join(this.dir ?? '.', `${sha256Hex(stableJson(sourceId)).slice(0, 24)}.json`);
  }
}
