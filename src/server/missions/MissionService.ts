import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { WorkLedger } from '../../core/continuity/WorkLedger.js';
import type { EvidenceFixture } from '../../core/projection/ReviewProjection.js';
import type { FlowOutcomeFixture } from '../../core/projection/FlowProjection.js';
import { HarnessCoordinator } from '../agents/HarnessCoordinator.js';
import type { HarnessAdapter, HarnessCapability, RealHarnessId } from '../agents/HarnessAdapter.js';
import { combinedHash, createSandbox, describeChanges, RUN_DIRECTORY_NAME, sandboxChanges, type FileHashes } from './ProjectSnapshot.js';
import type { ProposalStore, StoredProposal } from './ProposalStore.js';

export type MissionRequest = {
  harness: RealHarnessId;
  target: string;
  outcome: string;
  /** What the owner typed in the mission's Context field; passed to the agent verbatim. */
  context?: string | null;
  acceptance: string[];
  effort?: string | null;
  /** Continue a proposal's mission/task as the next task version (revision or harness switch). */
  continueProposalId?: string | null;
};

export type MissionContext = { workspaceId: string; projectRoot: string; projectId: string };

export type MissionReceipt = { runId: string; missionId: string; taskId: string; taskVersion: number; harness: RealHarnessId };

export class MissionUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissionUnavailableError';
  }
}

type Handoff = {
  summary?: string;
  state?: string;
  tests?: Array<{ name?: string; status?: string; command?: string | null; evidence?: string | null }>;
  open_questions?: unknown[];
  blockers?: unknown[];
  next_action?: string;
  system_view?: { architecture?: unknown[]; implementation?: unknown[]; verification?: unknown[]; intent?: string; behavior?: string };
  technical_terms?: Array<{ term?: unknown; plain_system_meaning?: unknown; why_it_matters?: unknown; exact_detail?: unknown }>;
  continuity?: { remaining?: unknown[] };
};

const CAPABILITY_TTL_MS = 60_000;

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.slice(0, 400)) : [];
}

/**
 * Runs owner-started missions: the chosen harness works on a Workbench-owned sandbox copy,
 * and its result becomes a Review proposal. The registered project is never written here;
 * only an explicit Accept in ProposalStore changes it.
 */
export class MissionService {
  private readonly coordinator: HarnessCoordinator;
  private capabilityCache: { at: number; value: HarnessCapability[] } | null = null;
  private readonly running = new Map<string, Promise<void>>();
  private readonly active = new Map<string, { workspaceId: string; taskId: string; title: string; harness: RealHarnessId }>();

  constructor(
    private readonly adapters: Record<RealHarnessId, HarnessAdapter>,
    private readonly ledger: WorkLedger,
    private readonly proposals: ProposalStore,
    private readonly runtimeDirectory: string,
  ) {
    this.coordinator = new HarnessCoordinator(adapters, ledger);
  }

  async capabilities(): Promise<HarnessCapability[]> {
    if (this.capabilityCache && Date.now() - this.capabilityCache.at < CAPABILITY_TTL_MS) return this.capabilityCache.value;
    const value = await Promise.all((Object.keys(this.adapters) as RealHarnessId[]).map((id) => this.adapters[id].probe()));
    this.capabilityCache = { at: Date.now(), value };
    return value;
  }

  /** Resolves when the run and its proposal are recorded (used by tests and shutdown). */
  settled(runId: string): Promise<void> {
    return this.running.get(runId) ?? Promise.resolve();
  }

  stop(runId: string): boolean {
    return this.coordinator.stop(runId);
  }

  async start(context: MissionContext, request: MissionRequest): Promise<MissionReceipt> {
    if (!['claude', 'codex', 'hermes'].includes(request.harness)) throw new MissionUnavailableError('Unknown agent.');
    const acceptance = request.acceptance.map((item) => item.trim()).filter(Boolean);
    if (acceptance.length === 0) throw new MissionUnavailableError('At least one observable acceptance criterion is required.');
    const capability = (await this.capabilities()).find((item) => item.harness === request.harness);
    if (capability?.level !== 'available') throw new MissionUnavailableError(`${request.harness} is unavailable: ${capability?.reason ?? 'not detected'}.`);

    const previous = request.continueProposalId ? this.proposals.get(context.workspaceId, request.continueProposalId) : null;
    if (request.continueProposalId && !previous) throw new MissionUnavailableError('The proposal to continue was not found.');
    const short = randomUUID().slice(0, 8);
    const missionId = previous?.missionId ?? `mission-${short}`;
    const taskId = previous?.taskId ?? `task-${short}`;
    const taskVersion = previous ? previous.taskVersion + 1 : 1;
    const runId = `run-${Date.now()}-${request.harness}-${short}`;
    const revisionNote = previous ? this.proposals.latestDecision(context.workspaceId, previous.id)?.revisionNote ?? null : null;
    const objective = [
      `Target: ${request.target.trim()}`,
      `Outcome: ${request.outcome.trim() || request.target.trim()}`,
      ...(request.context?.trim() ? [`Context from the owner: ${request.context.trim().slice(0, 4000)}`] : []),
      `Acceptance: ${acceptance.join(' | ')}`,
      ...(revisionNote ? [`Owner revision request: ${revisionNote}`] : []),
    ].join('\n');

    const missionRoot = join(this.runtimeDirectory, 'missions', context.workspaceId, runId);
    const sandbox = join(missionRoot, 'sandbox');
    const baseline = createSandbox(context.projectRoot, sandbox);
    const runDirectory = join(sandbox, RUN_DIRECTORY_NAME);
    mkdirSync(runDirectory, { recursive: true });
    const contextPackRef = join(runDirectory, 'context-pack.json');
    writeFileSync(contextPackRef, `${JSON.stringify({
      id: `CTX-${runId}`, mission_id: missionId, profile: 'technical', objective,
      authority: ['AUTHORITY/08'], items: [], expansion_handles: [], metrics: { duplicate_count: 0, duplicate_ratio: 0 },
      budget: { target_tokens: 2000, hard_tokens: 6000, estimated_tokens: Math.ceil(objective.length / 4), tier: 'simple_mission' },
    }, null, 2)}\n`, 'utf8');

    // A continuation keeps the task's original project identity so its version chain stays intact.
    const projectId = previous?.projectId ?? context.projectId;
    const execution = this.coordinator.begin(request.harness, {
      runId, projectId, missionId, taskId, taskVersion, workspaceRoot: sandbox, runDirectory,
      objective, contextPackRef, contextSnapshotRef: null, authorityRefs: ['AUTHORITY/08'], oracleRefs: ['ORACLE-007', 'ORACLE-010'],
      model: null, effort: request.harness === 'codex' ? null : request.effort ?? null, mode: 'work',
      routeTier: 'CODING_AGENT', nextAction: 'Review the proposal, or continue the task with another agent.',
    });
    const done = execution.completion
      .then(async (result) => {
        if (!result.harnessResult?.handoffRef) return;
        await this.recordProposal({ ...context, projectId }, { runId, missionId, taskId, taskVersion, harness: request.harness, objective, target: request.target.trim(), sandbox, baseline, missionRoot, handoffRef: result.harnessResult.handoffRef });
      })
      .catch(() => undefined)
      .finally(() => { this.running.delete(runId); this.active.delete(runId); });
    this.running.set(runId, done);
    this.active.set(runId, { workspaceId: context.workspaceId, taskId, title: request.target.trim(), harness: request.harness });
    return { runId, missionId, taskId, taskVersion, harness: request.harness };
  }

  /**
   * Outcome-level Flow items for one workspace: running missions are Active, stopped or failed
   * runs are Blocked with a continue route, proposals awaiting a decision are Review, and only
   * owner-accepted proposals are Accepted. Rejected or preserved work leaves the board.
   */
  flowOutcomes(context: MissionContext): FlowOutcomeFixture[] {
    const outcomes = new Map<string, FlowOutcomeFixture>();
    const proposals = this.proposals.list(context.workspaceId);
    const latestByTask = new Map<string, StoredProposal>();
    for (const proposal of proposals) {
      const seen = latestByTask.get(proposal.taskId);
      if (!seen || proposal.taskVersion > seen.taskVersion) latestByTask.set(proposal.taskId, proposal);
    }
    // Accepted changes can alter a project's canonical identity, so also follow the project IDs this workspace's proposals were made under.
    const projectIds = new Set([context.projectId, ...proposals.map((proposal) => proposal.projectId)]);
    const records = [...projectIds].flatMap((projectId) => this.ledger.records({ projectId }));
    for (const record of records) {
      const resolved = this.ledger.resolveTask(record.projectId, record.missionId, record.taskId).current;
      if (!resolved || outcomes.has(record.taskId)) continue;
      const proposal = latestByTask.get(record.taskId);
      const owner = `Agent · ${resolved.harness}`;
      const title = proposal?.target ?? resolved.resultSummary;
      if (resolved.status === 'completed') {
        if (!proposal || proposal.runId !== resolved.runId) {
          outcomes.set(record.taskId, { id: record.taskId, title, owner, runState: 'completed_awaiting_review' });
          continue;
        }
        const decision = this.proposals.latestDecision(context.workspaceId, proposal.id)?.state;
        if (decision === 'rejected' || decision === 'preserved_as_residue') continue;
        const runState = decision === 'accepted' ? 'accepted' : decision === 'revision_requested' ? 'not_started' : 'completed_awaiting_review';
        outcomes.set(record.taskId, { id: record.taskId, title, owner: decision === 'accepted' ? 'You + agent' : owner, runState });
      } else if (['parked', 'failed', 'interrupted', 'needs_input'].includes(resolved.status)) {
        outcomes.set(record.taskId, {
          id: record.taskId, title, owner, runState: 'in_progress',
          blockedBy: { reason: resolved.blockers[0] ?? `The ${resolved.harness} run ${resolved.status}.`, routeLabel: 'Continue with another agent', routeId: record.taskId },
        });
      } else {
        outcomes.set(record.taskId, { id: record.taskId, title, owner, runState: resolved.status === 'queued' ? 'not_started' : 'in_progress' });
      }
    }
    for (const run of this.active.values()) {
      if (run.workspaceId === context.workspaceId) outcomes.set(run.taskId, { id: run.taskId, title: run.title, owner: `Agent · ${run.harness}`, runState: 'in_progress' });
    }
    return [...outcomes.values()];
  }

  private async recordProposal(
    context: MissionContext,
    run: { runId: string; missionId: string; taskId: string; taskVersion: number; harness: RealHarnessId; objective: string; target: string; sandbox: string; baseline: FileHashes; missionRoot: string; handoffRef: string },
  ): Promise<StoredProposal> {
    const handoff = existsSync(run.handoffRef) ? JSON.parse(readFileSync(run.handoffRef, 'utf8')) as Handoff : {};
    const changes = sandboxChanges(run.sandbox, run.baseline);
    const baseHashes = Object.fromEntries(changes.map((change) => [change.path, run.baseline[change.path] ?? null]));
    const diffText = changes.length > 0 ? await describeChanges(context.projectRoot, run.sandbox, changes, join(run.missionRoot, 'scratch')) : 'The agent made no file changes.';
    // Agent-reported tests are claims: the evidence text is kept in the name and never counted as observed.
    const claims: EvidenceFixture[] = (handoff.tests ?? []).map((test) => ({
      name: `${test.name ?? 'Agent-reported check'}${test.evidence ? ` — ${String(test.evidence).slice(0, 300)}` : ''}`,
      status: test.status === 'failed' ? 'failed' : test.status === 'skipped' ? 'skipped' : test.status === 'not_run' ? 'not_run' : 'passed',
      command: test.command ?? null,
      evidence: null,
    }));
    const evidence = claims.length > 0 ? claims : [{ name: 'The agent reported no verification for this run', status: 'not_run' as const, command: null, evidence: null }];
    const remaining = [...strings(handoff.continuity?.remaining), ...strings(handoff.open_questions), ...strings(handoff.blockers)];
    const summary = typeof handoff.summary === 'string' && handoff.summary.trim() ? handoff.summary.trim().slice(0, 600) : `${run.harness} finished without a summary.`;
    const counts = (['added', 'modified', 'deleted'] as const).map((kind) => `${changes.filter((change) => change.kind === kind).length} ${kind}`).join(', ');
    return this.proposals.save({
      id: `prp_${run.runId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`,
      workspaceId: context.workspaceId,
      runId: run.runId,
      missionId: run.missionId,
      taskId: run.taskId,
      taskVersion: run.taskVersion,
      harness: run.harness,
      objective: run.objective,
      projectId: context.projectId,
      target: run.target,
      title: summary.split(/(?<=[.!?])\s/)[0].slice(0, 140),
      risk: changes.some((change) => change.kind === 'deleted') ? 'high' : 'normal',
      highRiskPolicy: false,
      createdAt: new Date().toISOString(),
      baseCanonicalHash: combinedHash(baseHashes),
      effect: {
        requestedOutcome: run.objective,
        whatChanged: `${summary} (${counts} file${changes.length === 1 ? '' : 's'}).`,
        whatRemainsUnresolved: remaining.length > 0 ? remaining.join(' · ') : 'The agent recorded nothing unresolved.',
      },
      evidence,
      impact: {
        affectedTargets: changes.map((change) => `${change.path} (${change.kind})`),
        blastRadius: changes.length > 5 ? 'broad' : 'narrow',
        note: 'Nothing has been written to the project. Accept applies these files; deletions move to Workbench residue.',
      },
      architecture: {
        summary: typeof handoff.system_view?.intent === 'string' ? handoff.system_view.intent.slice(0, 600) : 'The agent did not describe the design intent.',
        components: strings(handoff.system_view?.architecture),
        tradeoffs: [],
      },
      implementation: { files: changes.map((change) => change.path), diffText, logText: `Ran through ${run.harness} in a sandbox copy. Raw process output is kept out of the review record.` },
      changes,
      baseHashes,
      sandbox: run.sandbox,
      systemView: {
        intent: typeof handoff.system_view?.intent === 'string' ? handoff.system_view.intent.slice(0, 600) : null,
        behavior: typeof handoff.system_view?.behavior === 'string' ? handoff.system_view.behavior.slice(0, 600) : null,
        architecture: strings(handoff.system_view?.architecture).slice(0, 12),
        implementation: strings(handoff.system_view?.implementation).slice(0, 12),
        verification: strings(handoff.system_view?.verification).slice(0, 12),
        terms: (handoff.technical_terms ?? []).filter((term) => typeof term.term === 'string' && typeof term.plain_system_meaning === 'string').slice(0, 12).map((term) => ({
          term: String(term.term).slice(0, 80),
          plain_system_meaning: String(term.plain_system_meaning).slice(0, 400),
          why_it_matters: typeof term.why_it_matters === 'string' ? term.why_it_matters.slice(0, 400) : '',
          exact_detail: typeof term.exact_detail === 'string' ? term.exact_detail.slice(0, 200) : null,
        })),
      },
    });
  }
}
