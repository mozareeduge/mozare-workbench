import { randomUUID } from 'node:crypto';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import YAML from 'yaml';
import { type CanonicalRelation, canonicalHash, loadWorkspace } from '../workspace.js';
import { isProposalStale, type RelationConnectProposal } from './RelationProposal.js';

/**
 * Node-only module (uses node:fs/node:crypto via ../workspace.js). Must never be
 * imported by src/web/* — see TECH/STATE_AND_API_CONTRACTS.md's atomicity rule and
 * the repo-wide gotcha in TASK-P03-01's handoff: importing this from the browser
 * bundle would pull node:fs into Vite's client build.
 */

export type ApplyRelationConnectProposalResult =
  | {
      outcome: 'applied';
      relationId: string;
      priorCanonicalHash: string;
      newCanonicalHash: string;
    }
  | {
      outcome: 'stale';
      expectedBaseHash: string;
      actualBaseHash: string;
      message: string;
    }
  | {
      outcome: 'rolled_back';
      priorCanonicalHash: string;
      restoredCanonicalHash: string;
      attemptedRelationFile: string;
      error: string;
    };

export type ApplyRelationConnectProposalOptions = {
  /**
   * The canonical ID assigned to the new relation record. Defaults to a fresh
   * random ID. Overriding this is a normal parameter of "which ID does the new
   * relation get" (not a test-only failure hook) — tests use it to reproduce a
   * genuine post-write validation failure by assigning an ID that already exists
   * in canonical state, which loadWorkspace()'s existing duplicate-ID guard
   * rejects on re-validation (see TEST-008).
   */
  relationId?: string;
};

/**
 * Transactional acceptance of a RelationConnectProposal into canonical truth.
 *
 * 1. Stale check (optimistic concurrency): if the current canonical hash no
 *    longer matches the proposal's base, returns `stale` immediately with NO
 *    filesystem write of any kind (SCN-X-01: no partial apply on the stale path).
 * 2. Fresh: stages a new `relations/<id>.yaml` file (this proposal type only ever
 *    adds a relation, never overwrites an existing canonical file) and then
 *    re-validates the whole workspace via loadWorkspace().
 * 3. If re-validation fails, the staged file is removed (rollback is bounded to
 *    "delete what we just wrote" because nothing existing was overwritten) and a
 *    truthful recovery receipt is returned, with the canonical hash confirmed
 *    restored to its pre-apply value.
 */
export function applyRelationConnectProposal(
  workspaceRoot: string,
  proposal: RelationConnectProposal,
  options: ApplyRelationConnectProposalOptions = {},
): ApplyRelationConnectProposalResult {
  const root = resolve(workspaceRoot);
  const before = loadWorkspace(root);
  const beforeHash = canonicalHash(before);

  if (isProposalStale(proposal, beforeHash)) {
    return {
      outcome: 'stale',
      expectedBaseHash: proposal.baseCanonicalHash,
      actualBaseHash: beforeHash,
      message: `canonical workspace changed since this proposal was created (expected base ${proposal.baseCanonicalHash}, current base ${beforeHash}); re-evaluate or rebase the proposal before it can be accepted`,
    };
  }

  const relationId = options.relationId ?? `rel_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
  const relationFile = join(root, 'relations', `${relationId}.yaml`);
  const record: CanonicalRelation = {
    id: relationId,
    project_id: proposal.projectId,
    participants: [...proposal.participantIds],
    relation_type: null,
    classification_state: proposal.classification ?? 'unsettled',
    evidence_state: 'candidate',
    use_status: 'exploratory',
    claimability: 'blocked',
    origin: { kind: 'relation_connect_proposal' },
    descriptors: proposal.descriptor ? [proposal.descriptor, `proposal:${proposal.id}`] : [`proposal:${proposal.id}`],
  };

  try {
    writeFileSync(relationFile, YAML.stringify(record), 'utf8');
    const after = loadWorkspace(root); // re-validates the staged workspace, including duplicate-ID/schema checks
    return { outcome: 'applied', relationId, priorCanonicalHash: beforeHash, newCanonicalHash: canonicalHash(after) };
  } catch (error) {
    if (existsSync(relationFile)) rmSync(relationFile);
    const restored = loadWorkspace(root);
    const restoredHash = canonicalHash(restored);
    return {
      outcome: 'rolled_back',
      priorCanonicalHash: beforeHash,
      restoredCanonicalHash: restoredHash,
      attemptedRelationFile: relationFile,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
