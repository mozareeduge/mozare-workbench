import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { WorkLedger, type WorkRunRecord } from '../../core/continuity/WorkLedger.js';
import { HarnessAdapter, type HarnessMission, type HarnessResult, type RealHarnessId } from './HarnessAdapter.js';

export type CandidateObservation = { candidate: string | null; changedRefs: string[] };
export type CandidateObserver = (workspaceRoot: string) => Promise<CandidateObservation>;

export type CoordinatedMission = HarnessMission & {
  contextSnapshotRef: string | null;
  routeTier: 'LIGHT' | 'CODING_AGENT' | 'STRONG' | 'INDEPENDENT_STRONG';
  nextAction: string;
};

export type CoordinatedResult = {
  capability: Awaited<ReturnType<HarnessAdapter['probe']>>;
  harnessResult: HarnessResult | null;
  record: WorkRunRecord;
};

export type ActiveHarnessRun = {
  runId: string;
  completion: Promise<CoordinatedResult>;
};

const emptyObserver: CandidateObserver = async () => ({ candidate: null, changedRefs: [] });

export class HarnessCoordinator {
  private readonly active = new Map<string, () => boolean>();

  constructor(
    private readonly adapters: Record<RealHarnessId, HarnessAdapter>,
    private readonly ledger: WorkLedger,
    private readonly observeCandidate: CandidateObserver = emptyObserver,
  ) {}

  begin(harness: RealHarnessId, mission: CoordinatedMission): ActiveHarnessRun {
    if (this.active.has(mission.runId)) throw new Error(`run already active: ${mission.runId}`);
    this.active.set(mission.runId, () => false);
    const completion = this.execute(harness, mission).finally(() => this.active.delete(mission.runId));
    return { runId: mission.runId, completion };
  }

  stop(runId: string): boolean {
    const stop = this.active.get(runId);
    return stop ? stop() : false;
  }

  private async execute(harness: RealHarnessId, mission: CoordinatedMission): Promise<CoordinatedResult> {
    const adapter = this.adapters[harness];
    const startedAt = new Date().toISOString();
    const capability = await adapter.probe();
    mkdirSync(mission.runDirectory, { recursive: true });
    const capabilityRef = join(mission.runDirectory, 'capability.json');
    writeFileSync(capabilityRef, `${JSON.stringify(capability, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    const before = await this.observeCandidate(mission.workspaceRoot);
    if (capability.level !== 'available') {
      return {
        capability,
        harnessResult: null,
        record: this.append(mission, harness, {
          status: 'parked', startedAt, candidateBefore: before.candidate, candidateAfter: before.candidate,
          changedRefs: [], evidenceRefs: [], handoffRef: null,
          resultSummary: `${harness} is unavailable; work is safely parked: ${capability.reason ?? capability.level}.`,
          blockers: [capability.reason ?? `${harness} capability is ${capability.level}`],
          capabilityRef,
        }),
      };
    }

    let execution;
    try {
      execution = adapter.start(mission);
    } catch {
      return {
        capability,
        harnessResult: null,
        record: this.append(mission, harness, {
          status: 'failed', startedAt, candidateBefore: before.candidate, candidateAfter: before.candidate,
          changedRefs: [], evidenceRefs: [], handoffRef: null,
          resultSummary: `${harness} did not start; prior work remains durable.`,
          blockers: ['adapter rejected the run contract before process start'],
          capabilityRef,
        }),
      };
    }
    this.active.set(mission.runId, execution.stop);
    let harnessResult: HarnessResult;
    try {
      harnessResult = await execution.completion;
    } catch {
      return {
        capability,
        harnessResult: null,
        record: this.append(mission, harness, {
          status: 'failed', startedAt, candidateBefore: before.candidate, candidateAfter: before.candidate,
          changedRefs: [], evidenceRefs: [], handoffRef: null,
          resultSummary: `${harness} process failed before an observable handoff; prior work remains durable.`,
          blockers: ['harness process could not be observed to completion'],
          capabilityRef,
        }),
      };
    }
    const after = await this.observeCandidate(mission.workspaceRoot);
    const status = harnessResult.status === 'completed' ? 'completed' : harnessResult.status === 'interrupted' ? 'interrupted' : 'failed';
    const handoffRef = harnessResult.handoffRef ? relative(mission.workspaceRoot, harnessResult.handoffRef) : null;
    const evidenceRefs = handoffRef ? [`handoff:${handoffRef}:schema-valid`] : [];
    return {
      capability,
      harnessResult,
      record: this.append(mission, harness, {
        status, startedAt, candidateBefore: before.candidate, candidateAfter: after.candidate,
        changedRefs: after.changedRefs, evidenceRefs, handoffRef,
        resultSummary: status === 'completed' ? `${harness} produced a valid structured handoff.` : `${harness} ${status}; prior work remains durable.`,
        blockers: harnessResult.failureReason ? [harnessResult.failureReason] : [],
        capabilityRef,
      }),
    };
  }

  private append(
    mission: CoordinatedMission,
    harness: RealHarnessId,
    observed: {
      status: 'completed' | 'failed' | 'interrupted' | 'parked';
      startedAt: string;
      candidateBefore: string | null;
      candidateAfter: string | null;
      changedRefs: string[];
      evidenceRefs: string[];
      handoffRef: string | null;
      resultSummary: string;
      blockers: string[];
      capabilityRef: string;
    },
  ): WorkRunRecord {
    const current = this.ledger.resolveTask(mission.projectId, mission.missionId, mission.taskId).current;
    return this.ledger.append({
      runId: mission.runId,
      projectId: mission.projectId,
      missionId: mission.missionId,
      taskId: mission.taskId,
      taskVersion: mission.taskVersion,
      expectedTaskVersion: current?.taskVersion ?? null,
      supersedesRunId: current?.runId ?? null,
      harness,
      model: mission.model,
      effort: mission.effort,
      capabilitySnapshotRef: relative(mission.workspaceRoot, observed.capabilityRef),
      contextPackRef: relative(mission.workspaceRoot, mission.contextPackRef),
      contextSnapshotRef: mission.contextSnapshotRef ? relative(mission.workspaceRoot, mission.contextSnapshotRef) : null,
      authorityRefs: mission.authorityRefs,
      oracleRefs: mission.oracleRefs,
      candidateBefore: observed.candidateBefore,
      candidateAfter: observed.candidateAfter,
      status: observed.status,
      resultSummary: observed.resultSummary,
      changedRefs: observed.changedRefs,
      evidenceRefs: observed.evidenceRefs,
      decisions: [`Route ${mission.routeTier} executed through ${harness}.`],
      blockers: observed.blockers,
      remaining: observed.status === 'completed' ? [] : [mission.nextAction],
      nextAction: mission.nextAction,
      handoffRef: observed.handoffRef,
      operatorRole: 'agent',
      startedAt: observed.startedAt,
      endedAt: new Date().toISOString(),
    });
  }
}
