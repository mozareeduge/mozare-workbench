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

/**
 * Evidence capsule contracts (TASK-P04-04). Binding shapes live in
 * CONTEXT/evidence-capsule.schema.json (additionalProperties: false) and
 * CONTEXT/context-policy.yaml (validity fields + reopen triggers).
 */
export const CAPSULE_VALIDITY_FIELDS = [
  'source_sha256',
  'parser_contract',
  'authority_metadata_hash',
  'schema_contract',
] as const;
export type CapsuleValidityField = (typeof CAPSULE_VALIDITY_FIELDS)[number];

export const CAPSULE_REOPEN_TRIGGERS = [
  'new_intake_mentions_or_contradicts',
  'relation_traversal',
  'authority_or_version_change',
  'parser_or_extraction_fidelity_change',
  'systemic_or_architectural_claim',
  'incomplete_low_confidence_or_stale',
  'explicit_full_or_source_level',
] as const;
export type CapsuleReopenTrigger = (typeof CAPSULE_REOPEN_TRIGGERS)[number];

export type EvidenceCapsule = {
  id: string;
  source_id: string;
  source_sha256: string;
  parser_contract: string;
  authority_metadata_hash: string;
  schema_contract: string;
  last_full_read_run: string;
  compact: string;
  claim_refs?: string[];
  excerpt_refs?: string[];
  valid: boolean;
  confidence?: number;
  invalidation_reason?: string | null;
};

/** Observed fingerprint set for a source, compared against a capsule. */
export type CapsuleFingerprints = {
  source_sha256: string;
  parser_contract: string;
  authority_metadata_hash: string;
  schema_contract: string;
};

export type CapsuleRoute = 'cache_hit' | 'source_level';

/** Route decision for a judgment that needs a source (ORACLE-031). */
export type CapsuleRouteDecision = {
  route: CapsuleRoute;
  should_reopen: boolean;
  reason: string | null;
  changed_fields: CapsuleValidityField[];
  first_read_required: boolean;
};

export type CapsuleLookupResult = CapsuleRouteDecision & { capsule: EvidenceCapsule | null };

/** Binding shape of CONTEXT/context-snapshot.schema.json. */
export type ContextSnapshot = {
  id: string;
  project_id: string;
  created_at: string;
  authority_snapshot: string;
  fingerprints: Record<string, string>;
};

export type SnapshotInput = {
  project_id: string;
  authority_snapshot: string;
  fingerprints: Record<string, string>;
};

/** Binding shape of CONTEXT/context-delta.schema.json. */
export type ContextDelta = {
  id: string;
  from_snapshot: string;
  to_snapshot: string;
  changed_refs: string[];
  removed_refs?: string[];
  summary?: string;
};

/**
 * Delta-first continuation packet (TEST-CTX-04, SCN-CTX-05): only changed
 * refs and unresolved dependencies — unchanged L2 history is not replayed.
 * This is deliberately NOT a ContextPack (that schema forbids extra fields).
 */
export type ContinuationPacket = {
  mission_id: string;
  snapshot_id: string;
  delta_id: string;
  delta_summary: string;
  items: Array<{
    ref: string;
    level: ContextLevel;
    critical: boolean;
    text: string;
  }>;
  unresolved: string[];
};
