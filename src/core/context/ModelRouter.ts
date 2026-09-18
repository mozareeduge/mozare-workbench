import { loadModelRouting, tierForRole, type ModelRouting, type RoutingTier } from './ModelRoutingPolicy.js';

/**
 * ModelRouter (TASK-P04-05, SCN-TOK-02/03, ORACLE-032).
 *
 * Resolves a route role to a capability-tier routing decision:
 * - deterministic roles resolve to tier NONE with zero model tokens and no
 *   provider — no model adapter may be invoked;
 * - LIGHT work falls back to STRONG when the contract declares the fallback;
 * - INDEPENDENT_STRONG (QA adjudication) never reuses an implementing
 *   provider: the tier's provider set must exclude providers configured for
 *   the implementing tier;
 * - unavailability is reported gracefully (a decision object, not a throw);
 *   callers that must fail hard use requireProvider.
 *
 * Availability is derived from locally configured provider options only — no
 * credentials, no hardcoded endpoints.
 */

export type ProviderTier = Exclude<RoutingTier, 'NONE'>;

export type ModelRouterOptions = {
  /** Configured providers per tier, e.g. { STRONG: ['strong-local'], CODING_AGENT: ['codex-cli'] }. */
  providers: Partial<Record<ProviderTier, string[]>>;
  /** Routing contract override; defaults to the binding CONTEXT/model-routing.yaml. */
  routing?: ModelRouting;
};

/** Route decision: availability, provider identity, escalation and token counters. */
export type RouteDecision = {
  route: string;
  tier: RoutingTier;
  available: boolean;
  provider: string | null;
  unavailable_reason: string | null;
  escalated_from?: 'LIGHT';
  /** Zero for deterministic routes; provider token counters attach at execution time. */
  model_tokens?: { input: number; output: number };
};

export class RouteUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RouteUnavailableError';
  }
}

/** Tier ordering used to interpret contract `fallback` fields. */
const TIER_ORDER: RoutingTier[] = ['NONE', 'LIGHT', 'STRONG', 'CODING_AGENT', 'INDEPENDENT_STRONG'];

export class ModelRouter {
  private readonly providers: Partial<Record<ProviderTier, string[]>>;
  private readonly routing: ModelRouting;

  constructor(options: ModelRouterOptions) {
    this.providers = options.providers ?? {};
    this.routing = options.routing ?? loadModelRouting();
  }

  // `task` is part of the route-decision contract (reserved for policy use);
  // arity is frozen by the router API.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resolve(role: string, _task: string): RouteDecision {
    const tier = tierForRole(role, this.routing);

    if (tier === 'NONE') {
      return {
        route: role,
        tier,
        available: true,
        provider: null,
        unavailable_reason: null,
        model_tokens: { input: 0, output: 0 },
      };
    }

    const unavailable = (reason: string): RouteDecision => ({
      route: role,
      tier,
      available: false,
      provider: null,
      unavailable_reason: reason,
    });

    if (tier === 'INDEPENDENT_STRONG') {
      // Independent QA cannot reuse the implementing run as adjudicator
      // (SCN-TOK-03): overlap with the implementing tier disqualifies a provider.
      const independent = this.providers.INDEPENDENT_STRONG ?? [];
      const implementing = this.providers.CODING_AGENT ?? [];
      const provider = independent.find((p) => !implementing.includes(p));
      if (!provider) {
        const reason = independent.some((p) => implementing.includes(p))
          ? 'no independent provider available: implementing provider cannot adjudicate (independence required)'
          : 'no configured provider for INDEPENDENT_STRONG tier';
        return unavailable(reason);
      }
      return {
        route: role,
        tier,
        available: true,
        provider,
        unavailable_reason: null,
        model_tokens: { input: 0, output: 0 },
      };
    }

    let effectiveTier: ProviderTier = tier;
    let escalatedFrom: 'LIGHT' | undefined;
    if (tier === 'LIGHT') {
      const light = this.providers.LIGHT ?? [];
      if (light.length > 0) {
        return {
          route: role,
          tier,
          available: true,
          provider: light[0],
          unavailable_reason: null,
          model_tokens: { input: 0, output: 0 },
        };
      }
      const fallbackTier = this.fallbackTierFor(role);
      if (fallbackTier) {
        effectiveTier = fallbackTier;
        escalatedFrom = 'LIGHT';
      }
    }

    const providers = this.providers[effectiveTier] ?? [];
    if (providers.length === 0) {
      return unavailable(`no configured provider for ${effectiveTier} tier`);
    }
    return {
      route: role,
      tier: effectiveTier,
      available: true,
      provider: providers[0],
      unavailable_reason: null,
      escalated_from: escalatedFrom,
      model_tokens: { input: 0, output: 0 },
    };
  }

  /** Fail-hard accessor for callers that cannot proceed without a provider. */
  requireProvider(decision: RouteDecision): string {
    if (!decision.available || decision.provider === null) {
      throw new RouteUnavailableError(decision.unavailable_reason ?? `route ${decision.route} has no provider`);
    }
    return decision.provider;
  }

  private fallbackTierFor(role: string): ProviderTier | null {
    const route = this.routing.routes[role];
    const fallback = route?.fallback;
    if (!fallback || !TIER_ORDER.includes(fallback as RoutingTier)) return null;
    return fallback as ProviderTier;
  }
}
