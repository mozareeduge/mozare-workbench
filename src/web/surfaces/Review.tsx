import { useState } from 'react';
import {
  isRejectRationaleRequired,
  projectReviewQueue,
  toReviewDetailModel,
  type ReviewDecisionState,
  type ReviewDetailModel,
} from '../../core/projection/ReviewProjection.js';
import type { ContinuitySummary, LiveReviewItem } from '../liveTypes';

export type ReviewDecisionInput = { state: Exclude<ReviewDecisionState, 'under_review'>; rationale?: string | null; revisionNote?: string | null };

type ReviewProps = {
  items: LiveReviewItem[];
  continuity: ContinuitySummary | null;
  /** Persists the decision; resolves to a receipt sentence or rejects with the server's reason. */
  onDecide: (item: LiveReviewItem, decision: ReviewDecisionInput) => Promise<string>;
  onContinue: (item: LiveReviewItem) => void;
};

const DECISION_LABELS: Record<ReviewDecisionState, string> = {
  under_review: 'Under review',
  accepted: 'Accepted',
  revision_requested: 'Revision requested',
  rejected: 'Rejected · retained',
  preserved_as_residue: 'Residue · no active authority',
};

function Provenance({ continuity }: { continuity: ContinuitySummary | null }) {
  if (!continuity) return null;
  return <details className="card continuity-detail"><summary>Latest work provenance</summary><dl><dt>Harness</dt><dd>{continuity.harness}</dd><dt>Model / effort</dt><dd>{continuity.model} / {continuity.effort}</dd><dt>Run</dt><dd><bdi dir="ltr">{continuity.latestRunId}</bdi></dd><dt>Evidence</dt><dd>{continuity.evidenceState}</dd><dt>Changed references</dt><dd>{continuity.changedRefs.length > 0 ? continuity.changedRefs.join(' · ') : 'None recorded'}</dd></dl></details>;
}

export function Review({ items, continuity, onDecide, onContinue }: ReviewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [revisionSheetOpenFor, setRevisionSheetOpenFor] = useState<string | null>(null);
  const [revisionDraft, setRevisionDraft] = useState('');
  const [rejectFormOpenFor, setRejectFormOpenFor] = useState<string | null>(null);
  const [rejectDraft, setRejectDraft] = useState('');
  const [receipt, setReceipt] = useState<string | null>(null);

  const byId = new Map(items.map((item) => [item.id, item]));
  const queue = projectReviewQueue(items, (item) => byId.get(item.id)?.currentBaseCanonicalHash ?? '');
  const selectedItem = byId.get(selectedId ?? queue[0]?.id ?? '') ?? null;
  const detail: ReviewDetailModel | null = selectedItem ? toReviewDetailModel(selectedItem, selectedItem.currentBaseCanonicalHash) : null;
  const rejectTarget = rejectFormOpenFor ? byId.get(rejectFormOpenFor) ?? null : null;
  const rejectRationaleRequired = rejectTarget ? isRejectRationaleRequired(rejectTarget) : false;

  const selectItem = (id: string) => {
    setSelectedId(id);
    setMobileDetailOpen(true);
    setReceipt(null);
  };
  const backToQueue = () => setMobileDetailOpen(false);

  const decide = async (id: string, decision: ReviewDecisionInput): Promise<boolean> => {
    const item = byId.get(id);
    if (!item || pending) return false;
    setPending(true);
    try {
      setReceipt(await onDecide(item, decision));
      return true;
    } catch (cause) {
      setReceipt(cause instanceof Error ? cause.message : String(cause));
      return false;
    } finally {
      setPending(false);
    }
  };

  const acceptItem = (item: ReviewDetailModel) => {
    if (!item.acceptEligibility.eligible || item.decisionState !== 'under_review') return;
    void decide(item.id, { state: 'accepted' });
  };

  const openRevisionSheet = (id: string) => { setRevisionSheetOpenFor(id); setRevisionDraft(''); };
  const cancelRevisionSheet = () => { setRevisionSheetOpenFor(null); setRevisionDraft(''); };
  const submitRevision = async (event: React.FormEvent, id: string) => {
    event.preventDefault();
    if (!revisionDraft.trim()) return;
    if (await decide(id, { state: 'revision_requested', revisionNote: revisionDraft.trim() })) {
      setRevisionSheetOpenFor(null);
      setRevisionDraft('');
    }
  };

  const openRejectForm = (id: string) => { setRejectFormOpenFor(id); setRejectDraft(''); };
  const cancelRejectForm = () => { setRejectFormOpenFor(null); setRejectDraft(''); };
  const confirmReject = async (event: React.FormEvent, item: LiveReviewItem) => {
    event.preventDefault();
    if (isRejectRationaleRequired(item) && !rejectDraft.trim()) return;
    if (await decide(item.id, { state: 'rejected', rationale: rejectDraft.trim() || null })) {
      setRejectFormOpenFor(null);
      setRejectDraft('');
    }
  };

  const preserveItem = (item: ReviewDetailModel) => {
    if (item.decisionState !== 'under_review') return;
    void decide(item.id, { state: 'preserved_as_residue' });
  };

  if (items.length === 0) {
    return <section className="review-surface" aria-labelledby="review-heading">
      <div className="review-heading"><div><p className="eyebrow">Project surface</p><h1 id="review-heading">Review</h1><p>A finite queue of proposals awaiting a human decision.</p></div></div>
      <p className="derived-state" role="status">No proposals yet. When you start a mission, the agent works on a copy of the project and its result arrives here; nothing changes in the project until you accept it.</p>
      <Provenance continuity={continuity} />
      <div className="review-layout"><div className="review-queue-pane"><div className="surface-empty"><h2>No items need review</h2><p>Observed evidence and agent claims will stay visibly separate here.</p></div></div><div className="review-detail-pane"><div className="surface-empty"><h2>No review selected</h2><p>Opening an item never changes the project.</p></div></div></div>
    </section>;
  }

  return <section className="review-surface" aria-labelledby="review-heading">
    <div className="review-heading"><div><p className="eyebrow">Project surface</p><h1 id="review-heading">Review</h1><p>A finite queue of proposals awaiting a human decision. Opening an item never mutates canonical project records.</p></div></div>
    <p className="derived-state" role="status">Observed evidence and agent claims are shown separately. An agent claim can never appear as Passed — only evidence the system itself ran and recorded can.</p>
    <Provenance continuity={continuity} />
    {receipt && <p className="review-receipt" role="status">{receipt}</p>}

    <div className={mobileDetailOpen ? 'review-layout is-mobile-detail-open' : 'review-layout'}>
      <div className="review-queue-pane">
        <ul className="review-queue" aria-label="Review queue">
          {queue.map((item) => <li key={item.id}>
            <button type="button" className={item.id === detail?.id ? 'review-queue-item is-selected' : 'review-queue-item'} aria-current={item.id === detail?.id ? 'true' : undefined} onClick={() => selectItem(item.id)}>
              <span className={`review-risk-badge risk-${item.risk}`}>{item.risk}</span>
              <strong dir="auto">{item.title}</strong>
              <small><bdi dir="auto">{byId.get(item.id)?.harness} · task v{byId.get(item.id)?.taskVersion} · {item.target}</bdi></small>
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
            <p className="eyebrow"><bdi dir="auto">{selectedItem?.harness} · task v{selectedItem?.taskVersion} · {detail.target}</bdi></p>
            <h2 dir="auto">{detail.title}</h2>
            <p className="review-detail-cues">
              <span className={`review-risk-badge risk-${detail.risk}`}>{detail.risk}</span>
              <span className={detail.isStale ? 'review-freshness-badge is-stale' : 'review-freshness-badge is-fresh'}>{detail.isStale ? 'Stale base' : 'Fresh base'}</span>
              <span className={`review-decision-badge state-${detail.decisionState}`}>{DECISION_LABELS[detail.decisionState]}</span>
            </p>
          </header>

          <section aria-labelledby={`review-effect-heading-${detail.id}`}>
            <h3 id={`review-effect-heading-${detail.id}`}>Effect</h3>
            <dl>
              <dt>Requested outcome</dt><dd dir="auto" className="review-preline">{detail.effect.requestedOutcome}</dd>
              <dt>What changed</dt><dd dir="auto">{detail.effect.whatChanged}</dd>
              <dt>What remains unresolved</dt><dd dir="auto">{detail.effect.whatRemainsUnresolved}</dd>
            </dl>
          </section>

          <section aria-labelledby={`review-verification-heading-${detail.id}`}>
            <h3 id={`review-verification-heading-${detail.id}`}>Verification</h3>
            <p className={`review-verification-summary state-${detail.verificationState}`}>{detail.verificationLabel}</p>
            <ul className="review-evidence-list" aria-label="Evidence">
              {detail.evidenceRows.map((row) => <li key={row.name} className={`review-evidence-row is-${row.provenance}`}>
                <span className="review-evidence-provenance">{row.provenance === 'observed' ? 'Observed' : 'Agent claim'}</span>
                <strong dir="auto">{row.name}</strong>
                <span className={`review-evidence-status status-${row.displayStatus.toLowerCase().replace(/\s+/g, '-')}`}>{row.displayStatus}</span>
                {row.command && <span className="review-evidence-command">{row.command}</span>}
              </li>)}
            </ul>
          </section>

          <section aria-labelledby={`review-impact-heading-${detail.id}`}>
            <h3 id={`review-impact-heading-${detail.id}`}>Impact</h3>
            <dl>
              <dt>Affected</dt><dd>{detail.impact.affectedTargets.length > 0 ? detail.impact.affectedTargets.join(' · ') : 'No files changed'}</dd>
              <dt>Blast radius</dt><dd>{detail.impact.blastRadius}</dd>
              <dt>Note</dt><dd>{detail.impact.note}</dd>
            </dl>
          </section>

          <details className="review-architecture">
            <summary>Architecture</summary>
            <p dir="auto">{detail.architecture.summary}</p>
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
            <p className="review-decision-freshness" role="status">{detail.isStale ? 'The project changed since this proposal was created. Accept is disabled so nothing is overwritten; request a revision to redo it on the current project.' : 'Base is fresh — the files this proposal touches are unchanged in the project.'}</p>
            <div className="review-decision-actions">
              <button type="button" className="button-primary" disabled={pending || !detail.acceptEligibility.eligible || detail.decisionState !== 'under_review'} onClick={() => acceptItem(detail)}>Accept</button>
              <button type="button" disabled={pending || detail.decisionState !== 'under_review'} onClick={() => openRevisionSheet(detail.id)}>Request revision</button>
              <button type="button" disabled={pending || detail.decisionState !== 'under_review'} onClick={() => openRejectForm(detail.id)}>Reject</button>
              <button type="button" disabled={pending || detail.decisionState !== 'under_review'} onClick={() => preserveItem(detail)}>Preserve</button>
            </div>
            {!detail.acceptEligibility.eligible && detail.acceptEligibility.reason && <p className="review-accept-reason" role="status">{detail.acceptEligibility.reason}</p>}
            {detail.decisionRationale && <p className="review-decision-rationale">Rationale: {detail.decisionRationale}</p>}
            {detail.revisionNote && <p className="review-revision-note">Revision note: {detail.revisionNote}</p>}
            {detail.decisionState === 'revision_requested' && selectedItem && <button type="button" className="button" onClick={() => onContinue(selectedItem)}>Continue with an agent</button>}
          </div>
        </div>}
      </div>
    </div>

    {revisionSheetOpenFor && <div className="review-sheet-overlay"><div className="review-sheet" role="dialog" aria-modal="true" aria-labelledby="revision-sheet-heading" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); cancelRevisionSheet(); } }}>
      <h2 id="revision-sheet-heading">Request revision</h2>
      <p>Provide a concise correction. It stays attached to this same proposal/mission lineage; prior evidence is preserved.</p>
      <form onSubmit={(event) => void submitRevision(event, revisionSheetOpenFor)}>
        <label htmlFor="revision-note">Revision note</label>
        <textarea id="revision-note" value={revisionDraft} onChange={(event) => setRevisionDraft(event.target.value)} required autoFocus />
        <div className="review-sheet-actions"><button type="button" onClick={cancelRevisionSheet}>Cancel</button><button type="submit" className="button-primary" disabled={pending}>Send revision request</button></div>
      </form>
    </div></div>}

    {rejectTarget && <div className="review-sheet-overlay"><div className="review-sheet" role="dialog" aria-modal="true" aria-labelledby="reject-sheet-heading" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); cancelRejectForm(); } }}>
      <h2 id="reject-sheet-heading">Reject</h2>
      <p>The record is retained for reference; canonical state is not changed.</p>
      <form onSubmit={(event) => void confirmReject(event, rejectTarget)}>
        <label htmlFor="reject-rationale">{rejectRationaleRequired ? 'Rationale (required by high-risk review policy)' : 'Rationale (optional)'}</label>
        <textarea id="reject-rationale" value={rejectDraft} onChange={(event) => setRejectDraft(event.target.value)} required={rejectRationaleRequired} autoFocus />
        <div className="review-sheet-actions"><button type="button" onClick={cancelRejectForm}>Cancel</button><button type="submit" className="button-primary" disabled={pending}>Confirm reject</button></div>
      </form>
    </div></div>}
  </section>;
}
