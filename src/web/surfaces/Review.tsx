import type { ContinuitySummary } from '../liveTypes';

export function Review({ continuity }: { continuity: ContinuitySummary | null }) {
  return <section className="review-surface" aria-labelledby="review-heading">
    <div className="review-heading"><div><p className="eyebrow">Project surface</p><h1 id="review-heading">Review</h1><p>A finite queue of proposals awaiting a human decision.</p></div></div>
    <p className="derived-state" role="status">No review records are available for this project. Workbench will not turn agent claims or ordinary files into review items.</p>
    {continuity && <details className="card continuity-detail"><summary>Latest work provenance</summary><dl><dt>Harness</dt><dd>{continuity.harness}</dd><dt>Model / effort</dt><dd>{continuity.model} / {continuity.effort}</dd><dt>Run</dt><dd><bdi dir="ltr">{continuity.latestRunId}</bdi></dd><dt>Evidence</dt><dd>{continuity.evidenceState}</dd><dt>Changed references</dt><dd>{continuity.changedRefs.length > 0 ? continuity.changedRefs.join(' · ') : 'None recorded'}</dd></dl></details>}
    <div className="review-layout"><div className="review-queue-pane"><div className="surface-empty"><h2>No items need review</h2><p>When a real proposal is submitted, its observed evidence and claimed results will remain visibly separate here.</p></div></div><div className="review-detail-pane"><div className="surface-empty"><h2>No review selected</h2><p>Opening a future item will never mutate canonical project records.</p></div></div></div>
  </section>;
}
