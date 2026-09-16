import { describe, expect, it } from 'vitest';
import {
  FlowFixtureValidationError,
  deriveOutcomeLane,
  projectFlow,
  validateFlowFixture,
  type FlowOutcomeFixture,
} from '../../src/core/projection/FlowProjection.js';

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

describe('TEST-019: Flow outcome hierarchy', () => {
  it('derives Ready/Active/Blocked/Review/Accepted lanes from run state, blocked taking priority', () => {
    expect(deriveOutcomeLane({ runState: 'not_started' })).toBe('Ready');
    expect(deriveOutcomeLane({ runState: 'in_progress' })).toBe('Active');
    expect(deriveOutcomeLane({ runState: 'completed_awaiting_review' })).toBe('Review');
    expect(deriveOutcomeLane({ runState: 'accepted' })).toBe('Accepted');
    expect(
      deriveOutcomeLane({
        runState: 'accepted',
        blockedBy: { reason: 'x', routeLabel: 'y', routeId: 'z' },
      }),
    ).toBe('Blocked');
  });

  it('groups outcome cards by observed lane, nests technical subtasks, and exposes progress', () => {
    const board = projectFlow(fixtures);
    expect(board.lanes.Ready.map((card) => card.id)).toEqual(['out_ready_01']);
    expect(board.lanes.Active.map((card) => card.id)).toEqual(['out_active_01']);
    expect(board.lanes.Blocked.map((card) => card.id)).toEqual(['out_blocked_01']);
    expect(board.lanes.Review.map((card) => card.id)).toEqual(['out_review_01']);
    expect(board.lanes.Accepted.map((card) => card.id)).toEqual(['out_accepted_01']);

    const active = board.lanes.Active[0];
    expect(active.progress).toEqual({ done: 2, total: 3 });
    expect(active.subtasks).toHaveLength(3);

    const blocked = board.lanes.Blocked[0];
    expect(blocked.blocker?.reason).toMatch(/source reference/i);
    expect(blocked.blocker?.routeLabel).toBe('Open repair route');
  });

  it('positive proof: a completed-but-unreviewed run lands in Review, never Accepted', () => {
    const board = projectFlow(fixtures);
    expect(board.lanes.Review.some((card) => card.id === 'out_review_01')).toBe(true);
    expect(board.lanes.Accepted.some((card) => card.id === 'out_review_01')).toBe(false);
  });

  it('negative control: a fixture that maps a completed-but-unreviewed run directly to Accepted fails', () => {
    const badFixture: FlowOutcomeFixture = {
      id: 'out_bad_01',
      title: 'Invalid demo fixture',
      owner: 'You',
      runState: 'completed_awaiting_review',
      declaredLane: 'Accepted',
    };
    expect(() => validateFlowFixture(badFixture)).toThrow(FlowFixtureValidationError);
    expect(() => projectFlow([...fixtures, badFixture])).toThrow(/never be declared Accepted/i);
  });
});
