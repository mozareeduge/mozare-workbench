export type RelationConnectProposal = {
  id: string;
  projectId: string;
  kind: 'relation_connect';
  status: 'pending_review';
  participantIds: [string, string];
  descriptor: string | null;
  classification: string | null;
  createdAt: string;
  /**
   * Optimistic-concurrency base: the canonicalHash() of the WorkspaceSnapshot this
   * proposal was proposed against (see src/core/workspace.ts). Acceptance compares
   * this against the current canonical hash; a mismatch means the base drifted and
   * the proposal is STALE (TECH/STATE_AND_API_CONTRACTS.md "Optimistic concurrency").
   * This module stays browser-safe (no node:fs/node:crypto import) by requiring the
   * caller to compute and pass the hash rather than computing it here.
   */
  baseCanonicalHash: string;
};

export type CreateRelationConnectProposalInput = {
  projectId: string;
  participantIds: [string, string];
  descriptor?: string | null;
  classification?: string | null;
  baseCanonicalHash: string;
};

/**
 * The only outcome of connecting two Field nodes. This never returns or writes a
 * CanonicalRelation: accepting a proposal into canonical truth is TASK-P03-01's
 * separate transactional apply, not this function.
 */
export function createRelationConnectProposal(input: CreateRelationConnectProposalInput, id = crypto.randomUUID()): RelationConnectProposal {
  const [a, b] = input.participantIds;
  if (!a || !b || a === b) throw new Error('a relation-connect proposal requires two distinct participants');
  if (!input.baseCanonicalHash) throw new Error('a relation-connect proposal requires the canonical base hash it was proposed against');
  return {
    id,
    projectId: input.projectId,
    kind: 'relation_connect',
    status: 'pending_review',
    participantIds: [a, b],
    descriptor: input.descriptor?.trim() || null,
    classification: input.classification?.trim() || null,
    createdAt: new Date().toISOString(),
    baseCanonicalHash: input.baseCanonicalHash,
  };
}

/**
 * Pure optimistic-concurrency check shared by the transactional apply (Node/fs
 * layer) and any browser-safe UI that wants to reflect the same STALE decision
 * without importing workspace.ts (which pulls in node:fs/node:crypto and must
 * never be reachable from src/web/*, see TASK-P03-01 handoff notes).
 */
export function isProposalStale(proposal: Pick<RelationConnectProposal, 'baseCanonicalHash'>, currentCanonicalHash: string): boolean {
  return proposal.baseCanonicalHash !== currentCanonicalHash;
}
