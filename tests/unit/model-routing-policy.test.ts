import { describe, expect, it } from 'vitest';
import { loadModelRouting, tierForRole } from '../../src/core/context/ModelRoutingPolicy.js';

describe('ModelRoutingPolicy — CONTEXT/model-routing.yaml binding (TASK-P04-05)', () => {
  it('loads routes and tiers from the binding contract file', () => {
    const policy = loadModelRouting();
    expect(policy.version).toBe(1);
    expect(policy.routes.deterministic_status.tier).toBe('NONE');
    expect(policy.routes.implementation.tier).toBe('CODING_AGENT');
    expect(policy.routes.qa_adjudication.tier).toBe('INDEPENDENT_STRONG');
    expect(policy.routes.qa_adjudication.independence_required).toBe(true);
  });

  it('resolves role+task classes to routes: deterministic work never calls a model (ORACLE-032)', () => {
    expect(tierForRole('deterministic_status')).toBe('NONE');
    expect(tierForRole('cache_validation')).toBe('NONE');
    expect(tierForRole('token_counting')).toBe('NONE');
    expect(tierForRole('static_view')).toBe('NONE');
    expect(tierForRole('deterministic_composition')).toBe('NONE');
  });

  it('resolves semantic work to model tiers (SCN-TOK-03)', () => {
    expect(tierForRole('compact_or_classify')).toBe('LIGHT');
    expect(tierForRole('generative_ui')).toBe('LIGHT');
    expect(tierForRole('research_synthesis')).toBe('STRONG');
    expect(tierForRole('artistic_or_product_judgment')).toBe('STRONG');
    expect(tierForRole('architecture_decision')).toBe('STRONG');
    expect(tierForRole('implementation')).toBe('CODING_AGENT');
    expect(tierForRole('qa_adjudication')).toBe('INDEPENDENT_STRONG');
  });

  it('rejects unknown role classes instead of guessing a tier', () => {
    expect(() => tierForRole('made_up_role')).toThrow(/unknown route role/);
  });
});
