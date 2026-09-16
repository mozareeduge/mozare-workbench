/**
 * Flow is outcome-level work, not an engineering task board (DEC-011). This module derives
 * a bounded, fixture/demo-scoped outcome board from declared run state. It never imports
 * `node:*` modules: it is bundled for the browser by Vite via `src/web/surfaces/Flow.tsx`.
 */

export const FLOW_LANES = ['Ready', 'Active', 'Blocked', 'Review', 'Accepted'] as const;
export type FlowLane = (typeof FLOW_LANES)[number];

/** The observed run state of an outcome-level item, independent of any declared lane. */
export type FlowRunState = 'not_started' | 'in_progress' | 'completed_awaiting_review' | 'accepted';

export type FlowSubtask = { id: string; title: string; done: boolean };

export type FlowBlocker = { reason: string; routeLabel: string; routeId: string };

/**
 * A fixture/demo-scoped outcome record. `declaredLane`, when present, is a claim from the
 * fixture source (mirroring an untrusted external feed) that must agree with the lane the
 * observed `runState`/`blockedBy` imply. This is what makes ORACLE-042's "a completed run
 * awaiting review is never shown Accepted" a structural property of `projectFlow`, not an
 * accident of well-behaved demo data.
 */
export type FlowOutcomeFixture = {
  id: string;
  title: string;
  owner: string;
  runState: FlowRunState;
  declaredLane?: FlowLane;
  blockedBy?: FlowBlocker;
  subtasks?: FlowSubtask[];
};

export type FlowCard = {
  id: string;
  title: string;
  owner: string;
  lane: FlowLane;
  progress: { done: number; total: number } | null;
  blocker: FlowBlocker | null;
  subtasks: FlowSubtask[];
};

export type FlowBoard = { lanes: Record<FlowLane, FlowCard[]> };

export class FlowFixtureValidationError extends Error {
  constructor(message: string, readonly fixtureId: string) {
    super(message);
    this.name = 'FlowFixtureValidationError';
  }
}

/** A blocked dependency always outranks run progress: a blocked item is never shown as Active/Ready. */
export function deriveOutcomeLane(fixture: Pick<FlowOutcomeFixture, 'runState' | 'blockedBy'>): FlowLane {
  if (fixture.blockedBy) return 'Blocked';
  switch (fixture.runState) {
    case 'not_started':
      return 'Ready';
    case 'in_progress':
      return 'Active';
    case 'completed_awaiting_review':
      return 'Review';
    case 'accepted':
      return 'Accepted';
    default:
      throw new FlowFixtureValidationError(`Unknown run state: ${String(fixture.runState)}`, 'unknown');
  }
}

/**
 * Rejects any fixture whose `declaredLane` disagrees with the lane observed state implies.
 * This is the enforcement point for TEST-019's negative control: a fixture that maps a
 * completed-but-unreviewed run directly to Accepted must fail here, not render silently.
 */
export function validateFlowFixture(fixture: FlowOutcomeFixture): FlowOutcomeFixture {
  const observedLane = deriveOutcomeLane(fixture);
  if (fixture.declaredLane && fixture.declaredLane !== observedLane) {
    throw new FlowFixtureValidationError(
      `Fixture "${fixture.id}" declares lane "${fixture.declaredLane}" but its observed state ` +
        `(runState="${fixture.runState}"${fixture.blockedBy ? ', blocked' : ''}) implies lane "${observedLane}". ` +
        'A completed run awaiting review must never be declared Accepted.',
      fixture.id,
    );
  }
  return fixture;
}

function toCard(fixture: FlowOutcomeFixture): FlowCard {
  const subtasks = fixture.subtasks ?? [];
  return {
    id: fixture.id,
    title: fixture.title,
    owner: fixture.owner,
    lane: deriveOutcomeLane(fixture),
    progress: subtasks.length > 0 ? { done: subtasks.filter((subtask) => subtask.done).length, total: subtasks.length } : null,
    blocker: fixture.blockedBy ?? null,
    subtasks,
  };
}

/** Validates every fixture, then groups the resulting cards by their observed lane. */
export function projectFlow(fixtures: FlowOutcomeFixture[]): FlowBoard {
  const validated = fixtures.map(validateFlowFixture);
  const lanes = Object.fromEntries(FLOW_LANES.map((lane) => [lane, [] as FlowCard[]])) as Record<FlowLane, FlowCard[]>;
  for (const fixture of validated) {
    const card = toCard(fixture);
    lanes[card.lane].push(card);
  }
  return { lanes };
}
