import { describe, expect, it } from 'vitest';
import { createRelationConnectProposal, isProposalStale } from '../../src/core/proposals/RelationProposal.js';
import { buildApp } from '../../src/server/app.js';
import * as workspace from '../../src/core/workspace.js';

describe('TEST-003: relation proposal connect mode', () => {
  it('creates a pending relation-connect proposal shaped nothing like a canonical relation', () => {
    const proposal = createRelationConnectProposal({ projectId: 'p', participantIds: ['a', 'b'], descriptor: 'supports', classification: 'evidential', baseCanonicalHash: 'hash-1' });
    expect(proposal.kind).toBe('relation_connect');
    expect(proposal.status).toBe('pending_review');
    expect(proposal.participantIds).toEqual(['a', 'b']);
    expect(proposal.descriptor).toBe('supports');
    expect(proposal.baseCanonicalHash).toBe('hash-1');
    expect(proposal).not.toHaveProperty('relation_type');
    expect(proposal).not.toHaveProperty('classification_state');
  });

  it('treats blank descriptor/classification as absent', () => {
    const proposal = createRelationConnectProposal({ projectId: 'p', participantIds: ['a', 'b'], descriptor: '  ', classification: undefined, baseCanonicalHash: 'hash-1' });
    expect(proposal.descriptor).toBeNull();
    expect(proposal.classification).toBeNull();
  });

  it('rejects connecting a node to itself', () => {
    expect(() => createRelationConnectProposal({ projectId: 'p', participantIds: ['a', 'a'], baseCanonicalHash: 'hash-1' })).toThrow();
  });

  it('rejects a proposal created without a base canonical hash (runtime guard for non-TS callers)', () => {
    expect(() => createRelationConnectProposal({ projectId: 'p', participantIds: ['a', 'b'], baseCanonicalHash: '' })).toThrow();
  });

  it('negative control: exposes no direct canonical relation write function', () => {
    const exported = Object.keys(workspace);
    expect(exported.some((name) => /^(create|write|add|save)relation/i.test(name))).toBe(false);
  });

  it('negative control: exposes no server route for direct canonical relation mutation', async () => {
    const app = buildApp();
    await app.ready();
    const response = await app.inject({ method: 'POST', url: '/api/relations', payload: { participants: ['a', 'b'] } });
    expect(response.statusCode).toBe(404);
    await app.close();
  });
});

describe('TEST-007 support: isProposalStale (ORACLE-011 pure predicate)', () => {
  it('is not stale when the current canonical hash matches the proposal base', () => {
    const proposal = createRelationConnectProposal({ projectId: 'p', participantIds: ['a', 'b'], baseCanonicalHash: 'hash-1' });
    expect(isProposalStale(proposal, 'hash-1')).toBe(false);
  });

  it('is stale once the current canonical hash drifts from the proposal base', () => {
    const proposal = createRelationConnectProposal({ projectId: 'p', participantIds: ['a', 'b'], baseCanonicalHash: 'hash-1' });
    expect(isProposalStale(proposal, 'hash-2')).toBe(true);
  });
});
