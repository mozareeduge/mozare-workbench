export type RelationConnectProposal = {
  id: string;
  projectId: string;
  kind: 'relation_connect';
  status: 'pending_review';
  participantIds: [string, string];
  descriptor: string | null;
  classification: string | null;
  createdAt: string;
};

export type CreateRelationConnectProposalInput = {
  projectId: string;
  participantIds: [string, string];
  descriptor?: string | null;
  classification?: string | null;
};

/**
 * The only outcome of connecting two Field nodes. This never returns or writes a
 * CanonicalRelation: accepting a proposal into canonical truth is TASK-P03-01's
 * separate transactional apply, not this function.
 */
export function createRelationConnectProposal(input: CreateRelationConnectProposalInput, id = crypto.randomUUID()): RelationConnectProposal {
  const [a, b] = input.participantIds;
  if (!a || !b || a === b) throw new Error('a relation-connect proposal requires two distinct participants');
  return {
    id,
    projectId: input.projectId,
    kind: 'relation_connect',
    status: 'pending_review',
    participantIds: [a, b],
    descriptor: input.descriptor?.trim() || null,
    classification: input.classification?.trim() || null,
    createdAt: new Date().toISOString(),
  };
}
