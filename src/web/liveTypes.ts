import type { ReviewItemFixture } from '../core/projection/ReviewProjection.js';
import type { FlowOutcomeFixture } from '../core/projection/FlowProjection.js';

export type View = 'FOCUS' | 'FIELD' | 'FLOW' | 'REVIEW' | 'OUTPUT';

export type WorkspaceSummary = {
  id: string;
  displayName: string;
  classification: 'ready' | 'needs_onboarding' | 'invalid';
  registeredAt: string;
  lastOpenedAt: string | null;
  active: boolean;
  errorReceipt: { code: string; message: string; safeState: 'read_only' } | null;
};

export type FocusProjection = {
  surface: 'FOCUS';
  projectId: string;
  canonicalHash: string;
  projectName: string;
  currentObjective: string;
  currentQuestion: { id: string; name: string; lifecycle: string; evidenceState: string } | null;
  state: string;
  latestAcceptedDecision: { id: string; name: string } | null;
  humanReviewNeed: { count: number; status: 'none' | 'needs_review' };
  latestOutput: LiveArtifact | null;
  nextAction: { command: 'CMD-WORK'; targetId: string; label: string };
};

export type LiveObject = {
  id: string;
  type: string;
  name: string;
  lifecycle: string;
  evidence_state: string;
  verification_state: string;
};

export type LiveRelation = {
  id: string;
  participants: string[];
  relation_type: string | null;
  classification_state: string;
  evidence_state: string;
  use_status: string;
  claimability: string;
  descriptors?: string[];
  uncertainty?: string;
  evidence_refs?: string[];
  origin?: { kind?: string };
  history_event_refs?: string[];
};

export type FieldProjection = {
  currentObject: LiveObject | null;
  nodes: LiveObject[];
  relations: LiveRelation[];
  hiddenByProjection: number;
  layout: Record<string, { x: number; y: number }>;
};

export type LiveArtifact = {
  id: string;
  name: string;
  kind: string;
  ref: string;
  canonicality: string;
  verification_state: string;
};

export type WorkspaceProjection = {
  workspace: WorkspaceSummary;
  focus: FocusProjection | null;
  field: FieldProjection | null;
  artifacts: LiveArtifact[];
  orientation: { label: string; entryCount: number; entries: string[] } | null;
  continuity: ContinuitySummary | null;
};

export type ContinuitySummary = {
  currentTaskId: string;
  currentTaskVersion: number;
  latestRunId: string;
  harness: 'claude' | 'codex' | 'hermes' | 'manual' | 'fake';
  model: string;
  effort: string;
  status: string;
  resultSummary: string;
  evidenceState: 'observed' | 'unverified';
  changedRefs: string[];
  remaining: string[];
  nextAction: string;
  recordedAt: string;
};

export type AgentCapability = { id: 'claude' | 'codex' | 'hermes'; level: 'available' | 'partial' | 'unavailable'; version: string | null; reason: string | null };

export type FileChange = { path: string; kind: 'added' | 'modified' | 'deleted' };

/** A live Review proposal from a sandboxed mission; it carries its own current base hash for stale detection. */
export type LiveReviewItem = ReviewItemFixture & {
  currentBaseCanonicalHash: string;
  runId: string;
  missionId: string;
  taskId: string;
  taskVersion: number;
  harness: AgentCapability['id'];
  changes: FileChange[];
  systemView: {
    intent: string | null;
    behavior: string | null;
    architecture: string[];
    implementation: string[];
    verification: string[];
    terms: Array<{ term: string; plain_system_meaning: string; why_it_matters: string; exact_detail: string | null }>;
  } | null;
};

export type LiveFlowOutcome = FlowOutcomeFixture;

export type MissionStartRequest = {
  harness: AgentCapability['id'];
  target: string;
  outcome: string;
  acceptance: string[];
  continueProposalId?: string | null;
};
