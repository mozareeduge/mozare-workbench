import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import type { ContextPackInput } from '../../src/shared/contextTypes.js';
import { ContextCompiler } from '../../src/core/context/ContextCompiler.js';

const ROOT = process.cwd();
const packSchema = JSON.parse(
  readFileSync(join(ROOT, 'CONTEXT', 'context-pack.schema.json'), 'utf8'),
) as object;

function validatePack(pack: unknown): void {
  const ajv = new Ajv({ strict: false, allErrors: true });
  const validate = ajv.compile(packSchema);
  if (!validate(pack)) throw new Error(`schema-invalid pack: ${ajv.errorsText(validate.errors)}`);
}

function loadDemoInput(): ContextPackInput {
  return parse(
    readFileSync(join(ROOT, 'CONTEXT', 'examples', 'mission-input.yaml'), 'utf8'),
  ) as ContextPackInput;
}

describe('ContextCompiler (TEST-CTX-01 mission relevance + budget)', () => {
  it('compiles the demo technical mission: dedup, profile scoping, policy budget', () => {
    const compiler = new ContextCompiler();
    const pack = compiler.compile(loadDemoInput());

    expect(pack.id).toBe('CTX-MIS-DEMO-01');
    expect(pack.profile).toBe('technical');
    const refs = pack.items.map((item) => item.ref);
    // Deduplication keeps exactly one canonical representation per ref (SCN-CTX-08).
    expect(refs.filter((ref) => ref === 'DEC-014')).toHaveLength(1);
    // Profile scoping drops unrelated layer material (SCN-CTX-01).
    expect(refs).not.toContain('HISTORY-long');
    // Mission-critical decision/acceptance/object material remains.
    expect(refs).toEqual(expect.arrayContaining(['DEC-014', 'SCN-RSP-04', 'OBJ-REVIEW']));
    expect(pack.metrics.duplicate_count).toBe(1);
    expect(pack.metrics.duplicate_ratio).toBeCloseTo(1 / 6, 5);
  });

  it('enforces the policy budget tier and reports a positive, non-silent estimate', () => {
    const compiler = new ContextCompiler();
    const pack = compiler.compile(loadDemoInput());

    expect(pack.budget.tier).toBe('normal_mission');
    expect(pack.budget.target_tokens).toBe(1800);
    expect(pack.budget.hard_tokens).toBe(3200);
    expect(pack.budget.estimated_tokens).toBeGreaterThan(0);
    expect(pack.budget.estimated_tokens).toBeLessThanOrEqual(pack.budget.hard_tokens);
    expect(pack.escalation_reason).toBeNull();
  });

  it('emits a pack that validates against the binding context-pack schema', () => {
    const compiler = new ContextCompiler();
    const pack = compiler.compile(loadDemoInput());

    expect(() => validatePack(pack)).not.toThrow();
  });

  it('scopes role profiles: research gets evidence neighborhoods, technical gets files/tests (SCN-CTX-06)', () => {
    const compiler = new ContextCompiler();
    const base: ContextPackInput = {
      mission_id: 'MIS-ROLE-01',
      profile: 'research',
      budget: 'simple_mission',
      objective: 'Check the claim around the review flow.',
      authority: ['MWB-PD-2026-09-15-r3'],
      items: [
        { ref: 'SRC-claim-01', level: 'L2', critical: true, text: 'Source claim neighborhood for research.', profiles: ['research'] },
        { ref: 'FILE-review', level: 'L1', critical: false, text: 'src/review/*', profiles: ['technical'] },
        { ref: 'TEST-review', level: 'L1', critical: false, text: 'tests/review/*', profiles: ['technical'] },
        { ref: 'SCN-RSP-04', level: 'L2', critical: true, text: 'Primary review actions remain reachable at mobile width.' },
        { ref: 'HISTORY-long', level: 'L2', critical: false, text: 'Historical research discussion.', layer: 'history' },
      ],
      expansion_handles: ['SRC-claim-01'],
    };
    const research = compiler.compile(base);
    const researchRefs = research.items.map((item) => item.ref);
    expect(researchRefs).toContain('SRC-claim-01');
    expect(researchRefs).not.toContain('FILE-review');
    expect(researchRefs).not.toContain('TEST-review');
    expect(researchRefs).not.toContain('HISTORY-long');

    const technical = compiler.compile({ ...base, profile: 'technical' });
    const technicalRefs = technical.items.map((item) => item.ref);
    expect(technicalRefs).toEqual(expect.arrayContaining(['FILE-review', 'TEST-review']));
    expect(technicalRefs).not.toContain('SRC-claim-01');
    // Shared objective/authority/acceptance stays for both roles (SCN-CTX-06).
    expect(technicalRefs).toContain('SCN-RSP-04');
    expect(research.objective).toBe(technical.objective);
    expect(research.authority).toEqual(technical.authority);
    // Omitted material is recorded, never silently dropped from the record.
    expect(research.omitted).toEqual(expect.arrayContaining(['FILE-review', 'TEST-review']));
  });
});

describe('ContextCompiler targeted expansion (TEST-CTX-02)', () => {
  it('expands exactly one handle to L3 without reloading the rest of the packet', () => {
    const compiler = new ContextCompiler();
    const pack = compiler.compile(loadDemoInput());
    const before = JSON.parse(JSON.stringify(pack)) as typeof pack;

    const record = {
      ref: 'DEC-014',
      level: 'L3' as const,
      critical: true,
      text: 'Full authoritative record of DEC-014 with rationale, consequences, and evidence refs.'.repeat(4),
    };
    const result = compiler.expand(pack, 'DEC-014', record);

    expect(result.expansion.ref).toBe('DEC-014');
    expect(result.expansion.from_level).toBe('L2');
    expect(result.expansion.to_level).toBe('L3');
    // Only the expanded item changed; every other item is byte-identical (no full reload).
    const otherBefore = before.items.filter((item) => item.ref !== 'DEC-014');
    const otherAfter = result.pack.items.filter((item) => item.ref !== 'DEC-014');
    expect(otherAfter).toEqual(otherBefore);
    const expanded = result.pack.items.find((item) => item.ref === 'DEC-014');
    expect(expanded?.level).toBe('L3');
    // Expansion metrics are observed, and the estimate was recomputed.
    expect(result.expansion.tokens_after).toBeGreaterThan(result.expansion.tokens_before);
    expect(result.expansion.count).toBe(1);
    expect(() => validatePack(result.pack)).not.toThrow();
  });
});

describe('ContextCompiler no silent truncation (TEST-CTX-05, ORACLE-030, SCN-CTX-07)', () => {
  it('escalates instead of returning apparently-ready truncated context when critical material exceeds hard budget', () => {
    const compiler = new ContextCompiler();
    const longCritical = 'Required authority and oracle material that cannot be compacted. '.repeat(120);
    const input: ContextPackInput = {
      mission_id: 'MIS-OVER-01',
      profile: 'technical',
      budget: 'normal_mission',
      objective: 'Escalation under budget pressure.',
      authority: ['MWB-PD-2026-09-15-r3'],
      items: [
        { ref: 'DEC-900', level: 'L2', critical: true, text: longCritical },
        { ref: 'SCN-900', level: 'L2', critical: true, text: longCritical },
        { ref: 'OBJ-900', level: 'L2', critical: true, text: longCritical },
        { ref: 'NBR-900', level: 'L2', critical: true, text: longCritical },
      ],
      expansion_handles: [],
    };
    const pack = compiler.compile(input);

    // Escalation/batch requirement is explicit; pack is not presented as ready.
    expect(pack.escalation_reason).not.toBeNull();
    expect(pack.escalation_reason).toContain('hard budget');
    expect(pack.budget.estimated_tokens).toBeGreaterThan(pack.budget.hard_tokens);
    // All critical refs remain represented — nothing was silently truncated away.
    const refs = pack.items.map((item) => item.ref);
    expect(refs).toEqual(expect.arrayContaining(['DEC-900', 'SCN-900', 'OBJ-900', 'NBR-900']));
    expect(pack.items.every((item) => item.critical === true ? item.level === 'L2' : true)).toBe(true);
    expect(() => validatePack(pack)).not.toThrow();
  });

  it('compacts non-critical secondary material before it escalates (order from policy)', () => {
    const compiler = new ContextCompiler();
    const secondary = 'Secondary theoretical background that is safe to downgrade. '.repeat(100);
    const input: ContextPackInput = {
      mission_id: 'MIS-COMPACT-01',
      profile: 'technical',
      budget: 'simple_mission',
      objective: 'Compaction under target pressure.',
      authority: ['MWB-PD-2026-09-15-r3'],
      items: [
        { ref: 'DEC-014', level: 'L2', critical: true, text: 'Responsive interaction transforms rather than hides capability.' },
        { ref: 'SECONDARY-1', level: 'L2', critical: false, text: secondary },
        { ref: 'SECONDARY-2', level: 'L1', critical: false, text: secondary },
      ],
      expansion_handles: [],
    };
    const pack = compiler.compile(input);

    const sec1 = pack.items.find((item) => item.ref === 'SECONDARY-1');
    const sec2 = pack.items.find((item) => item.ref === 'SECONDARY-2');
    expect(sec1?.level).toBe('L1');
    expect(sec2?.level).toBe('L0');
    // Critical decision material is untouched by compaction.
    const dec = pack.items.find((item) => item.ref === 'DEC-014');
    expect(dec?.level).toBe('L2');
    expect(dec?.text).toContain('transforms rather than hides');
    expect(pack.escalation_reason).toBeNull();
  });
});
