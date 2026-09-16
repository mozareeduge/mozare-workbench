import { useState } from 'react';
import { FLOW_LANES, projectFlow, type FlowCard, type FlowLane, type FlowOutcomeFixture } from '../../core/projection/FlowProjection.js';

const fixtures: FlowOutcomeFixture[] = [
  { id: 'out_ready_01', title: 'Draft the rhythm comparison brief', owner: 'You', runState: 'not_started' },
  {
    id: 'out_active_01',
    title: 'Rhythm comparison pass v2',
    owner: 'You + agent',
    runState: 'in_progress',
    subtasks: [
      { id: 'st1', title: 'Annotate verse 3 cut', done: true },
      { id: 'st2', title: 'Annotate verse 4 cut', done: true },
      { id: 'st3', title: 'Cross-check rhythmic markers', done: false },
    ],
  },
  {
    id: 'out_blocked_01',
    title: 'Publish verse 3 remix candidate',
    owner: 'You',
    runState: 'in_progress',
    blockedBy: {
      reason: 'Source reference for the verse 3 annotation could not be resolved.',
      routeLabel: 'Open repair route',
      routeId: 'repair_20260914_example01',
    },
  },
  { id: 'out_review_01', title: 'Verse 3 listening cut render', owner: 'Agent · render pipeline', runState: 'completed_awaiting_review' },
  { id: 'out_accepted_01', title: 'Keep the vocal trace audible', owner: 'You', runState: 'accepted' },
];

const board = projectFlow(fixtures);

function FlowCardView({ card }: { card: FlowCard }) {
  return <article className="flow-card">
    <p className="flow-card-owner">{card.owner}</p>
    <h3>{card.title}</h3>
    {card.progress && <p className="flow-card-progress">
      <span className="flow-progress-track" aria-hidden="true"><span className="flow-progress-fill" style={{ width: `${Math.round((card.progress.done / card.progress.total) * 100)}%` }} /></span>
      <span>{card.progress.done}/{card.progress.total} subtasks complete</span>
    </p>}
    {card.blocker && <p className="flow-card-blocker">
      <span className="flow-blocked-icon" aria-hidden="true">!</span>
      <span>{card.blocker.reason}</span>
      <button type="button" className="flow-blocker-route">{card.blocker.routeLabel}</button>
    </p>}
    {card.lane === 'Review' && <p className="flow-card-review-note">Completed — awaiting review, not yet accepted.</p>}
    {card.subtasks.length > 0 && <details className="flow-card-subtasks">
      <summary>Technical subtasks ({card.subtasks.filter((subtask) => subtask.done).length}/{card.subtasks.length})</summary>
      <ul>{card.subtasks.map((subtask) => <li key={subtask.id} className={subtask.done ? 'is-done' : ''}>{subtask.title}</li>)}</ul>
    </details>}
  </article>;
}

function LaneCards({ lane }: { lane: FlowLane }) {
  const cards = board.lanes[lane];
  if (cards.length === 0) return <li className="flow-lane-empty">No items</li>;
  return <>{cards.map((card) => <li key={card.id}><FlowCardView card={card} /></li>)}</>;
}

export function Flow() {
  const [selectedLane, setSelectedLane] = useState<FlowLane>('Active');

  return <section className="flow-surface" aria-labelledby="flow-heading">
    <div className="flow-heading"><div><p className="eyebrow">Project surface</p><h1 id="flow-heading">Flow</h1><p>Outcome-level work across the mission board. Technical subtasks stay nested until expanded.</p></div></div>
    <p className="derived-state" role="status">Flow represents outcome state, not an engineering task board. Blocked items always show their cause and a route to it.</p>

    <div className="flow-board" aria-label="Flow outcome board">
      {FLOW_LANES.map((lane) => <section key={lane} className="flow-lane" aria-labelledby={`flow-lane-heading-${lane}`}>
        <h2 id={`flow-lane-heading-${lane}`}>{lane}<span className="flow-lane-count" aria-hidden="true">{board.lanes[lane].length}</span></h2>
        <ul className="flow-lane-cards"><LaneCards lane={lane} /></ul>
      </section>)}
    </div>

    <div className="flow-mobile">
      <div className="flow-filter" role="tablist" aria-label="Filter by outcome state">
        {FLOW_LANES.map((lane) => <button key={lane} type="button" role="tab" aria-selected={selectedLane === lane} className={selectedLane === lane ? 'is-active' : ''} onClick={() => setSelectedLane(lane)}>{lane} <span className="flow-lane-count" aria-hidden="true">{board.lanes[lane].length}</span></button>)}
      </div>
      <ul className="flow-mobile-cards" aria-label={`${selectedLane} outcomes`}><LaneCards lane={selectedLane} /></ul>
    </div>
  </section>;
}
