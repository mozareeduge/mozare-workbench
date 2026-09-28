import { randomUUID } from 'node:crypto';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import type { WorkLedger } from '../../core/continuity/WorkLedger.js';
import type { EvidenceFixture } from '../../core/projection/ReviewProjection.js';
import type { FlowOutcomeFixture } from '../../core/projection/FlowProjection.js';
import { HarnessCoordinator } from '../agents/HarnessCoordinator.js';
import type { HarnessAdapter, HarnessCapability, RealHarnessId } from '../agents/HarnessAdapter.js';
import { CodexSandboxRunner } from '../process/CodexSandboxRunner.js';
import { combinedHash, createSandbox, describeChanges, hashFiles, isHarnessState, RUN_DIRECTORY_NAME, sandboxChanges, type FileHashes } from './ProjectSnapshot.js';
import type { ProposalStore, StoredProposal } from './ProposalStore.js';

export type MissionRequest = {
  harness: RealHarnessId;
  target: string;
  outcome: string;
  /** What the owner typed in the mission's Context field; passed to the agent verbatim. */
  context?: string | null;
  acceptance: string[];
  model?: string | null;
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
type RunReceipt = {
  schema: 'mwb.mission-run.v1'; status: 'running' | 'settled' | 'recovered';
  ownerInstanceId: string; ownerPid: number; startedAt: string;
  workspaceId: string; projectRoot: string; projectId: string;
  runId: string; missionId: string; taskId: string; taskVersion: number;
  harness: RealHarnessId; objective: string; target: string; model: string | null; effort: string | null;
  sandbox: string; baseline: FileHashes;
};

function saveRunReceipt(path: string, receipt: RunReceipt): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(receipt)}\n`, { encoding: 'utf8', mode: 0o600 });
  renameSync(temporary, path);
}

function processAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.slice(0, 400)) : [];
}

function inside(root: string, path: string): string {
  const target = resolve(root, path);
  const rel = relative(resolve(root), target);
  if (!rel || rel === '..' || rel.startsWith(`..\\`) || rel.startsWith('../') || isAbsolute(rel)) throw new MissionUnavailableError('The prior mission contains an unsafe file path.');
  return target;
}

/** Carry prior proposed files only where the live project still has their original base. */
function carryPriorWork(previous: StoredProposal, projectRoot: string, sandbox: string): string[] {
  const conflicts: string[] = [];
  for (const change of previous.changes) {
    if (isHarnessState(change.path)) continue;
    const liveHash = hashFiles(projectRoot, [change.path])[change.path];
    if (liveHash !== previous.baseHashes[change.path]) { conflicts.push(change.path); continue; }
    const target = inside(sandbox, change.path);
    if (change.kind === 'deleted') { if (existsSync(target)) unlinkSync(target); continue; }
    const source = inside(previous.sandbox, change.path);
    if (!existsSync(source)) { conflicts.push(change.path); continue; }
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
  return conflicts;
}

export function appendMawsMissionResult(projectRoot: string, proposal: StoredProposal, acceptedAt: string): void {
  const directory = join(projectRoot, '.maws');
  mkdirSync(directory, { recursive: true });
  const journal = join(directory, 'workbench-missions.jsonl');
  const existing = existsSync(journal) ? readFileSync(journal, 'utf8') : '';
  if (existing.split(/\r?\n/).some((line) => {
    try { return (JSON.parse(line) as { proposal_id?: string }).proposal_id === proposal.id; } catch { return false; }
  })) return;
  appendFileSync(journal, `${existing && !existing.endsWith('\n') ? '\n' : ''}${JSON.stringify({
    schema: 'mwb.maws-mission.v1', at: acceptedAt, event: 'mission-accepted',
    mission_id: proposal.missionId, task_id: proposal.taskId, task_version: proposal.taskVersion,
    run_id: proposal.runId, harness: proposal.harness, proposal_id: proposal.id,
    outcome: proposal.effect.whatChanged, changed_refs: proposal.changes.map((change) => change.path),
    evidence_state: 'agent-claim', review_state: 'accepted',
  })}\n`, 'utf8');
}

/**
 * Runs owner-started missions: the chosen harness works on a Workbench-owned sandbox copy,
 * and its result becomes a Review proposal. The registered project is never written here;
 * only an explicit Accept in ProposalStore changes it.
 */
export class MissionService {
  private readonly instanceId = randomUUID();
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

  /** Rebuild a reviewable continuation from a run interrupted by app or machine shutdown. */
  async recoverInterrupted(context: MissionContext): Promise<void> {
    const workspaceRuns = join(this.runtimeDirectory, 'missions', context.workspaceId);
    if (!existsSync(workspaceRuns)) return;
    for (const entry of readdirSync(workspaceRuns, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^run-[a-zA-Z0-9-]+$/.test(entry.name)) continue;
      const receiptPath = join(workspaceRuns, entry.name, 'run.json');
      if (!existsSync(receiptPath)) continue;
      let receipt: RunReceipt;
      try { receipt = JSON.parse(readFileSync(receiptPath, 'utf8')) as RunReceipt; } catch { continue; }
      if (receipt.schema !== 'mwb.mission-run.v1' || receipt.status !== 'running'
        || receipt.workspaceId !== context.workspaceId || receipt.runId !== entry.name
        || resolve(receipt.projectRoot) !== resolve(context.projectRoot)
        || resolve(receipt.sandbox) !== resolve(join(workspaceRuns, entry.name, 'sandbox'))) continue;
      if (receipt.ownerInstanceId === this.instanceId || (receipt.ownerPid !== process.pid && processAlive(receipt.ownerPid))) continue;
      try {
        CodexSandboxRunner.cleanInterruptedHome(receipt.sandbox);
        const proposalId = `prp_${receipt.runId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
        if (!this.proposals.get(context.workspaceId, proposalId)) {
          await this.recordProposal({ ...context, projectId: receipt.projectId }, {
            runId: receipt.runId, missionId: receipt.missionId, taskId: receipt.taskId, taskVersion: receipt.taskVersion,
            harness: receipt.harness, objective: receipt.objective, target: receipt.target, sandbox: receipt.sandbox,
            baseline: receipt.baseline, missionRoot: join(workspaceRuns, entry.name),
            handoffRef: join(receipt.sandbox, RUN_DIRECTORY_NAME, 'handoff.json'), interrupted: true,
          });
        }
        if (!this.ledger.records({ projectId: receipt.projectId }).some((record) => record.runId === receipt.runId)) {
          const prior = this.ledger.resolveTask(receipt.projectId, receipt.missionId, receipt.taskId).current;
          if (!prior || prior.taskVersion <= receipt.taskVersion) this.ledger.append({
            runId: receipt.runId, projectId: receipt.projectId, missionId: receipt.missionId, taskId: receipt.taskId,
            taskVersion: receipt.taskVersion, expectedTaskVersion: prior?.taskVersion ?? null,
            supersedesRunId: prior?.runId ?? null, harness: receipt.harness, model: receipt.model, effort: receipt.effort,
            capabilitySnapshotRef: `${RUN_DIRECTORY_NAME}/capability.json`, contextPackRef: `${RUN_DIRECTORY_NAME}/context-pack.json`,
            contextSnapshotRef: null, authorityRefs: ['AUTHORITY/08'], oracleRefs: ['ORACLE-007', 'ORACLE-010'],
            candidateBefore: null, candidateAfter: null, status: 'interrupted',
            resultSummary: 'Workbench stopped while this mission was running; partial work was recovered for Review.',
            changedRefs: sandboxChanges(receipt.sandbox, receipt.baseline).map((change) => change.path).slice(0, 100),
            evidenceRefs: [], decisions: ['Recovered from a durable mission receipt after restart.'],
            blockers: ['Mission stopped before a verified completion.'], remaining: ['Review or continue the recovered work.'],
            nextAction: 'Review or continue the recovered work.', handoffRef: null, operatorRole: 'system',
            startedAt: receipt.startedAt, endedAt: new Date().toISOString(),
          });
        }
        saveRunReceipt(receiptPath, { ...receipt, status: 'recovered' });
      } catch { /* keep the durable receipt and retry on the next load */ }
    }
  }

  stop(runId: string): boolean {
    return this.coordinator.stop(runId);
  }

  async start(context: MissionContext, request: MissionRequest): Promise<MissionReceipt> {
    if (!['claude', 'codex', 'hermes'].includes(request.harness)) throw new MissionUnavailableError('Unknown agent.');
    const acceptance = request.acceptance.map((item) => item.trim()).filter(Boolean);
    if (acceptance.length === 0) throw new MissionUnavailableError('At least one observable acceptance criterion is required.');
    const model = request.model?.trim() || null;
    const effort = request.effort?.trim() || null;
    if (model && !/^[\w./:-]{1,100}$/.test(model)) throw new MissionUnavailableError('Model name contains unsupported characters.');
    const effortChoices = request.harness === 'hermes' ? ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'] : request.harness === 'claude' ? ['low', 'medium', 'high', 'xhigh', 'max'] : ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
    if (effort && !effortChoices.includes(effort)) throw new MissionUnavailableError('Unsupported effort for the selected agent.');
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
      ...(previous ? ['Read .mozare-run/continuation.json and prior-diff.txt for the previous work; reconcile any paths the owner changed.'] : []),
    ].join('\n');

    const missionRoot = join(this.runtimeDirectory, 'missions', context.workspaceId, runId);
    const sandbox = join(missionRoot, 'sandbox');
    const baseline = createSandbox(context.projectRoot, sandbox);
    const runDirectory = join(sandbox, RUN_DIRECTORY_NAME);
    mkdirSync(runDirectory, { recursive: true });
    if (previous) {
      const decision = this.proposals.latestDecision(context.workspaceId, previous.id)?.state ?? 'under_review';
      const conflicts = decision === 'accepted' ? [] : carryPriorWork(previous, context.projectRoot, sandbox);
      writeFileSync(join(runDirectory, 'continuation.json'), `${JSON.stringify({
        priorRunId: previous.runId, priorHarness: previous.harness, priorTaskVersion: previous.taskVersion,
        priorSummary: previous.effect.whatChanged, priorDecision: decision, priorChanges: previous.changes.filter((change) => !isHarnessState(change.path)),
        ownerRevisionNote: revisionNote, conflicts, priorDiffRef: 'prior-diff.txt',
      }, null, 2)}\n`, 'utf8');
      writeFileSync(join(runDirectory, 'prior-diff.txt'), previous.implementation.diffText.slice(0, 200_000), 'utf8');
    }
    const contextPackRef = join(runDirectory, 'context-pack.json');
    writeFileSync(contextPackRef, `${JSON.stringify({
      id: `CTX-${runId}`, mission_id: missionId, profile: 'technical', objective,
      authority: ['AUTHORITY/08'], items: [], expansion_handles: [], metrics: { duplicate_count: 0, duplicate_ratio: 0 },
      budget: { target_tokens: 2000, hard_tokens: 6000, estimated_tokens: Math.ceil(objective.length / 4), tier: 'simple_mission' },
    }, null, 2)}\n`, 'utf8');

    // A continuation keeps the task's original project identity so its version chain stays intact.
    const projectId = previous?.projectId ?? context.projectId;
    const receiptPath = join(missionRoot, 'run.json');
    const receipt: RunReceipt = {
      schema: 'mwb.mission-run.v1', status: 'running', ownerInstanceId: this.instanceId, ownerPid: process.pid,
      startedAt: new Date().toISOString(), workspaceId: context.workspaceId, projectRoot: context.projectRoot,
      projectId, runId, missionId, taskId, taskVersion, harness: request.harness,
      objective, target: request.target.trim(), model, effort, sandbox, baseline,
    };
    saveRunReceipt(receiptPath, receipt);
    const execution = this.coordinator.begin(request.harness, {
      runId, projectId, missionId, taskId, taskVersion, workspaceRoot: sandbox, runDirectory,
      objective, contextPackRef, contextSnapshotRef: null, authorityRefs: ['AUTHORITY/08'], oracleRefs: ['ORACLE-007', 'ORACLE-010'],
      model, effort, mode: 'work',
      routeTier: 'CODING_AGENT', nextAction: 'Review the proposal, or continue the task with another agent.',
    });
    const done = execution.completion
      .then(async (result) => {
        await this.recordProposal({ ...context, projectId }, {
          runId, missionId, taskId, taskVersion, harness: request.harness, objective, target: request.target.trim(),
          sandbox, baseline, missionRoot, handoffRef: result.harnessResult?.handoffRef ?? join(runDirectory, 'handoff.json'),
          interrupted: result.record.status !== 'completed',
        });
        saveRunReceipt(receiptPath, { ...receipt, status: 'settled' });
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
    run: { runId: string; missionId: string; taskId: string; taskVersion: number; harness: RealHarnessId; objective: string; target: string; sandbox: string; baseline: FileHashes; missionRoot: string; handoffRef: string; interrupted?: boolean },
  ): Promise<StoredProposal> {
    let handoff: Handoff = {};
    if (existsSync(run.handoffRef)) {
      try { handoff = JSON.parse(readFileSync(run.handoffRef, 'utf8')) as Handoff; } catch { /* interrupted writes may leave a partial handoff */ }
    }
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
    const summary = run.interrupted ? 'Mission stopped before verified completion; partial work is available for review or continuation.'
      : typeof handoff.summary === 'string' && handoff.summary.trim() ? handoff.summary.trim().slice(0, 600) : `${run.harness} finished without a summary.`;
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
      risk: run.interrupted || changes.some((change) => change.kind === 'deleted') ? 'high' : 'normal',
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
        note: run.interrupted
          ? 'This is partial work from an interrupted run. Verify it before accepting or continue it in another mission.'
          : 'Nothing has been written to the project. Accept applies these files; deletions move to Workbench residue.',
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
