import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ContextSnapshot, SnapshotInput } from '../../shared/contextTypes.js';
import { sha256Hex, stableJson } from './hash.js';

/**
 * SnapshotService (TASK-P04-04, TECH/ARCHITECTURE "Required services").
 *
 * Records what a pack/state was built from: project/object/repo fingerprints
 * plus the governing authority snapshot identity. Snapshot identity is a
 * deterministic content hash — two services observing identical state produce
 * the identical snapshot id, so continuation is reproducible (TEST-CTX-04).
 *
 * Snapshots are derived cache material (`.mozare/cache/context/snapshots/`);
 * deleting them must be safe and canonical truth stays untouched.
 */

export const DEFAULT_SNAPSHOT_DIR = join(process.cwd(), '.mozare', 'cache', 'context', 'snapshots');

export class SnapshotServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotServiceError';
  }
}

export class SnapshotService {
  private readonly dir: string;

  constructor(dir: string = DEFAULT_SNAPSHOT_DIR) {
    this.dir = dir;
  }

  /** Create (and persist) a deterministic snapshot for the given fingerprints. */
  createSnapshot(input: SnapshotInput): ContextSnapshot {
    if (!input.project_id) throw new SnapshotServiceError('snapshot requires project_id');
    if (!input.fingerprints || Object.keys(input.fingerprints).length === 0) {
      throw new SnapshotServiceError('snapshot requires at least one fingerprint');
    }

    const id = `SNAP-${sha256Hex(stableJson({
      project_id: input.project_id,
      authority_snapshot: input.authority_snapshot,
      fingerprints: input.fingerprints,
    })).slice(0, 24)}`;

    const snapshot: ContextSnapshot = {
      id,
      project_id: input.project_id,
      created_at: new Date().toISOString(),
      authority_snapshot: input.authority_snapshot,
      fingerprints: Object.fromEntries(Object.entries(input.fingerprints).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
    };
    this.save(snapshot);
    return snapshot;
  }

  save(snapshot: ContextSnapshot): void {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(join(this.dir, `${snapshot.id}.json`), JSON.stringify(snapshot, null, 2), 'utf8');
  }

  get(id: string): ContextSnapshot | null {
    try {
      return JSON.parse(readFileSync(join(this.dir, `${id}.json`), 'utf8')) as ContextSnapshot;
    } catch {
      return null;
    }
  }
}
