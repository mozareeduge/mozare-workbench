import { describe, expect, it } from 'vitest';
import {
  RepresentationPlanner,
  selectMicroLibrary,
  ACTION_REGISTRY,
  registerAction,
  resolveAction,
  KNOWN_INTENTS,
  type Intent,
} from '../../src/core/representation/RepresentationPlanner.js';

/**
 * TASK-P05-04, TEST-GUI-01/TEST-TOK-01, SCN-GUI-01, SCN-TOK-02,
 * ORACLE-032/035. RED phase: modules do not exist yet.
 */
describe('RepresentationPlanner ladder (ORACLE-035, SCN-GUI-01)', () => {
  const planner = new RepresentationPlanner();

  it('plans STATIC for common stable states — OpenUI is not the default', () => {
    const plan = planner.plan({ intent: 'orient', request: 'show current state', records: 1, heterogeneous: false });
    expect(plan.representation).toBe('STATIC');
    expect(plan.escalated_from).toBeUndefined();
    expect(plan.model_calls).toBe(0);
    expect(plan.route).toBe('NONE');
  });

  it('plans DETERMINISTIC only when heterogeneous records need composed layout', () => {
    const plan = planner.plan({ intent: 'review', request: 'show pending items', records: 12, heterogeneous: true });
    expect(plan.representation).toBe('DETERMINISTIC');
    expect(plan.escalated_from).toBe('STATIC');
    expect(plan.model_calls).toBe(0);
  });

  it('plans GENERATIVE_OPENUI only on explicit user request for another representation', () => {
    const explicit = planner.plan({ intent: 'compare', request: 'compare these two mappings as a map', records: 2, heterogeneous: true, user_requested: true });
    expect(explicit.representation).toBe('GENERATIVE_OPENUI');
    expect(explicit.escalated_from).toBe('DETERMINISTIC');
    // Even generative composition is one bounded model call at most, recorded.
    expect(explicit.model_calls).toBeLessThanOrEqual(1);
  });

  it('never plans GENERATIVE_OPENUI for ordinary states without explicit request', () => {
    const plan = planner.plan({ intent: 'orient', request: 'aggregate accepted counts', records: 40, heterogeneous: true, user_requested: false });
    expect(plan.representation).not.toBe('GENERATIVE_OPENUI');
    expect(plan.model_calls).toBe(0);
  });
});

describe('Micro-library selection (TEST-GUI-01)', () => {
  it('selects exactly one bounded library per intent with no unrelated components', () => {
    for (const intent of KNOWN_INTENTS) {
      const lib = selectMicroLibrary(intent);
      expect(lib.intent).toBe(intent);
      expect(lib.components.length).toBeGreaterThan(0);
      expect(lib.components.length).toBeLessThanOrEqual(6);
    }
    const orient = selectMicroLibrary('orient');
    const compare = selectMicroLibrary('compare');
    expect(orient.name).not.toBe(compare.name);
    for (const c of orient.components) expect(compare.components).not.toContain(c);
  });

  it('throws for an unknown intent instead of loading everything', () => {
    const bogus = 'made_up_intent' as unknown as Intent;
    expect(() => selectMicroLibrary(bogus)).toThrow(/unknown intent/i);
  });
});

describe('Action registry (validated compositions, unknown = reject + fallback)', () => {
  it('resolves registered actions and rejects unknown ones with a static fallback', () => {
    expect(ACTION_REGISTRY.size).toBeGreaterThan(0);
    const action = resolveAction('orient.next_action');
    expect(action).not.toBeNull();
    expect(action?.intent).toBe('orient');

    const unknown = resolveAction('orient.does_not_exist');
    expect(unknown).toBeNull();
    // Unknown action falls back to the STATIC plan, never a crash.
    const planner = new RepresentationPlanner();
    const fallback = planner.fallbackForUnknownAction('orient.does_not_exist');
    expect(fallback.representation).toBe('STATIC');
  });

  it('rejects registering duplicate action ids or invalid shapes', () => {
    expect(() => registerAction({ id: 'orient.next_action', intent: 'orient' })).toThrow(/duplicate/i);
    expect(() => registerAction({ id: '', intent: 'orient' })).toThrow(/invalid action/i);
    const bogus = { id: 'x.y', intent: 'made_up_intent' } as unknown as { id: string; intent: Intent };
    expect(() => registerAction(bogus)).toThrow(/unknown intent/i);
  });
});
