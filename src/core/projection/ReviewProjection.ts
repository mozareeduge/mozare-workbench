/**
 * Review is the finite human decision queue (SURF-REVIEW, DEC-008). This module derives a
 * bounded, fixture/demo-scoped review queue + detail model from declared proposal/evidence
 * records. It never imports `node:*` modules: it is bundled for the browser by Vite via
 * `src/web/surfaces/Review.tsx` (DEC-031a keeps real WorkspaceEngine wiring out of Phase 1).
 *
 * Evidence records use this project's own handoff shape (`config/handoff.schema.json`
 * `tests[]`: `{ name, status, command, evidence }`) as the provenance data model, rather than
 * inventing a new one: an entry only counts as **observed** when it carries a real, non-empty
 * `evidence` string tied to something checkable. An entry with no `evidence` is an **agent
 * claim** — a bare assertion the system never observed running — and can never be labeled
 * "Passed" regardless of its declared `status` (ORACLE-010, SCN-REV-03, SCN-TEC-03).
 */

import { isProposalStale } from '../proposals/RelationProposal.js';

export type ReviewRisk = 'critical' | 'high' | 'normal';

export type EvidenceStatus = 'passed' | 'failed' | 'skipped' | 'not_run';

/** Mirrors `config/handoff.schema.json`'s `tests[]` item shape exactly. */
export type EvidenceFixture = {
  name: string;
  status: EvidenceStatus;
  command: string | null;
  evidence: string | null;
};

export type EvidenceProvenance = 'observed' | 'agent_claim';

/** The only four labels an evidence row may render. `Claimed` is reserved for anything the system did not observe — it is never `Passed`, even if the fixture's declared `status` is `'passed'`. */
export type EvidenceDisplayStatus = 'Passed' | 'Failed' | 'Skipped' | 'Not run' | 'Claimed';

export type EvidenceRow = {
  name: string;
  command: string | null;
  provenance: EvidenceProvenance;
  isObserved: boolean;
  displayStatus: EvidenceDisplayStatus;
};

export type ReviewVerificationState = 'verified' | 'failed' | 'unverified';

export type ReviewEffect = {
  requestedOutcome: string;
  whatChanged: string;
  whatRemainsUnresolved: string;
};

export type ReviewImpact = {
  affectedTargets: string[];
  blastRadius: 'narrow' | 'broad';
  note: string;
};

export type ReviewArchitecture = {
  summary: string;
  components: string[];
  tradeoffs: string[];
};

export type ReviewImplementation = {
  files: string[];
  diffText: string;
  logText: string;
};

/**
 * The lifecycle vocabulary mirrors `AUTHORITY/01_OBJECT_STATE_AND_FLOW_MODEL.md`'s OBJ-PRP
 * (`SUBMITTED → UNDER_REVIEW → ACCEPTED | REVISION_REQUESTED | REJECTED`) plus OBJ-RSD
 * (`preserved`) for `preserve`. `under_review` is the initial/default state; `stale` is a
 * separate, transient, recomputed condition (see `isStale` below), never a terminal decision.
 */
export type ReviewDecisionState = 'under_review' | 'accepted' | 'revision_requested' | 'rejected' | 'preserved_as_residue';

export type ReviewItemFixture = {
  id: string;
  projectId: string;
  target: string;
  title: string;
  risk: ReviewRisk;
  /** Whether project policy requires a rejection rationale and blocks Accept on failed verification (SCN-REV-09, SCN-X-02). */
  highRiskPolicy: boolean;
  createdAt: string;
  baseCanonicalHash: string;
  effect: ReviewEffect;
  evidence: EvidenceFixture[];
  impact: ReviewImpact;
  architecture: ReviewArchitecture;
  implementation: ReviewImplementation;
  decisionState?: ReviewDecisionState;
  decisionRationale?: string | null;
  revisionNote?: string | null;
};

export type ReviewQueueItem = {
  id: string;
  title: string;
  projectId: string;
  target: string;
  risk: ReviewRisk;
  isStale: boolean;
  verificationState: ReviewVerificationState;
  verificationLabel: string;
  decisionState: ReviewDecisionState;
  createdAt: string;
};

export type AcceptEligibility = { eligible: boolean; reason: string | null };

export type ReviewDetailModel = {
  id: string;
  title: string;
  projectId: string;
  target: string;
  risk: ReviewRisk;
  highRiskPolicy: boolean;
  createdAt: string;
  baseCanonicalHash: string;
  isStale: boolean;
  effect: ReviewEffect;
  evidenceRows: EvidenceRow[];
  verificationState: ReviewVerificationState;
  verificationLabel: string;
  impact: ReviewImpact;
  architecture: ReviewArchitecture;
  implementation: ReviewImplementation;
  decisionState: ReviewDecisionState;
  decisionRationale: string | null;
  revisionNote: string | null;
  acceptEligibility: AcceptEligibility;
};

export class ReviewFixtureValidationError extends Error {
  constructor(message: string, readonly fixtureId: string) {
    super(message);
    this.name = 'ReviewFixtureValidationError';
  }
}

/** DEC-008 / component-contracts.md `ReviewDetail`: the fixed, non-reorderable section sequence — effect is always first, implementation always last and deepest. */
export const REVIEW_DETAIL_SECTION_ORDER = ['Effect', 'Verification', 'Impact', 'Architecture', 'Implementation'] as const;

const RISK_PRIORITY: Record<ReviewRisk, number> = { critical: 0, high: 1, normal: 2 };

const VERIFICATION_LABELS: Record<ReviewVerificationState, string> = {
  verified: 'Verified',
  failed: 'Failed verification',
  unverified: 'Unverified / inconclusive',
};

/**
 * An evidence entry is `observed` only when it carries a real, non-empty `evidence` string.
 * Anything else — including a fixture that *declares* `status: 'passed'` — is an unobserved
 * `agent_claim` and is never allowed to render as `Passed` (ORACLE-010's core requirement).
 */
export function toEvidenceRow(fixture: EvidenceFixture): EvidenceRow {
  const isObserved = Boolean(fixture.evidence && fixture.evidence.trim().length > 0);
  if (!isObserved) {
    return { name: fixture.name, command: fixture.command, provenance: 'agent_claim', isObserved: false, displayStatus: 'Claimed' };
  }
  const displayStatus: EvidenceDisplayStatus =
    fixture.status === 'passed' ? 'Passed' : fixture.status === 'failed' ? 'Failed' : fixture.status === 'skipped' ? 'Skipped' : 'Not run';
  return { name: fixture.name, command: fixture.command, provenance: 'observed', isObserved: true, displayStatus };
}

/**
 * Aggregates evidence rows into one verification state for the item. Only `observed` rows
 * count: an item backed solely by agent claims (or one whose sole observed evidence was
 * removed — TEST-006's negative control) has zero observed rows and is `unverified`, never
 * `verified`. Any observed failure makes the whole item `failed` (SCN-X-02, SCN-TEC-04):
 * the review can still proceed to a decision, but it can never show the `Verified` label.
 */
export function deriveVerificationState(rows: EvidenceRow[]): ReviewVerificationState {
  const observed = rows.filter((row) => row.isObserved);
  if (observed.length === 0) return 'unverified';
  if (observed.some((row) => row.displayStatus === 'Failed')) return 'failed';
  if (observed.every((row) => row.displayStatus === 'Passed')) return 'verified';
  return 'unverified';
}

export function verificationLabel(state: ReviewVerificationState): string {
  return VERIFICATION_LABELS[state];
}

/**
 * Shares `isProposalStale` with `src/core/proposals/RelationProposal.ts` (the same predicate
 * `applyRelationConnectProposal`'s Node-only transactional apply uses) so the STALE decision
 * is defined exactly once across the whole app (SCN-REV-07, SCN-X-01, SCN-X-10).
 */
export function isReviewItemStale(fixture: Pick<ReviewItemFixture, 'baseCanonicalHash'>, currentBaseCanonicalHash: string): boolean {
  return isProposalStale(fixture, currentBaseCanonicalHash);
}

/**
 * `ReviewDecisionBar` contract: "Accept disabled for stale/conflict or policy-blocking failed
 * verification." A failed verification that is *not* policy-blocking still leaves a decision
 * possible (SCN-X-02) — Accept just isn't one of the disabled paths in that case.
 */
export function deriveAcceptEligibility(
  fixture: Pick<ReviewItemFixture, 'baseCanonicalHash' | 'highRiskPolicy'>,
  verification: ReviewVerificationState,
  currentBaseCanonicalHash: string,
): AcceptEligibility {
  if (isReviewItemStale(fixture, currentBaseCanonicalHash)) {
    return {
      eligible: false,
      reason: `This proposal's base canonical state changed since it was created (current base ${currentBaseCanonicalHash}). Re-evaluate or rebase before accepting.`,
    };
  }
  if (verification === 'failed' && fixture.highRiskPolicy) {
    return {
      eligible: false,
      reason: 'Failed verification blocks acceptance under this review’s policy. Reject, Preserve, or Request revision remain available.',
    };
  }
  return { eligible: true, reason: null };
}

function toQueueItem(fixture: ReviewItemFixture, currentBaseCanonicalHash: string): ReviewQueueItem {
  const rows = fixture.evidence.map(toEvidenceRow);
  const verificationState = deriveVerificationState(rows);
  return {
    id: fixture.id,
    title: fixture.title,
    projectId: fixture.projectId,
    target: fixture.target,
    risk: fixture.risk,
    isStale: isReviewItemStale(fixture, currentBaseCanonicalHash),
    verificationState,
    verificationLabel: verificationLabel(verificationState),
    decisionState: fixture.decisionState ?? 'under_review',
    createdAt: fixture.createdAt,
  };
}

/**
 * Validates every fixture has at least one evidence entry (a review with zero evidence has
 * nothing to distinguish observed from claimed, and is a fixture-authoring error, not a valid
 * unverified state), then projects a finite queue ordered critical/stale first, then newest
 * (SCN-REV-01).
 */
export function projectReviewQueue(fixtures: ReviewItemFixture[], currentBaseCanonicalHash: string): ReviewQueueItem[] {
  for (const fixture of fixtures) {
    if (fixture.evidence.length === 0) {
      throw new ReviewFixtureValidationError(`Fixture "${fixture.id}" declares no evidence entries; provenance cannot be shown.`, fixture.id);
    }
  }
  return fixtures
    .map((fixture) => toQueueItem(fixture, currentBaseCanonicalHash))
    .sort((a, b) => {
      const aPriority = a.risk === 'critical' || a.isStale ? 0 : 1;
      const bPriority = b.risk === 'critical' || b.isStale ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      if (aPriority === 0) {
        const riskDelta = RISK_PRIORITY[a.risk] - RISK_PRIORITY[b.risk];
        if (riskDelta !== 0) return riskDelta;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
}

export function toReviewDetailModel(fixture: ReviewItemFixture, currentBaseCanonicalHash: string): ReviewDetailModel {
  const evidenceRows = fixture.evidence.map(toEvidenceRow);
  const verificationState = deriveVerificationState(evidenceRows);
  const decisionState = fixture.decisionState ?? 'under_review';
  return {
    id: fixture.id,
    title: fixture.title,
    projectId: fixture.projectId,
    target: fixture.target,
    risk: fixture.risk,
    highRiskPolicy: fixture.highRiskPolicy,
    createdAt: fixture.createdAt,
    baseCanonicalHash: fixture.baseCanonicalHash,
    isStale: isReviewItemStale(fixture, currentBaseCanonicalHash),
    effect: fixture.effect,
    evidenceRows,
    verificationState,
    verificationLabel: verificationLabel(verificationState),
    impact: fixture.impact,
    architecture: fixture.architecture,
    implementation: fixture.implementation,
    decisionState,
    decisionRationale: fixture.decisionRationale ?? null,
    revisionNote: fixture.revisionNote ?? null,
    acceptEligibility: deriveAcceptEligibility(fixture, verificationState, currentBaseCanonicalHash),
  };
}

/** SCN-REV-09: rejection requires a rationale only under high-risk policy; otherwise it is optional. */
export function isRejectRationaleRequired(fixture: Pick<ReviewItemFixture, 'highRiskPolicy'>): boolean {
  return fixture.highRiskPolicy;
}
