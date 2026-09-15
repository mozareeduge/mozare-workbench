import { canonicalHash, type WorkspaceSnapshot } from '../workspace.js';
import { FOCUS_SURFACE, MAX_FOCUS_FACT_BLOCKS, type ProjectProjection } from './projectionTypes.js';

/** Produces deterministic, bounded projections from validated canonical state. */
export class ProjectionEngine {
  project(snapshot: WorkspaceSnapshot): ProjectProjection {
    const currentQuestion = snapshot.objects.find(({ id }) => id === snapshot.project.current_question_id);
    if (!currentQuestion) {
      // loadWorkspace normally prevents this. Keep the projection boundary safe
      // if it is ever called with a hand-built snapshot.
      throw new Error(`Current question ${snapshot.project.current_question_id} is missing from the workspace snapshot`);
    }

    const latestOutput = snapshot.artifacts.at(-1) ?? null;
    const acceptedDecisions = snapshot.objects.filter((object) => object.type === 'decision' && object.lifecycle === 'accepted');
    const latestDecision = acceptedDecisions.at(-1) ?? null;
    const reviewCount = snapshot.objects.filter((object) =>
      (object.type === 'review' || object.type === 'proposal') && ['open', 'in_review', 'under_review'].includes(object.lifecycle),
    ).length;
    const facts = [
      { id: 'current-question', label: 'Current question', value: currentQuestion.name },
      { id: 'state', label: 'State', value: snapshot.project.lifecycle },
      { id: 'evidence', label: 'Evidence', value: currentQuestion.evidence_state },
      { id: 'review', label: 'Needs you', value: reviewCount === 0 ? 'No review items in canonical records' : `${reviewCount} review item${reviewCount === 1 ? '' : 's'} need your attention` },
      { id: 'latest-decision', label: 'Latest accepted decision', value: latestDecision?.name ?? 'No accepted decision in canonical records' },
      { id: 'latest-output', label: 'Latest output', value: latestOutput?.name ?? 'No output in canonical records' },
      { id: 'next-action', label: 'Next action', value: `Work on ${currentQuestion.name}` },
    ].slice(0, MAX_FOCUS_FACT_BLOCKS);

    return {
      surface: FOCUS_SURFACE,
      projectId: snapshot.project.id,
      canonicalHash: canonicalHash(snapshot),
      projectName: snapshot.project.name,
      currentObjective: snapshot.project.current_objective,
      currentQuestion: {
        id: currentQuestion.id,
        name: currentQuestion.name,
        lifecycle: currentQuestion.lifecycle,
        evidenceState: currentQuestion.evidence_state,
      },
      state: snapshot.project.lifecycle,
      latestAcceptedDecision: latestDecision ? { id: latestDecision.id, name: latestDecision.name } : null,
      humanReviewNeed: { count: reviewCount, status: reviewCount === 0 ? 'none' : 'needs_review' },
      latestOutput,
      nextAction: { command: 'CMD-WORK', targetId: currentQuestion.id, label: `Work on ${currentQuestion.name}` },
      historySummary: {
        totalObjects: snapshot.objects.length,
        hiddenHistoricalItems: Math.max(0, snapshot.objects.length - MAX_FOCUS_FACT_BLOCKS),
      },
      facts,
    };
  }
}
