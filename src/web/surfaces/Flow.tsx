import { useState } from 'react';
import type { ContinuitySummary } from '../liveTypes';

const lanes = ['Ready', 'Active', 'Blocked', 'Review', 'Accepted'] as const;
type Lane = (typeof lanes)[number];

export function Flow({ continuity }: { continuity: ContinuitySummary | null }) {
  const [selectedLane, setSelectedLane] = useState<Lane>('Active');
  return <section className="flow-surface" aria-labelledby="flow-heading">
    <div className="flow-heading"><div><p className="eyebrow">Project surface</p><h1 id="flow-heading">Flow</h1><p>Outcome-level work across the active project.</p></div></div>
    <p className="derived-state" role="status">{continuity ? `Current durable work: ${continuity.currentTaskId} v${continuity.currentTaskVersion} is ${continuity.status} via ${continuity.harness}.` : 'No outcome/run records are available for this project. Workbench has not inferred an engineering board from ordinary files.'}</p>
    {continuity && <article className="card continuity-card"><p className="card-label">Task lineage</p><h2>{continuity.currentTaskId} · version {continuity.currentTaskVersion}</h2><p>{continuity.resultSummary}</p><p><strong>Remaining:</strong> {continuity.remaining.length > 0 ? continuity.remaining.join(' · ') : 'Nothing recorded'}</p><p><strong>Next:</strong> {continuity.nextAction}</p></article>}
    <div className="flow-board" aria-label="Flow outcome board">{lanes.map((lane) => <section key={lane} className="flow-lane" aria-labelledby={`flow-lane-heading-${lane}`}><h2 id={`flow-lane-heading-${lane}`}>{lane}<span className="flow-lane-count" aria-hidden="true">0</span></h2><ul className="flow-lane-cards"><li className="flow-lane-empty">No items</li></ul></section>)}</div>
    <div className="flow-mobile"><div className="flow-filter" role="tablist" aria-label="Filter by outcome state">{lanes.map((lane) => <button key={lane} type="button" role="tab" aria-selected={selectedLane === lane} className={selectedLane === lane ? 'is-active' : ''} onClick={() => setSelectedLane(lane)}>{lane} <span className="flow-lane-count" aria-hidden="true">0</span></button>)}</div><ul className="flow-mobile-cards" aria-label={`${selectedLane} outcomes`}><li className="flow-lane-empty">No items in {selectedLane}</li></ul></div>
  </section>;
}
