import type {
  ContextItem,
  ContextPack,
  ContextPackInput,
  ExpansionHandleRecord,
  ExpansionResult,
} from '../../shared/contextTypes.js';
import {
  BudgetExceededError,
  type ContextPolicy,
  loadContextPolicy,
} from './Budgeter.js';
import { ReferenceResolver } from './ReferenceResolver.js';
import { estimateTokens, serializeCore } from './tokenEstimate.js';

/**
 * ContextCompiler (TASK-P04-03, AUTHORITY/06 §A/§D).
 *
 * Compiles mission-specific minimum-sufficient context packets. Semantics are
 * a faithful port of scripts/context_compiler.py with typed relevance
 * resolution (ReferenceResolver) instead of substring heuristics:
 * 1. deduplicate items by canonical ref (SCN-CTX-08);
 * 2. scope items to the mission profile (SCN-CTX-01/06), recording omissions;
 * 3. estimate size and compact non-critical material in deterministic order;
 * 4. escalate with an explicit reason instead of silently truncating
 *    required material when the hard budget is exceeded (TEST-CTX-05);
 * 5. resolve expansion handles in place (TEST-CTX-02) — one handle to L3
 *    without reloading the rest of the packet.
 */
export const ESCALATION_REASON = 'required context exceeds hard budget after safe compaction';

export class ContextExpansionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContextExpansionError';
  }
}

export class ContextCompiler {
  private readonly policy: ContextPolicy;
  private readonly resolver: ReferenceResolver;

  constructor(policy: ContextPolicy = loadContextPolicy(), resolver = new ReferenceResolver()) {
    this.policy = policy;
    this.resolver = resolver;
  }

  compile(input: ContextPackInput): ContextPack {
    const tier = this.policy.budgets[input.budget];
    if (!tier) {
      throw new BudgetExceededError(`unknown budget tier: ${input.budget}`);
    }

    // Deduplication keeps exactly one canonical representation per ref.
    const dedupe = this.dedupe(input.items);
    // Typed profile scoping; omitted refs are recorded, never silently dropped.
    const resolution = this.resolver.resolve(dedupe.kept, input.profile);

    const pack: ContextPack = {
      id: `CTX-${input.mission_id}`,
      mission_id: input.mission_id,
      profile: input.profile,
      budget: {
        target_tokens: tier.target_tokens,
        hard_tokens: tier.hard_tokens,
        estimated_tokens: 0,
        tier: input.budget,
      },
      authority: input.authority ?? [],
      objective: input.objective,
      snapshot_id: input.snapshot_id ?? null,
      delta_id: input.delta_id ?? null,
      items: resolution.kept.map((item) => ({ ...item })),
      expansion_handles: input.expansion_handles ?? [],
      omitted: resolution.omitted,
      escalation_reason: null,
      metrics: {
        duplicate_count: dedupe.duplicates,
        duplicate_ratio: input.items.length > 0 ? dedupe.duplicates / input.items.length : 0,
      },
    };

    // Budget accounting: estimate, compact secondary material, then escalate
    // rather than silently truncating required authority/evidence material.
    const sizeOf = (): number => estimateTokens(serializeCore(pack));
    pack.budget.estimated_tokens = sizeOf();
    if (pack.budget.estimated_tokens > tier.target_tokens) {
      this.compactForTarget(pack.items, () => {
        pack.budget.estimated_tokens = sizeOf();
        return pack.budget.estimated_tokens;
      }, tier.target_tokens);
    }
    pack.budget.estimated_tokens = sizeOf();
    if (pack.budget.estimated_tokens > tier.hard_tokens) {
      pack.escalation_reason = ESCALATION_REASON;
    }
    return pack;
  }

  /**
   * Expand exactly one allowed handle to its fuller record in place
   * (TEST-CTX-02): every other item is left byte-identical; no full-packet or
   * project reload occurs. The expansion count is observed from the packet
   * itself as the number of items now at L3.
   */
  expand(pack: ContextPack, ref: string, record: ExpansionHandleRecord): ExpansionResult {
    if (record.ref !== ref) {
      throw new ContextExpansionError('expansion record ref does not match requested handle');
    }
    if (!pack.expansion_handles.includes(ref)) {
      throw new ContextExpansionError(`ref is not an allowed expansion handle: ${ref}`);
    }
    const index = pack.items.findIndex((item) => item.ref === ref);
    if (index === -1) {
      throw new ContextExpansionError(`ref is not present in the packet items: ${ref}`);
    }

    const tokensBefore = pack.budget.estimated_tokens ?? this.sizeOf(pack);
    const fromLevel = pack.items[index].level;
    pack.items[index] = { ...record };
    pack.budget.estimated_tokens = this.sizeOf(pack);

    // Expansion growth still cannot silently exceed the hard budget.
    if (pack.budget.estimated_tokens > pack.budget.hard_tokens && !pack.escalation_reason) {
      pack.escalation_reason = ESCALATION_REASON;
    }

    return {
      pack,
      expansion: {
        ref,
        from_level: fromLevel,
        to_level: record.level,
        tokens_before: tokensBefore,
        tokens_after: pack.budget.estimated_tokens ?? this.sizeOf(pack),
        count: pack.items.filter((item) => item.level === 'L3').length,
      },
    };
  }

  private dedupe(items: readonly ContextItem[]): { kept: ContextItem[]; duplicates: number } {
    const kept: ContextItem[] = [];
    const seen = new Set<string>();
    let duplicates = 0;
    for (const item of items) {
      if (seen.has(item.ref)) {
        duplicates += 1;
        continue;
      }
      seen.add(item.ref);
      kept.push({ ...item });
    }
    return { kept, duplicates };
  }

  /**
   * Deterministic compaction per CONTEXT/context-policy.yaml compaction_order:
   * downgrade secondary L2 → L1 (short excerpt), then non-critical L1 → L0
   * (handle only). Critical items are never downgraded (ORACLE-030).
   */
  private compactForTarget(
    items: ContextItem[],
    measure: () => number,
    target: number,
  ): void {
    const overTarget = (): boolean => measure() > target;

    for (const item of [...items].reverse()) {
      if (!overTarget()) return;
      if (item.critical) continue;
      if (item.level === 'L2') {
        item.level = 'L1';
        item.text = item.text.slice(0, 120).replace(/\s+$/, '');
        measure();
      }
    }
    for (const item of [...items].reverse()) {
      if (!overTarget()) return;
      if (item.critical) continue;
      if (item.level === 'L1') {
        item.level = 'L0';
        item.text = '';
        measure();
      }
    }
  }

  private sizeOf(pack: ContextPack): number {
    return estimateTokens(serializeCore(pack));
  }
}
