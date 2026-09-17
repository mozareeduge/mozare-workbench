import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ContinuationPacket,
  ContextDelta,
  ContextSnapshot,
} from '../../shared/contextTypes.js';
import { sha256Hex, stableJson } from './hash.js';

/**
 * DeltaService (TASK-P04-04, ORACLE-033, SCN-CTX-05).
 *
 * Computes what changed between two snapshots so a continued mission can
 * reference prior state delta-first: the continuation packet contains the
 * changed refs (+ removed refs flagged as unresolved dependencies) and never
 * replays unchanged L2 project history by default.
 *
 * Delta identity is a deterministic content hash of (from, to, changed,
 * removed) — identical snapshot pairs always yield the identical delta.
 */

export const DEFAULT_DELTA_DIR = join(process.cwd(), '.mozare', 'cache', 'context', 'deltas');

export class DeltaServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeltaServiceError';
  }
}

export type ContinuationOptions = {
  mission_id: string;
  /** Unresolved dependencies that must ride along with the deltas. */
  unresolved?: string[];
};

export class DeltaService {
  private readonly dir: string;

  constructor(dir: string = DEFAULT_DELTA_DIR) {
    this.dir = dir;
  }

  /** Deterministic diff of two snapshots' fingerprints. */
  computeDelta(from: ContextSnapshot, to: ContextSnapshot): ContextDelta {
    if (!from?.id || !to?.id) throw new DeltaServiceError('computeDelta requires two snapshots');

    const changed: string[] = [];
    const removed: string[] = [];
    const fromFingerprints = from.fingerprints ?? {};
    const toFingerprints = to.fingerprints ?? {};

    for (const [ref, fingerprint] of Object.entries(toFingerprints)) {
      if (fromFingerprints[ref] !== fingerprint) changed.push(ref);
    }
    for (const ref of Object.keys(fromFingerprints)) {
      if (!(ref in toFingerprints)) removed.push(ref);
    }
    changed.sort();
    removed.sort();

    const id = `DELTA-${sha256Hex(stableJson({
      from_snapshot: from.id,
      to_snapshot: to.id,
      changed_refs: changed,
      removed_refs: removed,
    })).slice(0, 24)}`;

    return {
      id,
      from_snapshot: from.id,
      to_snapshot: to.id,
      changed_refs: changed,
      removed_refs: removed,
      summary: `${changed.length} changed, ${removed.length} removed between ${from.id} and ${to.id}`,
    };
  }

  /**
   * Build a delta-first continuation packet (TEST-CTX-04): changed refs as
   * working items, removed refs flagged as unresolved dependencies, and the
   * caller's unresolved dependencies. Unchanged history is not included.
   */
  buildContinuationPacket(
    from: ContextSnapshot,
    to: ContextSnapshot,
    options: ContinuationOptions,
  ): ContinuationPacket {
    if (!options.mission_id) throw new DeltaServiceError('continuation packet requires mission_id');
    const delta = this.computeDelta(from, to);
    this.save(delta);

    const items = [
      ...delta.changed_refs.map((ref) => ({
        ref,
        level: 'L2' as const,
        critical: true,
        text: `Changed since snapshot ${from.id}: current fingerprint differs from the recorded baseline.`,
      })),
      ...(delta.removed_refs ?? []).map((ref) => ({
        ref,
        level: 'L1' as const,
        critical: false,
        text: `Removed since snapshot ${from.id}: unresolved dependency — the record is no longer present.`,
      })),
    ];

    return {
      mission_id: options.mission_id,
      snapshot_id: to.id,
      delta_id: delta.id,
      delta_summary: delta.summary ?? '',
      items,
      unresolved: options.unresolved ?? [],
    };
  }

  save(delta: ContextDelta): void {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(join(this.dir, `${delta.id}.json`), JSON.stringify(delta, null, 2), 'utf8');
  }

  get(id: string): ContextDelta | null {
    try {
      return JSON.parse(readFileSync(join(this.dir, `${id}.json`), 'utf8')) as ContextDelta;
    } catch {
      return null;
    }
  }
}
