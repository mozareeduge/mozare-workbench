import { describe, expect, it } from 'vitest';
import {
  GeneratedActionBridge,
  registerAction,
} from '../../src/core/representation/GeneratedActionBridge.js';

/**
 * TEST-GUI-03 (ORACLE-037, SCN-GUI-05). RED: generated actions may create
 * reviewable proposals; direct canonical writes/accepts/shell calls are
 * impossible through the exposed registry.
 */

describe('GeneratedActionBridge proposal boundary (TEST-GUI-03, ORACLE-037)', () => {
  it('routes generated create_proposal to a reviewable, non-canonical proposal', () => {
    const bridge = new GeneratedActionBridge({ accepted_proposals: 0, canonical_records: 3 });
    const result = bridge.execute('create_proposal', {
      kind: 'relation_connect',
      payload: { from: 'obj:R1', to: 'obj:R2', descriptor: 'supports' },
    });
    expect(result.status).toBe('proposal_created');
    expect(result.canonical_mutated).toBe(false);
    expect(result.proposal_id).toMatch(/^PROP-/);
    // Canonical truth untouched; state advances only through the proposal.
    expect(bridge.state().canonical_records).toBe(3);
    expect(bridge.state().accepted_proposals).toBe(0);
  });

  it('direct canonical write/accept and shell calls are impossible: unknown to the bridge', () => {
    const bridge = new GeneratedActionBridge({ accepted_proposals: 0, canonical_records: 3 });
    for (const action of ['write_canonical', 'accept_proposal_direct', 'run_shell', 'delete_record']) {
      const result = bridge.execute(action, {});
      expect(result.status).toBe('rejected');
      expect(result.canonical_mutated).toBe(false);
      expect(result.reason).toMatch(/not exposed/i);
    }
    expect(bridge.state().canonical_records).toBe(3);
  });

  it('executes only registry-known read/render actions; unknown ids are rejected', () => {
    expect(() => registerAction({ id: 'orient.zoom_view', intent: 'orient' })).not.toThrow();
    const bridge = new GeneratedActionBridge({ accepted_proposals: 0, canonical_records: 1 });
    const read = bridge.execute('orient.zoom_view', { target: 'obj:R1' });
    expect(read.status).toBe('executed');
    expect(read.canonical_mutated).toBe(false);
    const unknown = bridge.execute('orient.made_up', {});
    expect(unknown.status).toBe('rejected');
    expect(unknown.reason).toMatch(/unknown action/i);
  });
});
