import { randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import type { ReviewDecisionState, ReviewItemFixture } from '../../core/projection/ReviewProjection.js';
import type { RealHarnessId } from '../agents/HarnessAdapter.js';
import { combinedHash, hashFiles, type FileChange } from './ProjectSnapshot.js';

/** The agent's own plain-language account of the change (handoff system_view + technical_terms), bounded. */
export type ProposalSystemView = {
  intent: string | null;
  behavior: string | null;
  architecture: string[];
  implementation: string[];
  verification: string[];
  terms: Array<{ term: string; plain_system_meaning: string; why_it_matters: string; exact_detail: string | null }>;
};

/** A review proposal produced by a sandboxed mission run. Sandbox and hashes stay server-side. */
export type StoredProposal = Omit<ReviewItemFixture, 'decisionState' | 'decisionRationale' | 'revisionNote'> & {
  workspaceId: string;
  runId: string;
  missionId: string;
  taskId: string;
  taskVersion: number;
  harness: RealHarnessId;
  objective: string;
  changes: FileChange[];
  baseHashes: Record<string, string | null>;
  sandbox: string;
  systemView?: ProposalSystemView | null;
};

export type ProposalDecision = {
  proposalId: string;
  state: Exclude<ReviewDecisionState, 'under_review'>;
  rationale: string | null;
  revisionNote: string | null;
  decidedAt: string;
  applied: { written: string[]; movedToResidue: string[] } | null;
};

/** What the browser receives: the review item plus its own current base hash; no filesystem paths. */
export type PublicReviewItem = ReviewItemFixture & {
  currentBaseCanonicalHash: string;
  runId: string;
  missionId: string;
  taskId: string;
  taskVersion: number;
  harness: RealHarnessId;
  changes: FileChange[];
  systemView: ProposalSystemView | null;
};

export class ProposalConflictError extends Error {
  constructor(readonly code: 'stale_base' | 'already_decided' | 'rationale_required' | 'revision_note_required', message: string) {
    super(message);
    this.name = 'ProposalConflictError';
  }
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  renameSync(temporary, path);
}

function contained(root: string, path: string): string {
  const target = resolve(root, path);
  const rel = relative(resolve(root), target);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) throw new Error(`proposal path escapes the project: ${path}`);
  return target;
}

export class ProposalStore {
  constructor(private readonly directory: string) {}

  private workspaceDirectory(workspaceId: string): string {
    return join(this.directory, workspaceId);
  }

  save(proposal: StoredProposal): StoredProposal {
    atomicJson(join(this.workspaceDirectory(proposal.workspaceId), `${proposal.id}.json`), proposal);
    return proposal;
  }

  list(workspaceId: string): StoredProposal[] {
    const directory = this.workspaceDirectory(workspaceId);
    if (!existsSync(directory)) return [];
    return readdirSync(directory)
      .filter((name) => name.endsWith('.json'))
      .map((name) => JSON.parse(readFileSync(join(directory, name), 'utf8')) as StoredProposal);
  }

  get(workspaceId: string, proposalId: string): StoredProposal | null {
    if (!/^prp_[a-z0-9-]+$/.test(proposalId)) return null;
    const path = join(this.workspaceDirectory(workspaceId), `${proposalId}.json`);
    return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as StoredProposal : null;
  }

  /** Decisions are append-only files; the latest one is the proposal's state. */
  latestDecision(workspaceId: string, proposalId: string): ProposalDecision | null {
    const directory = join(this.workspaceDirectory(workspaceId), `${proposalId}.decisions`);
    if (!existsSync(directory)) return null;
    const names = readdirSync(directory).filter((name) => name.endsWith('.json')).sort();
    return names.length === 0 ? null : JSON.parse(readFileSync(join(directory, names[names.length - 1]), 'utf8')) as ProposalDecision;
  }

  currentBaseHash(proposal: StoredProposal, projectRoot: string): string {
    return combinedHash(hashFiles(projectRoot, Object.keys(proposal.baseHashes)));
  }

  toPublic(proposal: StoredProposal, projectRoot: string): PublicReviewItem {
    const decision = this.latestDecision(proposal.workspaceId, proposal.id);
    const item: PublicReviewItem = {
      id: proposal.id, projectId: proposal.projectId, target: proposal.target, title: proposal.title, risk: proposal.risk,
      highRiskPolicy: proposal.highRiskPolicy, createdAt: proposal.createdAt, baseCanonicalHash: proposal.baseCanonicalHash,
      effect: proposal.effect, evidence: proposal.evidence, impact: proposal.impact, architecture: proposal.architecture,
      implementation: proposal.implementation, runId: proposal.runId, missionId: proposal.missionId, taskId: proposal.taskId,
      taskVersion: proposal.taskVersion, harness: proposal.harness, changes: proposal.changes, systemView: proposal.systemView ?? null,
      currentBaseCanonicalHash: this.currentBaseHash(proposal, projectRoot),
    };
    return {
      ...item,
      decisionState: decision?.state ?? 'under_review',
      decisionRationale: decision?.rationale ?? null,
      revisionNote: decision?.revisionNote ?? null,
    };
  }

  /**
   * Records an owner decision. Only `accepted` writes to the project, and only when every
   * touched file still has the hash it had when the mission started; deletions move the
   * project file into Workbench residue instead of destroying it.
   */
  decide(
    proposal: StoredProposal,
    projectRoot: string,
    residueRoot: string,
    input: { state: ProposalDecision['state']; rationale?: string | null; revisionNote?: string | null },
  ): ProposalDecision {
    if (this.latestDecision(proposal.workspaceId, proposal.id)) throw new ProposalConflictError('already_decided', 'This proposal already has a decision.');
    const rationale = input.rationale?.trim() || null;
    const revisionNote = input.revisionNote?.trim() || null;
    if (input.state === 'rejected' && proposal.highRiskPolicy && !rationale) throw new ProposalConflictError('rationale_required', 'A rationale is required to reject under this review policy.');
    if (input.state === 'revision_requested' && !revisionNote) throw new ProposalConflictError('revision_note_required', 'A revision note is required.');
    let applied: ProposalDecision['applied'] = null;
    if (input.state === 'accepted') {
      if (this.currentBaseHash(proposal, projectRoot) !== proposal.baseCanonicalHash) {
        throw new ProposalConflictError('stale_base', 'The project changed since this proposal was created. Nothing was written.');
      }
      applied = { written: [], movedToResidue: [] };
      for (const change of proposal.changes) {
        const target = contained(projectRoot, change.path);
        if (change.kind === 'deleted') {
          if (!existsSync(target)) continue;
          const residue = contained(join(residueRoot, proposal.id), change.path);
          mkdirSync(dirname(residue), { recursive: true });
          copyFileSync(target, residue);
          unlinkSync(target);
          applied.movedToResidue.push(change.path);
        } else {
          mkdirSync(dirname(target), { recursive: true });
          copyFileSync(contained(proposal.sandbox, change.path), target);
          applied.written.push(change.path);
        }
      }
    }
    const decision: ProposalDecision = { proposalId: proposal.id, state: input.state, rationale, revisionNote, decidedAt: new Date().toISOString(), applied };
    atomicJson(join(this.workspaceDirectory(proposal.workspaceId), `${proposal.id}.decisions`, `${decision.decidedAt.replace(/[:.]/g, '-')}.json`), decision);
    return decision;
  }
}
