import { useState } from 'react';
import {
  isRejectRationaleRequired,
  projectReviewQueue,
  toReviewDetailModel,
  type ReviewDecisionState,
  type ReviewDetailModel,
  type ReviewItemFixture,
} from '../../core/projection/ReviewProjection.js';

/**
 * Review stays fixture/demo data in Phase 1 (DEC-031a — real WorkspaceEngine/live proposal
 * wiring is TASK-P09-02's job). `DEMO_BASE_CANONICAL_HASH` stands in for "the canonical hash
 * the fresh demo proposals were proposed against"; `STALE_BASE_CANONICAL_HASH` is a
 * deliberately different constant one fixture is proposed against, so the stale/disabled
 * Accept path (SCN-REV-07, SCN-X-01, SCN-X-10) is a real, reachable branch of this demo, not
 * just a theoretical one — the same shape Field.tsx already uses for its own demo hash.
 */
const DEMO_BASE_CANONICAL_HASH = 'demo-review-base-hash-v1';
const STALE_BASE_CANONICAL_HASH = 'demo-review-base-hash-v0-superseded';

const fixtures: ReviewItemFixture[] = [
  {
    id: 'rev_p0301_stale_apply',
    projectId: 'TAROKE RIMIXER',
    target: 'src/core/proposals/applyRelationConnectProposal.ts',
    title: 'Transactional canonical apply for relation-connect proposals',
    risk: 'critical',
    highRiskPolicy: false,
    createdAt: '2026-09-14T10:00:00Z',
    baseCanonicalHash: DEMO_BASE_CANONICAL_HASH,
    effect: {
      requestedOutcome: 'Accepting a relation-connect proposal should either fully apply into canonical truth or leave the workspace exactly as it was — never a half-written state.',
      whatChanged: 'A new relations/<id>.yaml is staged only once the workspace base is confirmed fresh; the whole workspace is then re-validated before the apply is considered final.',
      whatRemainsUnresolved: 'Whether a second, independent reviewer should re-run the integration suite before this reaches a shared branch.',
    },
    evidence: [
      { name: 'TEST-007: stale proposal blocks accept', status: 'passed', command: 'npm run test:integration', evidence: 'vitest report: 1 passed — relations/ and objects/ directory listings byte-identical before/after; canonicalHash unchanged.' },
      { name: 'TEST-008: transaction rollback restores prior hash', status: 'passed', command: 'npm run test:integration', evidence: 'vitest report: 2 passed — staged file removed, canonicalHash restored, negative-control canary also verified.' },
    ],
    impact: {
      affectedTargets: ['relations/*.yaml (new files only)', 'src/web/surfaces/Field.tsx (Accept action)'],
      blastRadius: 'narrow',
      note: 'Only ever adds a new relation record; never overwrites an existing canonical file.',
    },
    architecture: {
      summary: 'A pure isProposalStale(...) predicate is shared between the Node-only apply path and the browser UI, so the STALE decision is defined exactly once.',
      components: ['RelationProposal.ts — browser-safe types + isProposalStale', 'applyRelationConnectProposal.ts — Node-only stage/validate/rollback', 'Field.tsx Accept action — browser'],
      tradeoffs: ['Rollback is bounded to "delete what we just staged" rather than a full transactional filesystem — acceptable because this proposal type only ever adds a file, never overwrites one.'],
    },
    implementation: {
      files: ['src/core/proposals/RelationProposal.ts', 'src/core/proposals/applyRelationConnectProposal.ts', 'tests/integration/proposal-apply.test.ts'],
      diffText:
        '--- a/src/core/proposals/applyRelationConnectProposal.ts\n' +
        '+++ b/src/core/proposals/applyRelationConnectProposal.ts\n' +
        '@@ -60,6 +60,14 @@\n' +
        "+  if (isProposalStale(proposal, beforeHash)) {\n" +
        "+    return { outcome: 'stale', expectedBaseHash: proposal.baseCanonicalHash, actualBaseHash: beforeHash, message: '...' };\n" +
        '+  }',
      logText: '$ npm run test:integration\n✓ tests/integration/proposal-apply.test.ts (4)\n  ✓ TEST-007: stale proposal blocks accept (12ms)\n  ✓ TEST-008: transaction rollback (9ms)\nTest Files  2 passed (2)\n     Tests  4 passed (4)',
    },
  },
  {
    id: 'rev_field_descriptor_stale',
    projectId: 'TAROKE RIMIXER',
    target: 'src/web/surfaces/Field.tsx',
    title: 'Rebase Field connect-proposal descriptor validation',
    risk: 'high',
    highRiskPolicy: false,
    createdAt: '2026-09-13T09:00:00Z',
    baseCanonicalHash: STALE_BASE_CANONICAL_HASH,
    effect: {
      requestedOutcome: 'Trim whitespace-only descriptors before they are stored on a relation-connect proposal so an empty-looking descriptor is never persisted.',
      whatChanged: 'createRelationConnectProposal() now normalizes descriptor/classification with .trim() || null before the proposal is created.',
      whatRemainsUnresolved: 'Whether the same trimming should apply retroactively to already-created proposals sitting in review.',
    },
    evidence: [{ name: 'relation-proposal.test.ts: descriptor trims to null on empty input', status: 'passed', command: 'npm run test:unit', evidence: 'vitest report: relation-proposal.test.ts — 1 passed.' }],
    impact: { affectedTargets: ['src/core/proposals/RelationProposal.ts (createRelationConnectProposal)'], blastRadius: 'narrow', note: 'Input normalization only; no canonical schema change.' },
    architecture: { summary: 'Normalization happens once, at proposal-creation time, so every downstream reader sees the same trimmed value.', components: ['RelationProposal.ts'], tradeoffs: ['Normalizing at creation means a proposal already in flight before this change keeps its original untrimmed value.'] },
    implementation: {
      files: ['src/core/proposals/RelationProposal.ts'],
      diffText: '--- a/src/core/proposals/RelationProposal.ts\n+++ b/src/core/proposals/RelationProposal.ts\n@@ -43,2 +43,2 @@\n-    descriptor: input.descriptor ?? null,\n+    descriptor: input.descriptor?.trim() || null,',
      logText: '$ npm run test:unit\n✓ tests/unit/relation-proposal.test.ts (6)\nTest Files  1 passed (1)\n     Tests  6 passed (6)',
    },
  },
  {
    id: 'rev_raw_log_streaming_failed',
    projectId: 'TAROKE RIMIXER',
    target: 'src/web/surfaces/Review.tsx',
    title: 'Stream raw build log into Implementation disclosure',
    risk: 'critical',
    highRiskPolicy: true,
    createdAt: '2026-09-15T11:00:00Z',
    baseCanonicalHash: DEMO_BASE_CANONICAL_HASH,
    effect: {
      requestedOutcome: 'Show the full raw build log inside the Implementation disclosure without ever auto-expanding it on load (SCN-TEC-05).',
      whatChanged: 'Attempted change wired the log preview to open automatically whenever a 20k-line log was present, to make failures more visible.',
      whatRemainsUnresolved: 'A collapsed-by-default log viewer that still surfaces failures prominently, without violating the "never auto-expand" constraint.',
    },
    evidence: [{ name: 'TEST-REV-log: 20k-line log stays collapsed on open', status: 'failed', command: 'npm run test:e2e', evidence: 'playwright report: 1 failed — the log <pre> rendered with the open attribute on initial load, violating SCN-TEC-05.' }],
    impact: { affectedTargets: ['src/web/surfaces/Review.tsx (Implementation disclosure)'], blastRadius: 'narrow', note: 'UI-only; no canonical record is touched by this proposal.' },
    architecture: { summary: 'The Implementation disclosure is a native <details> element; the failing attempt set the open attribute conditionally on log size instead of leaving it operator-controlled.', components: ['Review.tsx Implementation <details>'], tradeoffs: ['Auto-expanding on failure feels helpful but breaks the fixed "raw log never automatically expanded" negative constraint (SCN-REV-02).'] },
    implementation: {
      files: ['src/web/surfaces/Review.tsx'],
      diffText: '--- a/src/web/surfaces/Review.tsx\n+++ b/src/web/surfaces/Review.tsx\n@@ -1,2 +1,2 @@\n-<details className="review-implementation">\n+<details className="review-implementation" open={logText.length > 20000}>',
      logText: '$ npm run test:e2e\n✗ SCN-TEC-05: 20k-line log stays collapsed/lazy\n  expected details[open] to be false, got true\n1 failed, 0 passed',
    },
  },
  {
    id: 'rev_evidence_chip_breakpoint',
    projectId: 'TAROKE RIMIXER',
    target: 'src/web/styles/review.css',
    title: 'Add responsive breakpoint to Review evidence chips',
    risk: 'normal',
    highRiskPolicy: false,
    createdAt: '2026-09-12T08:00:00Z',
    baseCanonicalHash: DEMO_BASE_CANONICAL_HASH,
    effect: {
      requestedOutcome: 'Evidence chips should reflow to a single column below 320px width instead of overflowing horizontally.',
      whatChanged: 'A CSS-only change adding a max-width:320px media query to .review-evidence-list.',
      whatRemainsUnresolved: 'Whether the same reflow rule should also apply to the queue list cues at the same breakpoint.',
    },
    evidence: [{ name: 'Agent note: chips reflow correctly at 320px', status: 'passed', command: null, evidence: null }],
    impact: { affectedTargets: ['src/web/styles/review.css'], blastRadius: 'narrow', note: 'CSS-only; no logic or canonical record touched.' },
    architecture: { summary: 'A single additional media query rule scoped to .review-evidence-list.', components: ['review.css'], tradeoffs: ['No automated screenshot/visual test accompanies this change; the only evidence is an agent note, not an observed run.'] },
    implementation: {
      files: ['src/web/styles/review.css'],
      diffText: '--- a/src/web/styles/review.css\n+++ b/src/web/styles/review.css\n@@\n+@media(max-width:320px){.review-evidence-list{grid-template-columns:1fr}}',
      logText: 'No test runner log was attached to this proposal — the claim above is the agent\'s own description of the outcome, not a captured tool run.',
    },
  },
  {
    id: 'rev_provenance_self_check',
    projectId: 'TAROKE RIMIXER',
    target: 'src/core/projection/ReviewProjection.ts',
    title: 'Confirm evidence provenance keeps agent claims out of Passed state',
    risk: 'normal',
    highRiskPolicy: false,
    createdAt: '2026-09-16T12:00:00Z',
    baseCanonicalHash: DEMO_BASE_CANONICAL_HASH,
    effect: {
      requestedOutcome: 'An evidence entry with no observed evidence attached must never render as Passed, even when it declares status "passed" (ORACLE-010).',
      whatChanged: 'toEvidenceRow() now derives provenance from whether a non-empty evidence string is present, independent of the declared status field.',
      whatRemainsUnresolved: 'Whether agent claims should also be individually dismissible from the evidence list, or always retained alongside observed rows.',
    },
    evidence: [
      { name: 'TEST-006 positive path: observed pass renders Passed/Observed', status: 'passed', command: 'npm run test:integration', evidence: 'vitest report: review-provenance.test.ts — toEvidenceRow returns provenance "observed", displayStatus "Passed".' },
      { name: 'Agent claim: "full regression suite passed"', status: 'passed', command: null, evidence: null },
    ],
    impact: { affectedTargets: ['src/core/projection/ReviewProjection.ts', 'src/web/surfaces/Review.tsx (EvidenceRow rendering)'], blastRadius: 'narrow', note: 'Pure projection change plus its rendering; no canonical record touched.' },
    architecture: { summary: 'Provenance and display status are both derived once, in toEvidenceRow(), so the UI never has to re-decide what counts as observed.', components: ['ReviewProjection.ts (toEvidenceRow, deriveVerificationState)', 'Review.tsx (EvidenceRow rendering)'], tradeoffs: ['A claim with a real evidence string but a false/misleading description would still read as "observed" — provenance is about presence of an evidence artifact, not about auditing its truthfulness.'] },
    implementation: {
      files: ['src/core/projection/ReviewProjection.ts', 'tests/integration/review-provenance.test.ts'],
      diffText: "--- a/src/core/projection/ReviewProjection.ts\n+++ b/src/core/projection/ReviewProjection.ts\n@@\n+  const isObserved = Boolean(fixture.evidence && fixture.evidence.trim().length > 0);\n+  if (!isObserved) return { ...row, provenance: 'agent_claim', displayStatus: 'Claimed' };",
      logText: '$ npm run test:integration\n✓ tests/integration/review-provenance.test.ts (5)\nTest Files  1 passed (1)\n     Tests  5 passed (5)',
    },
  },
];

const DECISION_LABELS: Record<ReviewDecisionState, string> = {
  under_review: 'Under review',
  accepted: 'Accepted',
  revision_requested: 'Revision requested',
  rejected: 'Rejected · retained',
  preserved_as_residue: 'Residue · no active authority',
};

type DecisionOverride = { state: ReviewDecisionState; rationale: string | null; revisionNote: string | null };

function withOverride(fixture: ReviewItemFixture, override: DecisionOverride | undefined): ReviewItemFixture {
  if (!override) return fixture;
  return { ...fixture, decisionState: override.state, decisionRationale: override.rationale, revisionNote: override.revisionNote };
}

export function Review() {
  const [selectedId, setSelectedId] = useState<string>(fixtures[0].id);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, DecisionOverride>>({});
  const [revisionSheetOpenFor, setRevisionSheetOpenFor] = useState<string | null>(null);
  const [revisionDraft, setRevisionDraft] = useState('');
  const [rejectFormOpenFor, setRejectFormOpenFor] = useState<string | null>(null);
  const [rejectDraft, setRejectDraft] = useState('');
  const [receipt, setReceipt] = useState<string | null>(null);

  const liveFixtures = fixtures.map((fixture) => withOverride(fixture, decisions[fixture.id]));
  const queue = projectReviewQueue(liveFixtures, DEMO_BASE_CANONICAL_HASH);
  const selectedFixture = liveFixtures.find((fixture) => fixture.id === selectedId) ?? null;
  const detail: ReviewDetailModel | null = selectedFixture ? toReviewDetailModel(selectedFixture, DEMO_BASE_CANONICAL_HASH) : null;
  const rejectTarget = rejectFormOpenFor ? liveFixtures.find((fixture) => fixture.id === rejectFormOpenFor) ?? null : null;
  const rejectRationaleRequired = rejectTarget ? isRejectRationaleRequired(rejectTarget) : false;

  const selectItem = (id: string) => {
    setSelectedId(id);
    setMobileDetailOpen(true);
    setReceipt(null);
  };
  const backToQueue = () => setMobileDetailOpen(false);

  const acceptItem = (item: ReviewDetailModel) => {
    if (!item.acceptEligibility.eligible || item.decisionState !== 'under_review') return;
    setDecisions((old) => ({ ...old, [item.id]: { state: 'accepted', rationale: null, revisionNote: null } }));
    setReceipt(`"${item.title}" accepted.`);
  };

  const openRevisionSheet = (id: string) => { setRevisionSheetOpenFor(id); setRevisionDraft(''); };
  const cancelRevisionSheet = () => { setRevisionSheetOpenFor(null); setRevisionDraft(''); };
  const submitRevision = (event: React.FormEvent, id: string) => {
    event.preventDefault();
    if (!revisionDraft.trim()) return;
    setDecisions((old) => ({ ...old, [id]: { state: 'revision_requested', rationale: old[id]?.rationale ?? null, revisionNote: revisionDraft.trim() } }));
    setReceipt('Revision requested — the proposal stays attached to the same proposal/mission lineage; prior evidence is preserved.');
    setRevisionSheetOpenFor(null);
    setRevisionDraft('');
  };

  const openRejectForm = (id: string) => { setRejectFormOpenFor(id); setRejectDraft(''); };
  const cancelRejectForm = () => { setRejectFormOpenFor(null); setRejectDraft(''); };
  const confirmReject = (event: React.FormEvent, item: ReviewItemFixture) => {
    event.preventDefault();
    if (isRejectRationaleRequired(item) && !rejectDraft.trim()) return;
    setDecisions((old) => ({ ...old, [item.id]: { state: 'rejected', rationale: rejectDraft.trim() || null, revisionNote: old[item.id]?.revisionNote ?? null } }));
    setReceipt(`"${item.title}" rejected. The record is retained for reference; canonical state is unchanged.`);
    setRejectFormOpenFor(null);
    setRejectDraft('');
  };

  const preserveItem = (item: ReviewDetailModel) => {
    if (item.decisionState !== 'under_review') return;
    setDecisions((old) => ({ ...old, [item.id]: { state: 'preserved_as_residue', rationale: old[item.id]?.rationale ?? null, revisionNote: old[item.id]?.revisionNote ?? null } }));
    setReceipt(`"${item.title}" preserved as residue — retained for reference with no active authority.`);
  };

  return <section className="review-surface" aria-labelledby="review-heading">
    <div className="review-heading"><div><p className="eyebrow">Project surface</p><h1 id="review-heading">Review</h1><p>A finite queue of proposals awaiting a human decision. Opening an item never mutates canonical project records.</p></div></div>
    <p className="derived-state" role="status">Observed evidence and agent claims are shown separately. An agent claim can never appear as Passed — only evidence the system itself ran and recorded can.</p>
    {receipt && <p className="review-receipt" role="status">{receipt}</p>}

    <div className={mobileDetailOpen ? 'review-layout is-mobile-detail-open' : 'review-layout'}>
      <div className="review-queue-pane">
        <ul className="review-queue" aria-label="Review queue">
          {queue.map((item) => <li key={item.id}>
            <button type="button" className={item.id === selectedId ? 'review-queue-item is-selected' : 'review-queue-item'} aria-current={item.id === selectedId ? 'true' : undefined} onClick={() => selectItem(item.id)}>
              <span className={`review-risk-badge risk-${item.risk}`}>{item.risk}</span>
              <strong>{item.title}</strong>
              <small>{item.projectId} / {item.target}</small>
              <span className="review-queue-cues">
                <span className={item.isStale ? 'review-freshness-badge is-stale' : 'review-freshness-badge is-fresh'}>{item.isStale ? 'Stale' : 'Fresh'}</span>
                <span className={`review-verification-badge state-${item.verificationState}`}>{item.verificationLabel}</span>
                <span className={`review-decision-badge state-${item.decisionState}`}>{DECISION_LABELS[item.decisionState]}</span>
              </span>
            </button>
          </li>)}
        </ul>
      </div>

      <div className="review-detail-pane">
        {detail && <div className="review-detail" aria-live="polite">
          <button type="button" className="review-back" onClick={backToQueue}>← Back to queue</button>
          <header className="review-detail-header">
            <p className="eyebrow">{detail.projectId} / {detail.target}</p>
            <h2>{detail.title}</h2>
            <p className="review-detail-cues">
              <span className={`review-risk-badge risk-${detail.risk}`}>{detail.risk}</span>
              <span className={detail.isStale ? 'review-freshness-badge is-stale' : 'review-freshness-badge is-fresh'}>{detail.isStale ? 'Stale base' : 'Fresh base'}</span>
              <span className={`review-decision-badge state-${detail.decisionState}`}>{DECISION_LABELS[detail.decisionState]}</span>
            </p>
          </header>

          <section aria-labelledby={`review-effect-heading-${detail.id}`}>
            <h3 id={`review-effect-heading-${detail.id}`}>Effect</h3>
            <dl>
              <dt>Requested outcome</dt><dd>{detail.effect.requestedOutcome}</dd>
              <dt>What changed</dt><dd>{detail.effect.whatChanged}</dd>
              <dt>What remains unresolved</dt><dd>{detail.effect.whatRemainsUnresolved}</dd>
            </dl>
          </section>

          <section aria-labelledby={`review-verification-heading-${detail.id}`}>
            <h3 id={`review-verification-heading-${detail.id}`}>Verification</h3>
            <p className={`review-verification-summary state-${detail.verificationState}`}>{detail.verificationLabel}</p>
            <ul className="review-evidence-list" aria-label="Evidence">
              {detail.evidenceRows.map((row) => <li key={row.name} className={`review-evidence-row is-${row.provenance}`}>
                <span className="review-evidence-provenance">{row.provenance === 'observed' ? 'Observed' : 'Agent claim'}</span>
                <strong>{row.name}</strong>
                <span className={`review-evidence-status status-${row.displayStatus.toLowerCase().replace(/\s+/g, '-')}`}>{row.displayStatus}</span>
                {row.command && <span className="review-evidence-command">{row.command}</span>}
              </li>)}
            </ul>
          </section>

          <section aria-labelledby={`review-impact-heading-${detail.id}`}>
            <h3 id={`review-impact-heading-${detail.id}`}>Impact</h3>
            <dl>
              <dt>Affected</dt><dd>{detail.impact.affectedTargets.join(' · ')}</dd>
              <dt>Blast radius</dt><dd>{detail.impact.blastRadius}</dd>
              <dt>Note</dt><dd>{detail.impact.note}</dd>
            </dl>
          </section>

          <details className="review-architecture">
            <summary>Architecture</summary>
            <p>{detail.architecture.summary}</p>
            <p className="review-disclosure-label">Components</p>
            <ul>{detail.architecture.components.map((component) => <li key={component}>{component}</li>)}</ul>
            <p className="review-disclosure-label">Trade-offs</p>
            <ul>{detail.architecture.tradeoffs.map((tradeoff) => <li key={tradeoff}>{tradeoff}</li>)}</ul>
          </details>

          <details className="review-implementation">
            <summary>Implementation</summary>
            <p className="review-disclosure-label">Files</p>
            <ul className="review-mono">{detail.implementation.files.map((file) => <li key={file}>{file}</li>)}</ul>
            <p className="review-disclosure-label">Diff</p>
            <pre className="review-mono review-diff-viewer">{detail.implementation.diffText}</pre>
            <p className="review-disclosure-label">Log</p>
            <pre className="review-mono review-log-viewer">{detail.implementation.logText}</pre>
          </details>

          <div className="review-decision-bar" role="group" aria-label="Review decision">
            <p className="review-decision-freshness" role="status">{detail.isStale ? `Base changed since this proposal was created (expected ${detail.baseCanonicalHash}, current ${DEMO_BASE_CANONICAL_HASH}).` : 'Base is fresh.'}</p>
            <div className="review-decision-actions">
              <button type="button" className="button-primary" disabled={!detail.acceptEligibility.eligible || detail.decisionState !== 'under_review'} onClick={() => acceptItem(detail)}>Accept</button>
              <button type="button" disabled={detail.decisionState !== 'under_review'} onClick={() => openRevisionSheet(detail.id)}>Request revision</button>
              <button type="button" disabled={detail.decisionState !== 'under_review'} onClick={() => openRejectForm(detail.id)}>Reject</button>
              <button type="button" disabled={detail.decisionState !== 'under_review'} onClick={() => preserveItem(detail)}>Preserve</button>
            </div>
            {!detail.acceptEligibility.eligible && detail.acceptEligibility.reason && <p className="review-accept-reason" role="status">{detail.acceptEligibility.reason}</p>}
            {detail.decisionRationale && <p className="review-decision-rationale">Rationale: {detail.decisionRationale}</p>}
            {detail.revisionNote && <p className="review-revision-note">Revision note: {detail.revisionNote}</p>}
          </div>
        </div>}
      </div>
    </div>

    {revisionSheetOpenFor && <div className="review-sheet-overlay"><div className="review-sheet" role="dialog" aria-modal="true" aria-labelledby="revision-sheet-heading" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); cancelRevisionSheet(); } }}>
      <h2 id="revision-sheet-heading">Request revision</h2>
      <p>Provide a concise correction. It stays attached to this same proposal/mission lineage; prior evidence is preserved.</p>
      <form onSubmit={(event) => submitRevision(event, revisionSheetOpenFor)}>
        <label htmlFor="revision-note">Revision note</label>
        <textarea id="revision-note" value={revisionDraft} onChange={(event) => setRevisionDraft(event.target.value)} required autoFocus />
        <div className="review-sheet-actions"><button type="button" onClick={cancelRevisionSheet}>Cancel</button><button type="submit" className="button-primary">Send revision request</button></div>
      </form>
    </div></div>}

    {rejectTarget && <div className="review-sheet-overlay"><div className="review-sheet" role="dialog" aria-modal="true" aria-labelledby="reject-sheet-heading" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); cancelRejectForm(); } }}>
      <h2 id="reject-sheet-heading">Reject</h2>
      <p>The record is retained for reference; canonical state is not changed.</p>
      <form onSubmit={(event) => confirmReject(event, rejectTarget)}>
        <label htmlFor="reject-rationale">{rejectRationaleRequired ? 'Rationale (required by high-risk review policy)' : 'Rationale (optional)'}</label>
        <textarea id="reject-rationale" value={rejectDraft} onChange={(event) => setRejectDraft(event.target.value)} required={rejectRationaleRequired} autoFocus />
        <div className="review-sheet-actions"><button type="button" onClick={cancelRejectForm}>Cancel</button><button type="submit" className="button-primary">Confirm reject</button></div>
      </form>
    </div></div>}
  </section>;
}
