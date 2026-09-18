/**
 * RepresentationPlanner + action registry (TASK-P05-04, SCN-GUI-01,
 * SCN-TOK-02, ORACLE-032/035).
 *
 * The representation ladder is STATIC -> DETERMINISTIC -> GENERATIVE_OPENUI.
 * Common stable states stay STATIC and call no model (ORACLE-032); DETERMINISTIC
 * composition is still local code; GENERATIVE_OPENUI is entered only on an
 * explicit user request for another representation (ORACLE-035), and its model
 * call is recorded. Adaptive generation loads exactly one bounded micro-library
 * per intent (TEST-GUI-01) through a validated action registry: unknown
 * actions are rejected with a STATIC fallback, never guessed.
 */

export type Intent = 'orient' | 'compare' | 'decide' | 'system' | 'review';

export const KNOWN_INTENTS: Intent[] = ['orient', 'compare', 'decide', 'system', 'review'];

export type Representation = 'STATIC' | 'DETERMINISTIC' | 'GENERATIVE_OPENUI';

export type RepresentationPlan = {
  intent: Intent;
  request: string;
  representation: Representation;
  /** Set when a higher rung was stepped down to this one. */
  escalated_from?: 'STATIC' | 'DETERMINISTIC';
  /** Deterministic paths call no model; GENERATIVE_OPENUI records its one call. */
  model_calls: number;
  route: 'NONE' | 'LIGHT';
  reason: string;
};

export type PlanInput = {
  intent: Intent;
  request: string;
  records: number;
  heterogeneous: boolean;
  /** The user explicitly asked for another representation (compare/map/system/decide). */
  user_requested?: boolean;
};

/** Bounded micro-library: one named component set per intent. */
export type MicroLibrary = {
  intent: Intent;
  name: string;
  components: string[];
};

const MICRO_LIBRARIES: Record<Intent, MicroLibrary> = {
  orient: { intent: 'orient', name: 'orientation-cards', components: ['StateLine', 'NextActionCard', 'EvidenceSummary', 'NeedsYou'] },
  compare: { intent: 'compare', name: 'side-by-side', components: ['ComparisonTable', 'DiffHighlight'] },
  decide: { intent: 'decide', name: 'decision-sheet', components: ['DecisionForm', 'ConsequenceList'] },
  system: { intent: 'system', name: 'system-ladder', components: ['SystemLadder', 'TechnicalTerm'] },
  review: { intent: 'review', name: 'review-queue', components: ['ReviewQueue', 'RevisionSheet'] },
};

export function selectMicroLibrary(intent: Intent): MicroLibrary {
  if (!KNOWN_INTENTS.includes(intent)) {
    throw new Error(`unknown intent: ${intent}`);
  }
  return MICRO_LIBRARIES[intent];
}

export class RepresentationPlanner {
  plan(input: PlanInput): RepresentationPlan {
    const base = { intent: input.intent, request: input.request };

    // Rung 1: STATIC — the default for every common stable state (ORACLE-035).
    if (!input.user_requested && !(input.heterogeneous && input.records > 1)) {
      return { ...base, representation: 'STATIC', model_calls: 0, route: 'NONE', reason: 'common stable state: structured render suffices' };
    }

    // Rung 2: DETERMINISTIC — local composition, still zero model calls.
    if (!input.user_requested) {
      return { ...base, representation: 'DETERMINISTIC', escalated_from: 'STATIC', model_calls: 0, route: 'NONE', reason: 'heterogeneous records need a composed layout, computable locally' };
    }

    // Rung 3: GENERATIVE_OPENUI — explicit user request only (ORACLE-035).
    return {
      ...base,
      representation: 'GENERATIVE_OPENUI',
      escalated_from: 'DETERMINISTIC',
      model_calls: 1,
      route: 'LIGHT',
      reason: 'user explicitly requested another representation',
    };
  }

  /** Unknown action never crashes the UI: it falls back to the STATIC plan. */
  fallbackForUnknownAction(_actionId: string): RepresentationPlan {
    return {
      intent: 'orient',
      request: `unknown action: ${_actionId}`,
      representation: 'STATIC',
      model_calls: 0,
      route: 'NONE',
      reason: 'unknown action rejected; static fallback rendered',
    };
  }
}

/** Registry-backed semantic action. */
export type SemanticAction = {
  id: string;
  intent: Intent;
};

const registry = new Map<string, SemanticAction>();

function seed(action: SemanticAction): void {
  registry.set(action.id, action);
}

seed({ id: 'orient.next_action', intent: 'orient' });
seed({ id: 'orient.evidence_summary', intent: 'orient' });
seed({ id: 'compare.side_by_side', intent: 'compare' });
seed({ id: 'decide.sheet', intent: 'decide' });
seed({ id: 'system.ladder', intent: 'system' });
seed({ id: 'review.queue', intent: 'review' });
// The one sanctioned state route: stage a proposal for human review
// (ORACLE-037 — generated UI never mutates canonical truth directly).
seed({ id: 'create_proposal', intent: 'review' });

export const ACTION_REGISTRY: Map<string, SemanticAction> = registry;

export function registerAction(action: SemanticAction): void {
  if (!action.id || typeof action.id !== 'string') {
    throw new Error('invalid action: id required');
  }
  if (!KNOWN_INTENTS.includes(action.intent)) {
    throw new Error(`unknown intent: ${action.intent}`);
  }
  if (registry.has(action.id)) {
    throw new Error(`duplicate action id: ${action.id}`);
  }
  registry.set(action.id, action);
}

export function resolveAction(id: string): SemanticAction | null {
  return registry.get(id) ?? null;
}
