import { describe, expect, it } from 'vitest';
import {
  ModelRouter,
  RouteUnavailableError,
  type ModelRouterOptions,
} from '../../src/core/context/ModelRouter.js';

/**
 * Adapter-level capability detection: no hardcoded credentials — availability
 * is derived entirely from locally configured provider options.
 */
function routerWith(overrides: Partial<ModelRouterOptions> = {}): ModelRouter {
  return new ModelRouter({ providers: {}, ...overrides });
}

describe('ModelRouter capability tiers (TASK-P04-05, SCN-TOK-01/02/03)', () => {
  it('resolves deterministic status aggregation to route NONE with zero model tokens (SCN-TOK-02, ORACLE-032)', () => {
    const router = routerWith();
    const decision = router.resolve('deterministic_status', 'aggregate accepted counts for the review surface');

    expect(decision.route).toBe('deterministic_status');
    expect(decision.tier).toBe('NONE');
    expect(decision.available).toBe(true);
    expect(decision.model_tokens).toEqual({ input: 0, output: 0 });
    // A NONE route cannot carry a provider: no model adapter may be invoked.
    expect(decision.provider).toBeNull();
  });

  it('routes cross-source synthesis to STRONG and implementation to CODING_AGENT (SCN-TOK-03)', () => {
    const router = routerWith({ providers: { STRONG: ['strong-local'], CODING_AGENT: ['codex-cli'] } });

    const synthesis = router.resolve('research_synthesis', 'synthesize theory across three wiki sources');
    const coding = router.resolve('implementation', 'implement the budget check in Budgeter.ts');

    expect(synthesis.tier).toBe('STRONG');
    expect(synthesis.available).toBe(true);
    expect(synthesis.provider).toBe('strong-local');
    expect(coding.tier).toBe('CODING_AGENT');
    expect(coding.provider).toBe('codex-cli');
  });

  it('falls LIGHT work back to STRONG when the contract declares the fallback (SCN-TOK-03)', () => {
    const router = routerWith({ providers: { STRONG: ['strong-local'] } });
    const decision = router.resolve('compact_or_classify', 'classify this bounded packet');
    expect(decision.tier).toBe('STRONG');
    expect(decision.route).toBe('compact_or_classify');
    expect(decision.escalated_from).toBe('LIGHT');
  });

  it('reports route-unavailable gracefully instead of failing (independence + availability)', () => {
    const router = routerWith({ providers: {} });
    const decision = router.resolve('qa_adjudication', 'adjudicate the candidate against oracles');
    expect(decision.tier).toBe('INDEPENDENT_STRONG');
    expect(decision.available).toBe(false);
    expect(decision.unavailable_reason).toMatch(/no configured provider/i);
    expect(decision.provider).toBeNull();
  });

  it('never hands the implementing provider to independent QA adjudication (SCN-TOK-03)', () => {
    const router = routerWith({ providers: { STRONG: ['implementer-model'] } });
    const decision = router.resolve('qa_adjudication', 'adjudicate the candidate against oracles');
    expect(decision.available).toBe(false);
    expect(decision.unavailable_reason).toMatch(/independent/i);
    expect(decision.provider).toBeNull();
  });

  it('rejects unknown role classes instead of guessing a route', () => {
    const router = routerWith();
    expect(() => router.resolve('made_up_role', 'anything')).toThrow(/unknown route role/);
  });

  it('does not select a provider for a route whose tier has no configured provider', () => {
    const router = routerWith({ providers: { LIGHT: ['light-local'] } });
    const decision = router.resolve('research_synthesis', 'synthesize research claims');
    expect(decision.tier).toBe('STRONG');
    expect(decision.available).toBe(false);
  });

  it('exposes route-unavailable as a catchable error for callers that must fail hard', () => {
    const router = routerWith({ providers: {} });
    expect(() => router.requireProvider(router.resolve('implementation', 'implement something'))).toThrow(
      RouteUnavailableError,
    );
  });
});
