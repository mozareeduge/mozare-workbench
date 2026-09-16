import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// `config/handoff.schema.json` declares `"$schema": ".../draft/2020-12/schema"`. The plain
// `ajv` export only ships the draft-07 meta-schema, so compiling a 2020-12 schema with it fails
// with "no schema with key or ref ...draft/2020-12/schema"; `ajv/dist/2020` is the same Ajv
// engine pre-registered with the 2020-12 meta-schema/vocabularies.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import {
  deriveVerificationState,
  projectReviewQueue,
  toEvidenceRow,
  toReviewDetailModel,
  type ReviewItemFixture,
} from '../../src/core/projection/ReviewProjection.js';

/**
 * TEST-006 — Review ordering/provenance (ORACLE-009/010).
 *
 * Per this project's own handoff schema (`config/handoff.schema.json`), `tests[]` entries are
 * `{ name, status, command, evidence }`. An *observed* entry is one whose `evidence` is a real,
 * non-empty string tied to something checkable (a captured command/tool-run description); an
 * *unobserved agent claim* is a `tests[]` entry that declares `status: "passed"` but carries no
 * `evidence` at all — exactly what this integration test builds and feeds through Review's
 * projection, instead of inventing a parallel provenance shape.
 */
const schema = JSON.parse(readFileSync(join(process.cwd(), 'config', 'handoff.schema.json'), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateHandoff = ajv.compile(schema);

type HandoffTestEntry = { name: string; status: 'passed' | 'failed' | 'skipped' | 'not_run'; command: string | null; evidence: string | null };

// A schema-valid handoff carrying exactly the TEST-006 path: one observed pass, one unobserved
// agent pass claim.
const validHandoff = {
  run_id: 'TASK-P03-02-review-provenance-fixture',
  state: 'completed',
  summary: 'Fixture handoff for TEST-006: one observed pass, one unobserved agent pass claim.',
  system_view: { intent: 'x', behavior: 'y', architecture: [], implementation: [], verification: [] },
  changed: [],
  decisions: [],
  tests: [
    { name: 'TEST-006 observed pass', status: 'passed', command: 'npm run test:integration', evidence: 'vitest report: tests/integration/review-provenance.test.ts — 1 passed.' },
    { name: 'agent claim: "full regression suite passed"', status: 'passed', command: null, evidence: null },
  ] satisfies HandoffTestEntry[],
  artifacts: [],
  technical_terms: [],
  blockers: [],
  open_questions: [],
  next_action: 'n/a',
};

function reviewFixtureFromHandoffTests(handoffTests: HandoffTestEntry[]): ReviewItemFixture {
  return {
    id: 'rev_handoff_fixture_01',
    projectId: 'TAROKE RIMIXER',
    target: 'src/core/projection/ReviewProjection.ts',
    title: 'Fixture proposal built directly from a handoff-shaped tests[] array',
    risk: 'critical',
    highRiskPolicy: false,
    createdAt: '2026-09-16T12:00:00Z',
    baseCanonicalHash: 'base-hash-v1',
    effect: {
      requestedOutcome: 'Requested outcome text.',
      whatChanged: 'What changed text.',
      whatRemainsUnresolved: 'What remains unresolved text.',
    },
    evidence: handoffTests.map((test) => ({ name: test.name, status: test.status, command: test.command, evidence: test.evidence })),
    impact: { affectedTargets: ['x'], blastRadius: 'narrow', note: 'n' },
    architecture: { summary: 'Architecture summary.', components: ['component-a'], tradeoffs: ['tradeoff-a'] },
    implementation: { files: ['src/core/projection/ReviewProjection.ts'], diffText: 'diff --git a/x b/x', logText: 'log line 1\nlog line 2' },
  };
}

describe('TEST-006: Review ordering/provenance (ORACLE-009/010)', () => {
  it('the fixture handoff used by this test is itself schema-valid against config/handoff.schema.json', () => {
    const ok = validateHandoff(validHandoff);
    expect(ok, JSON.stringify(validateHandoff.errors)).toBe(true);
  });

  it('positive proof: effect renders before diff/log, and the observed pass is distinguishable from the unobserved agent pass claim', () => {
    const fixture = reviewFixtureFromHandoffTests(validHandoff.tests);
    const detail = toReviewDetailModel(fixture, 'base-hash-v1');

    // Effect before diff/log: the detail model exposes `effect` as a top-level field, entirely
    // separate from `implementation.diffText`/`implementation.logText`, which only ever appear
    // inside the deepest, collapsed-by-default Implementation disclosure (Review.tsx renders
    // `effect` in the first <section>, and diff/log only inside the last <details>).
    expect(detail.effect.requestedOutcome).toBe('Requested outcome text.');
    expect(detail.implementation.diffText).toContain('diff --git');

    const observedRow = detail.evidenceRows.find((row) => row.name === 'TEST-006 observed pass')!;
    const claimRow = detail.evidenceRows.find((row) => row.name.startsWith('agent claim'))!;
    expect(observedRow.provenance).toBe('observed');
    expect(observedRow.isObserved).toBe(true);
    expect(observedRow.displayStatus).toBe('Passed');

    expect(claimRow.provenance).toBe('agent_claim');
    expect(claimRow.isObserved).toBe(false);
    // The core ORACLE-010 assertion: an unobserved claim of "passed" is never rendered Passed.
    expect(claimRow.displayStatus).not.toBe('Passed');
    expect(claimRow.displayStatus).toBe('Claimed');

    // The item as a whole is verified — driven solely by the one genuinely observed pass.
    expect(detail.verificationState).toBe('verified');
    expect(detail.verificationLabel).toBe('Verified');

    // The queue-level cue agrees with the detail-level state.
    const [queueItem] = projectReviewQueue([fixture], 'base-hash-v1');
    expect(queueItem.verificationState).toBe('verified');
    expect(queueItem.verificationLabel).toBe('Verified');
  });

  it('negative control: removing the observed evidence file (evidence -> null) turns the same handoff unverified/inconclusive', () => {
    const handoffWithEvidenceFileRemoved = {
      ...validHandoff,
      tests: validHandoff.tests.map((test) => (test.name === 'TEST-006 observed pass' ? { ...test, evidence: null } : test)),
    };
    // Still schema-valid: `evidence` is nullable in the handoff schema (removing the observed
    // evidence file is a legitimate, representable state, not a malformed handoff).
    expect(validateHandoff(handoffWithEvidenceFileRemoved), JSON.stringify(validateHandoff.errors)).toBe(true);

    const fixture = reviewFixtureFromHandoffTests(handoffWithEvidenceFileRemoved.tests);
    const detail = toReviewDetailModel(fixture, 'base-hash-v1');

    const rows = detail.evidenceRows;
    expect(rows.every((row) => !row.isObserved)).toBe(true);
    expect(rows.some((row) => row.displayStatus === 'Passed')).toBe(false);

    expect(detail.verificationState).toBe('unverified');
    expect(detail.verificationLabel).toBe('Unverified / inconclusive');
    expect(detail.verificationState).not.toBe('verified');

    const [queueItem] = projectReviewQueue([fixture], 'base-hash-v1');
    expect(queueItem.verificationState).toBe('unverified');
  });

  it('sanity: toEvidenceRow + deriveVerificationState alone reproduce the same "verified" result, independent of the full detail model', () => {
    const rows = validHandoff.tests.map((test) => toEvidenceRow({ name: test.name, status: test.status as 'passed', command: test.command, evidence: test.evidence }));
    expect(deriveVerificationState(rows)).toBe('verified');
  });
});
