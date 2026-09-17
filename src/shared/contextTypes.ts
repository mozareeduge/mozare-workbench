/**
 * Shared context/representation contracts (TASK-P04-03).
 * Binding wire shapes live in CONTEXT/*.schema.json; these types mirror
 * context-pack.schema.json and must stay compatible with it.
 */

export const CONTEXT_PROFILES = ['research', 'maker', 'technical', 'qa', 'ui'] as const;
export type ContextProfile = (typeof CONTEXT_PROFILES)[number];

export const CONTEXT_LEVELS = ['L0', 'L1', 'L2', 'L3'] as const;
export type ContextLevel = (typeof CONTEXT_LEVELS)[number];

/** One resolvable context record. Extra typed metadata (profiles/layer) is allowed. */
export type ContextItem = {
  ref: string;
  level: ContextLevel;
  critical: boolean;
  text: string;
  source_hash?: string | null;
  /** Typed relevance: when present, the item only compiles into these profiles. */
  profiles?: ContextProfile[];
  /** Typed layer tag; `history`-like layers are out of scope for mission packets. */
  layer?: string;
};

export type ContextPackInput = {
  mission_id: string;
  profile: ContextProfile;
  /** Budget tier key from CONTEXT/context-policy.yaml. */
  budget: string;
  objective: string;
  authority?: string[];
  items: ContextItem[];
  expansion_handles?: string[];
  snapshot_id?: string | null;
  delta_id?: string | null;
};

export type ContextPackBudget = {
  target_tokens: number;
  hard_tokens: number;
  estimated_tokens?: number;
  tier?: string;
};

export type ContextPackMetrics = {
  duplicate_count: number;
  duplicate_ratio: number;
};

/** Exact shape of CONTEXT/context-pack.schema.json (additionalProperties: false). */
export type ContextPack = {
  id: string;
  mission_id: string;
  profile: ContextProfile;
  budget: ContextPackBudget;
  authority: string[];
  objective: string;
  snapshot_id?: string | null;
  delta_id?: string | null;
  items: ContextItem[];
  expansion_handles: string[];
  omitted?: string[];
  escalation_reason?: string | null;
  metrics: ContextPackMetrics;
};

export type ExpansionHandleRecord = {
  ref: string;
  level: ContextLevel;
  critical: boolean;
  text: string;
  source_hash?: string | null;
};

export type ExpansionOutcome = {
  ref: string;
  from_level: ContextLevel;
  to_level: ContextLevel;
  tokens_before: number;
  tokens_after: number;
  /** Number of L3 items now present in the pack (observed, derivable expansion count). */
  count: number;
};

export type ExpansionResult = {
  pack: ContextPack;
  expansion: ExpansionOutcome;
};
