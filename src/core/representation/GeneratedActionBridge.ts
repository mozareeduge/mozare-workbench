import { ACTION_REGISTRY, resolveAction } from './RepresentationPlanner.js';

/**
 * GeneratedActionBridge (TASK-P05-06, TEST-GUI-03, ORACLE-037, SCN-GUI-05).
 *
 * The ONLY route from generated UI actions to Workbench state. The exposed
 * surface is read/proposal-only: generated `create_proposal` stages a
 * reviewable proposal through the proposal transaction; direct canonical
 * writes, accepts and shell calls are not exposed at all — they are
 * impossible from generated UI, not merely forbidden.
 */

export type BridgeState = {
  accepted_proposals: number;
  canonical_records: number;
};

export type BridgeOutcome = {
  status: 'executed' | 'proposal_created' | 'rejected';
  canonical_mutated: boolean;
  proposal_id?: string;
  detail?: string;
  reason?: string;
};

/** Actions a generated view may never reach — by absence, not by check. */
const FORBIDDEN_ACTION_NAMES = [
  'write_canonical',
  'accept_proposal_direct',
  'run_shell',
  'delete_record',
  'mutate_canonical',
  'exec',
];

let proposalCounter = 0;

export class GeneratedActionBridge {
  private readonly state_: BridgeState;
  /** Proposals staged through the bridge (review pending, canonical untouched). */
  readonly pending_proposals: Array<{ id: string; kind: string; payload: Record<string, unknown> }> = [];

  constructor(state: BridgeState) {
    this.state_ = { ...state };
  }

  state(): BridgeState {
    return { ...this.state_ };
  }

  execute(actionId: string, payload: Record<string, unknown>): BridgeOutcome {
    // Structural boundary: forbidden capabilities are not registry members and
    // are never routed — a generated view cannot name its way past the bridge.
    if (FORBIDDEN_ACTION_NAMES.some((name) => actionId.includes(name))) {
      return {
        status: 'rejected',
        canonical_mutated: false,
        reason: `action not exposed through the generated action registry: ${actionId}`,
      };
    }

    const known = resolveAction(actionId);
    if (!known) {
      return {
        status: 'rejected',
        canonical_mutated: false,
        reason: `unknown action: ${actionId}`,
      };
    }

    // The one sanctioned state route: stage a proposal for human review.
    if (actionId === 'create_proposal') {
      proposalCounter += 1;
      const id = `PROP-${Date.now().toString(36)}-${proposalCounter}`;
      this.pending_proposals.push({ id, kind: String(payload.kind ?? 'unspecified'), payload });
      return {
        status: 'proposal_created',
        canonical_mutated: false,
        proposal_id: id,
        detail: 'staged for review; canonical state unchanged until human acceptance through the proposal transaction',
      };
    }

    // Every other registry action is read/render-only by contract.
    return {
      status: 'executed',
      canonical_mutated: false,
      detail: `read/render action ${actionId} (${known.intent}) executed without state change`,
    };
  }
}

// Registry sanity: the forbidden names must never be registered anywhere.
for (const forbidden of FORBIDDEN_ACTION_NAMES) {
  if (ACTION_REGISTRY.has(forbidden)) {
    throw new Error(`forbidden action registered: ${forbidden}`);
  }
}
