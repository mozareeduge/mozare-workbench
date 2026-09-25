import { useState } from 'react';
import { FLOW_LANES, projectFlow, type FlowBoard, type FlowCard, type FlowLane } from '../../core/projection/FlowProjection.js';
import type { ContinuitySummary, LiveFlowOutcome } from '../liveTypes';

type FlowProps = {
  outcomes: LiveFlowOutcome[];
  continuity: ContinuitySummary | null;
  /** Opens the route a blocked card names (for live runs: continue the task with another agent). */
  onRoute: (card: FlowCard) => void;
};

function FlowCardView({ card, onRoute }: { card: FlowCard; onRoute: FlowProps['onRoute'] }) {
  return <article className="flow-card">
    <p className="flow-card-owner">{card.owner}</p>
    <h3 dir="auto">{card.title}</h3>
    {card.progress && <p className="flow-card-progress">
      <span className="flow-progress-track" aria-hidden="true"><span className="flow-progress-fill" style={{ width: `${Math.round((card.progress.done / card.progress.total) * 100)}%` }} /></span>
      <span>{card.progress.done}/{card.progress.total} subtasks complete</span>
    </p>}
    {card.blocker && <p className="flow-card-blocker">
      <span className="flow-blocked-icon" aria-hidden="true">!</span>
      <span dir="auto">{card.blocker.reason}</span>
      <button type="button" className="flow-blocker-route" onClick={() => onRoute(card)}>{card.blocker.routeLabel}</button>
    </p>}
    {card.lane === 'Review' && <p className="flow-card-review-note">Completed — awaiting review, not yet accepted.</p>}
    {card.subtasks.length > 0 && <details className="flow-card-subtasks">
      <summary>Technical subtasks ({card.subtasks.filter((subtask) => subtask.done).length}/{card.subtasks.length})</summary>
      <ul>{card.subtasks.map((subtask) => <li key={subtask.id} className={subtask.done ? 'is-done' : ''}>{subtask.title}</li>)}</ul>
    </details>}
  </article>;
}

function LaneCards({ board, lane, onRoute }: { board: FlowBoard; lane: FlowLane; onRoute: FlowProps['onRoute'] }) {
  const cards = board.lanes[lane];
  if (cards.length === 0) return <li className="flow-lane-empty">No items</li>;
  return <>{cards.map((card) => <li key={card.id}><FlowCardView card={card} onRoute={onRoute} /></li>)}</>;
}

export function Flow({ outcomes, continuity, onRoute }: FlowProps) {
  const [selectedLane, setSelectedLane] = useState<FlowLane>('Active');
  const board = projectFlow(outcomes);

  return <section className="flow-surface" aria-labelledby="flow-heading">
    <div className="flow-heading"><div><p className="eyebrow">Project surface</p><h1 id="flow-heading">Flow</h1><p>Outcome-level work across the active project. Technical subtasks stay nested until expanded.</p></div></div>
    <p className="derived-state" role="status">{outcomes.length === 0
      ? 'No missions yet. Start one from Focus; Workbench has not inferred an engineering board from ordinary files.'
      : 'Lanes come from recorded agent runs and your review decisions. Work is Accepted only after you accept it in Review.'}</p>
    {continuity && <article className="card continuity-card"><p className="card-label">Task lineage</p><h2>{continuity.currentTaskId} · version {continuity.currentTaskVersion}</h2><p dir="auto">{`Current durable work: ${continuity.currentTaskId} v${continuity.currentTaskVersion} is ${continuity.status} via ${continuity.harness}.`}</p><p dir="auto">{continuity.resultSummary}</p><p><strong>Remaining:</strong> {continuity.remaining.length > 0 ? continuity.remaining.join(' · ') : 'Nothing recorded'}</p><p><strong>Next:</strong> {continuity.nextAction}</p></article>}

    <div className="flow-board" aria-label="Flow outcome board">
      {FLOW_LANES.map((lane) => <section key={lane} className="flow-lane" aria-labelledby={`flow-lane-heading-${lane}`}>
        <h2 id={`flow-lane-heading-${lane}`}>{lane}<span className="flow-lane-count" aria-hidden="true">{board.lanes[lane].length}</span></h2>
        <ul className="flow-lane-cards"><LaneCards board={board} lane={lane} onRoute={onRoute} /></ul>
      </section>)}
    </div>

    <div className="flow-mobile">
      <div className="flow-filter" role="tablist" aria-label="Filter by outcome state">
        {FLOW_LANES.map((lane) => <button key={lane} type="button" role="tab" aria-selected={selectedLane === lane} className={selectedLane === lane ? 'is-active' : ''} onClick={() => setSelectedLane(lane)}>{lane} <span className="flow-lane-count" aria-hidden="true">{board.lanes[lane].length}</span></button>)}
      </div>
      <ul className="flow-mobile-cards" aria-label={`${selectedLane} outcomes`}><LaneCards board={board} lane={selectedLane} onRoute={onRoute} /></ul>
    </div>
  </section>;
}
