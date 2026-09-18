import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

/**
 * ModelRoutingPolicy (TASK-P04-05).
 * Binding contract: CONTEXT/model-routing.yaml. Routes and tiers are loaded
 * from that file — never hardcoded here. Unknown role classes are rejected
 * instead of guessed (ORACLE-032/SCN-TOK-03).
 */

export const MODEL_ROUTING_PATH = join(process.cwd(), 'CONTEXT', 'model-routing.yaml');

export type RoutingTier = 'NONE' | 'LIGHT' | 'STRONG' | 'CODING_AGENT' | 'INDEPENDENT_STRONG';

export type ModelRoute = {
  tier: RoutingTier;
  max_context_policy?: string;
  context_profile?: string;
  fallback?: string;
  output?: string;
  quality_gate?: string;
  independence_required?: boolean;
  /** Example role names that resolve to this route (contract `examples:`). */
  examples?: string[];
};

export type ModelRouting = {
  version: number;
  routes: Record<string, ModelRoute>;
  profiles: Record<string, unknown>;
};

export function loadModelRouting(path: string = MODEL_ROUTING_PATH): ModelRouting {
  const parsed = YAML.parse(readFileSync(path, 'utf8')) as ModelRouting;
  if (parsed.version !== 1 || typeof parsed.routes !== 'object' || parsed.routes === null) {
    throw new Error(`invalid model routing contract: ${path}`);
  }
  return parsed;
}

export function tierForRole(role: string, policy: ModelRouting = loadModelRouting()): RoutingTier {
  const direct = policy.routes[role];
  if (direct) return direct.tier;
  // Contract `examples:` names resolve to their parent route's tier.
  for (const route of Object.values(policy.routes)) {
    if (route.examples?.includes(role)) return route.tier;
  }
  throw new Error(`unknown route role: ${role}`);
}
