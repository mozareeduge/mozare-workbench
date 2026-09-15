import type { CanonicalArtifact } from '../workspace.js';

export const FOCUS_SURFACE = 'FOCUS' as const;
export const MAX_FOCUS_FACT_BLOCKS = 7;

export type FocusFact = {
  id: string;
  label: string;
  value: string;
};

/**
 * A deterministic, derived view of a project. It is deliberately small: the
 * complete object history remains available to later Trace/Field surfaces.
 */
export type ProjectProjection = {
  surface: typeof FOCUS_SURFACE;
  projectId: string;
  canonicalHash: string;
  projectName: string;
  currentObjective: string;
  currentQuestion: { id: string; name: string; lifecycle: string; evidenceState: string };
  state: string;
  latestAcceptedDecision: { id: string; name: string } | null;
  humanReviewNeed: { count: number; status: 'none' | 'needs_review' };
  latestOutput: CanonicalArtifact | null;
  nextAction: { command: 'CMD-WORK'; targetId: string; label: string };
  historySummary: { totalObjects: number; hiddenHistoricalItems: number };
  facts: FocusFact[];
};
