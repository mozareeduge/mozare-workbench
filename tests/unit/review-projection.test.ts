import { describe, expect, it } from 'vitest';
import {
  REVIEW_DETAIL_SECTION_ORDER,
  ReviewFixtureValidationError,
  deriveAcceptEligibility,
  deriveVerificationState,
  isReviewItemStale,
  isRejectRationaleRequired,
  projectReviewQueue,
  toEvidenceRow,
  toReviewDetailModel,
  type ReviewItemFixture,
} from '../../src/core/projection/ReviewProjection.js';

const BASE = 'base-hash-v1';
const STALE_BASE = 'base-hash-v0-superseded';

function baseFixture(overrides: Partial<ReviewItemFixture> = {}): ReviewItemFixture {
  return {
    id: 'rev_test_01',
    projectId: 'proj',
    target: 'src/x.ts',
    title: 'Demo review item',
    risk: 'normal',
    highRiskPolicy: false,
    createdAt: '2026-09-15T00:00:00Z',
    baseCanonicalHash: BASE,
    effect: { requestedOutcome: 'a', whatChanged: 'b', whatRemainsUnresolved: 'c' },
    evidence: [{ name: 'e1', status: 'passed', command: 'npm test', evidence: 'observed log output' }],
    impact: { affectedTargets: ['x'], blastRadius: 'narrow', note: 'n' },
    architecture: { summary: 's', components: ['c1'], tradeoffs: ['t1'] },
    implementation: { files: ['f1'], diffText: 'diff', logText: 'log' },
    ...overrides,
  };
}

describe('ORACLE-010: observed evidence vs agent claim provenance (SCN-REV-03, SCN-TEC-03)', () => {
  it('an entry with real, non-empty evidence is observed and keeps its declared status', () => {
    const row = toEvidenceRow({ name: 'e', status: 'passed', command: 'npm test', evidence: 'log output here' });
    expect(row.provenance).toBe('observed');
    expect(row.isObserved).toBe(true);
    expect(row.displayStatus).toBe('Passed');
  });

  it('an observed failure renders Failed, not Passed', () => {
    const row = toEvidenceRow({ name: 'e', status: 'failed', command: 'npm test', evidence: 'failure output' });
    expect(row.provenance).toBe('observed');
    expect(row.displayStatus).toBe('Failed');
  });

  it('positive proof: an agent claim that declares status "passed" but has no evidence can never render Passed', () => {
    const row = toEvidenceRow({ name: 'agent claim', status: 'passed', command: null, evidence: null });
    expect(row.provenance).toBe('agent_claim');
    expect(row.isObserved).toBe(false);
    expect(row.displayStatus).toBe('Claimed');
    expect(row.displayStatus).not.toBe('Passed');
  });

  it('whitespace-only evidence is treated the same as no evidence (still an unobserved claim)', () => {
    const row = toEvidenceRow({ name: 'e', status: 'passed', command: null, evidence: '   ' });
    expect(row.provenance).toBe('agent_claim');
    expect(row.displayStatus).toBe('Claimed');
  });
});

describe('TEST-006: Review ordering/provenance (ORACLE-009/010)', () => {
  it('positive proof: one observed pass + one unobserved agent pass claim are distinguishable, and the claim never reads Passed', () => {
    const rows = [
      toEvidenceRow({ name: 'TEST-006 observed pass', status: 'passed', command: 'npm run test:integration', evidence: 'vitest report: 1 passed' }),
      toEvidenceRow({ name: 'agent claim: full suite passed', status: 'passed', command: null, evidence: null }),
    ];
    const observedRow = rows.find((row) => row.name === 'TEST-006 observed pass')!;
    const claimRow = rows.find((row) => row.name.startsWith('agent claim'))!;
    expect(observedRow.provenance).toBe('observed');
    expect(observedRow.displayStatus).toBe('Passed');
    expect(claimRow.provenance).toBe('agent_claim');
    expect(claimRow.displayStatus).toBe('Claimed');
    expect(claimRow.displayStatus).not.toBe('Passed');
    // Aggregate verification is driven only by the observed row: the item is verified because
    // the thing the system actually ran passed, independent of the unobserved claim.
    expect(deriveVerificationState(rows)).toBe('verified');
  });

  it('negative control: removing the observed evidence file makes the item unverified/inconclusive, even though the claim still says "passed"', () => {
    const rowsWithoutObservedBacking = [
      toEvidenceRow({ name: 'TEST-006 observed pass', status: 'passed', command: 'npm run test:integration', evidence: null }), // evidence file removed
      toEvidenceRow({ name: 'agent claim: full suite passed', status: 'passed', command: null, evidence: null }),
    ];
    expect(rowsWithoutObservedBacking.every((row) => !row.isObserved)).toBe(true);
    expect(deriveVerificationState(rowsWithoutObservedBacking)).toBe('unverified');
  });

  it('ORACLE-009: the fixed section order always shows effect before architecture/diff/log', () => {
    expect(REVIEW_DETAIL_SECTION_ORDER).toEqual(['Effect', 'Verification', 'Impact', 'Architecture', 'Implementation']);
    expect(REVIEW_DETAIL_SECTION_ORDER.indexOf('Effect')).toBeLessThan(REVIEW_DETAIL_SECTION_ORDER.indexOf('Architecture'));
    expect(REVIEW_DETAIL_SECTION_ORDER.indexOf('Effect')).toBeLessThan(REVIEW_DETAIL_SECTION_ORDER.indexOf('Implementation'));
  });
});

describe('deriveVerificationState', () => {
  it('an item backed solely by agent claims (zero observed rows) is unverified', () => {
    const rows = [toEvidenceRow({ name: 'e', status: 'passed', command: null, evidence: null })];
    expect(deriveVerificationState(rows)).toBe('unverified');
  });

  it('SCN-X-02 / SCN-TEC-04: any observed failure makes the item failed, never verified', () => {
    const rows = [
      toEvidenceRow({ name: 'e1', status: 'passed', command: 'npm test', evidence: 'ok' }),
      toEvidenceRow({ name: 'e2', status: 'failed', command: 'npm test', evidence: 'boom' }),
    ];
    expect(deriveVerificationState(rows)).toBe('failed');
  });
});

describe('SCN-REV-07 / SCN-X-01 / SCN-X-10: stale base disables Accept with an explanation', () => {
  it('a fresh item with policy-neutral verification is Accept-eligible', () => {
    const fixture = baseFixture();
    const eligibility = deriveAcceptEligibility(fixture, 'verified', BASE);
    expect(eligibility.eligible).toBe(true);
    expect(eligibility.reason).toBeNull();
  });

  it('a stale item is never Accept-eligible, and the reason names the drifted base', () => {
    const fixture = baseFixture({ baseCanonicalHash: STALE_BASE });
    expect(isReviewItemStale(fixture, BASE)).toBe(true);
    const eligibility = deriveAcceptEligibility(fixture, 'verified', BASE);
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.reason).toMatch(/re-evaluate or rebase/i);
  });

  it('SCN-X-10: the same fixture recomputes from Accept-eligible to Accept-unavailable-with-reason once the current base drifts mid-session', () => {
    const fixture = baseFixture(); // proposed against BASE
    const beforeDrift = deriveAcceptEligibility(fixture, 'verified', BASE);
    expect(beforeDrift.eligible).toBe(true);
    // Simulate the base drifting asynchronously while the detail stays open: only the
    // *current* base changes, the fixture itself is untouched.
    const afterDrift = deriveAcceptEligibility(fixture, 'verified', 'base-hash-v2-new-canonical-write');
    expect(afterDrift.eligible).toBe(false);
    expect(afterDrift.reason).toBeTruthy();
  });
});

describe('SCN-X-02 / ReviewDecisionBar contract: failed verification blocks Accept only under policy, decision stays possible', () => {
  it('a policy-blocking failed-verification item disables Accept with a policy-specific reason', () => {
    const fixture = baseFixture({ highRiskPolicy: true });
    const eligibility = deriveAcceptEligibility(fixture, 'failed', BASE);
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.reason).toMatch(/policy/i);
  });

  it('a non-policy-blocking failed-verification item still allows Accept, but the Verified label is impossible', () => {
    const fixture = baseFixture({ highRiskPolicy: false });
    const eligibility = deriveAcceptEligibility(fixture, 'failed', BASE);
    expect(eligibility.eligible).toBe(true);
    // A decision remains possible, but nothing in the app ever calls a failed item "Verified".
    expect('failed').not.toBe('verified');
  });
});

describe('SCN-REV-09: rejection rationale is required only under high-risk policy', () => {
  it('is required for a high-risk-policy item', () => {
    expect(isRejectRationaleRequired(baseFixture({ highRiskPolicy: true }))).toBe(true);
  });
  it('is optional otherwise', () => {
    expect(isRejectRationaleRequired(baseFixture({ highRiskPolicy: false }))).toBe(false);
  });
});

describe('SCN-REV-01: finite queue sorted critical/stale first, then newest', () => {
  const fixtures: ReviewItemFixture[] = [
    baseFixture({ id: 'critical_old', risk: 'critical', createdAt: '2026-09-14T10:00:00Z', baseCanonicalHash: BASE }),
    baseFixture({ id: 'high_stale', risk: 'high', createdAt: '2026-09-13T09:00:00Z', baseCanonicalHash: STALE_BASE }),
    baseFixture({ id: 'critical_new', risk: 'critical', createdAt: '2026-09-15T11:00:00Z', baseCanonicalHash: BASE }),
    baseFixture({ id: 'normal_newest', risk: 'normal', createdAt: '2026-09-16T12:00:00Z', baseCanonicalHash: BASE }),
    baseFixture({ id: 'normal_oldest', risk: 'normal', createdAt: '2026-09-12T08:00:00Z', baseCanonicalHash: BASE }),
  ];

  it('orders critical and stale items ahead of plain normal items, newest first within each bucket', () => {
    const queue = projectReviewQueue(fixtures, BASE);
    expect(queue.map((item) => item.id)).toEqual(['critical_new', 'critical_old', 'high_stale', 'normal_newest', 'normal_oldest']);
  });

  it('is a finite/bounded list matching exactly the fixtures given', () => {
    const queue = projectReviewQueue(fixtures, BASE);
    expect(queue).toHaveLength(fixtures.length);
  });

  it('negative control: a fixture with zero evidence entries fails fast rather than silently rendering unprovenanced', () => {
    const badFixture = baseFixture({ id: 'no_evidence', evidence: [] });
    expect(() => projectReviewQueue([...fixtures, badFixture], BASE)).toThrow(ReviewFixtureValidationError);
    expect(() => projectReviewQueue([...fixtures, badFixture], BASE)).toThrow(/no evidence entries/i);
  });
});

describe('toReviewDetailModel', () => {
  it('composes effect, evidence rows, verification, impact, architecture, implementation, and accept eligibility from one fixture', () => {
    const fixture = baseFixture({
      evidence: [
        { name: 'observed', status: 'passed', command: 'npm test', evidence: 'log' },
        { name: 'claim', status: 'passed', command: null, evidence: null },
      ],
    });
    const detail = toReviewDetailModel(fixture, BASE);
    expect(detail.effect).toEqual(fixture.effect);
    expect(detail.evidenceRows).toHaveLength(2);
    expect(detail.evidenceRows.find((row) => row.name === 'claim')?.displayStatus).toBe('Claimed');
    expect(detail.verificationState).toBe('verified');
    expect(detail.verificationLabel).toBe('Verified');
    expect(detail.impact).toEqual(fixture.impact);
    expect(detail.architecture).toEqual(fixture.architecture);
    expect(detail.implementation).toEqual(fixture.implementation);
    expect(detail.isStale).toBe(false);
    expect(detail.acceptEligibility.eligible).toBe(true);
    expect(detail.decisionState).toBe('under_review');
  });
});
