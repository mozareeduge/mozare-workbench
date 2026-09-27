import { useState } from 'react';
import { FLOW_LANES, projectFlow, type FlowBoard, type FlowCard, type FlowLane } from '../../core/projection/FlowProjection.js';
import type { ContinuitySummary, LiveFlowOutcome } from '../liveTypes';

export type FlowCardDetail = { text: string | null; facts: Array<[string, string]>; actions: Array<{ label: string; run: () => void }> };

type FlowProps = {
  outcomes: LiveFlowOutcome[];
  continuity: ContinuitySummary | null;
  /** Opens the route a blocked card names (for live runs: continue the task with another agent). */
  onRoute: (card: FlowCard) => void;
  /** What the card is, who worked on it, and what you can do next. */
  describe: (card: FlowCard) => FlowCardDetail;
};

function FlowCardView({ card, onRoute, selected, onSelect }: { card: FlowCard; onRoute: FlowProps['onRoute']; selected: boolean; onSelect: (card: FlowCard) => void }) {
  return <article className={selected ? 'flow-card is-selected' : 'flow-card'}>
    <p className="flow-card-owner">{card.owner}</p>
    <h3 dir="auto"><button type="button" className="flow-card-open" aria-expanded={selected} onClick={() => onSelect(card)}>{card.title}</button></h3>
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

function LaneCards({ board, lane, onRoute, selectedId, onSelect }: { board: FlowBoard; lane: FlowLane; onRoute: FlowProps['onRoute']; selectedId: string | null; onSelect: (card: FlowCard) => void }) {
  const cards = board.lanes[lane];
  if (cards.length === 0) return <li className="flow-lane-empty">No items</li>;
  return <>{cards.map((card) => <li key={card.id}><FlowCardView card={card} onRoute={onRoute} selected={card.id === selectedId} onSelect={onSelect} /></li>)}</>;
}

function CardDetail({ card, detail, onClose }: { card: FlowCard; detail: FlowCardDetail; onClose: () => void }) {
  return <aside className="card flow-detail" aria-label={`Details: ${card.title}`}>
    <div className="flow-detail-head"><div><p className="card-label">{card.lane} · {card.owner}</p><h2 dir="auto">{card.title}</h2></div><button type="button" onClick={onClose}>Close</button></div>
    {detail.text && <p dir="auto" className="review-preline">{detail.text}</p>}
    {detail.facts.length > 0 && <dl>{detail.facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd dir="auto">{value}</dd></div>)}</dl>}
    {detail.actions.length > 0 && <div className="setup-actions">{detail.actions.map((action, index) => <button key={action.label} type="button" className={index === 0 ? 'button button-primary' : 'button'} onClick={action.run}>{action.label}</button>)}</div>}
  </aside>;
}

export function Flow({ outcomes, continuity, onRoute, describe }: FlowProps) {
  const [selectedLane, setSelectedLane] = useState<FlowLane>('Active');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const board = projectFlow(outcomes);
  const selectedCard = Object.values(board.lanes).flat().find((card) => card.id === selectedId) ?? null;
  const onSelect = (card: FlowCard) => setSelectedId((current) => (current === card.id ? null : card.id));

  return <section className="flow-surface" aria-labelledby="flow-heading">
    <div className="flow-heading"><div><p className="eyebrow">Project surface</p><h1 id="flow-heading">Flow</h1><p>Outcome-level work across the active project. Technical subtasks stay nested until expanded.</p></div></div>
    <p className="derived-state" role="status">{outcomes.length === 0
      ? 'No missions yet. Start one from Focus; Workbench has not inferred an engineering board from ordinary files.'
      : 'Lanes come from recorded agent runs and your review decisions. Work is Accepted only after you accept it in Review.'}</p>
    {continuity && <article className="card continuity-card"><p className="card-label">Task lineage</p><h2>{continuity.currentTaskId} · version {continuity.currentTaskVersion}</h2><p dir="auto">{`Current durable work: ${continuity.currentTaskId} v${continuity.currentTaskVersion} is ${continuity.status} via ${continuity.harness}.`}</p><p dir="auto">{continuity.resultSummary}</p><p><strong>Remaining:</strong> {continuity.remaining.length > 0 ? continuity.remaining.join(' · ') : 'Nothing recorded'}</p><p><strong>Next:</strong> {continuity.nextAction}</p></article>}

    {selectedCard && <CardDetail card={selectedCard} detail={describe(selectedCard)} onClose={() => setSelectedId(null)} />}

    <div className="flow-board" aria-label="Flow outcome board">
      {FLOW_LANES.map((lane) => <section key={lane} className="flow-lane" aria-labelledby={`flow-lane-heading-${lane}`}>
        <h2 id={`flow-lane-heading-${lane}`}>{lane}<span className="flow-lane-count" aria-hidden="true">{board.lanes[lane].length}</span></h2>
        <ul className="flow-lane-cards"><LaneCards board={board} lane={lane} onRoute={onRoute} selectedId={selectedId} onSelect={onSelect} /></ul>
      </section>)}
    </div>

    <div className="flow-mobile">
      <div className="flow-filter" role="tablist" aria-label="Filter by outcome state">
        {FLOW_LANES.map((lane) => <button key={lane} type="button" role="tab" aria-selected={selectedLane === lane} className={selectedLane === lane ? 'is-active' : ''} onClick={() => setSelectedLane(lane)}>{lane} <span className="flow-lane-count" aria-hidden="true">{board.lanes[lane].length}</span></button>)}
      </div>
      <ul className="flow-mobile-cards" aria-label={`${selectedLane} outcomes`}><LaneCards board={board} lane={selectedLane} onRoute={onRoute} selectedId={selectedId} onSelect={onSelect} /></ul>
    </div>
  </section>;
}
