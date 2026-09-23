import type { WorkLedger, WorkRunRecord } from './WorkLedger.js';

export type ContinuationPacket = {
  schemaVersion: 1;
  projectId: string;
  missionId: string;
  taskId: string;
  taskVersion: number;
  priorRunId: string;
  priorHarness: string;
  priorStatus: string;
  candidateId: string | null;
  handoffRef: string | null;
  contextPackRef: string;
  contextSnapshotRef: string | null;
  authorityRefs: string[];
  oracleRefs: string[];
  evidenceRefs: string[];
  changedRefs: string[];
  decisions: string[];
  blockers: string[];
  remaining: string[];
  nextAction: string;
  mutableFactsToRecheck: string[];
};

export class ContinuationService {
  constructor(private readonly ledger: WorkLedger) {}

  compile(projectId: string, missionId: string, taskId: string): ContinuationPacket {
    const resolved = this.ledger.resolveTask(projectId, missionId, taskId);
    if (!resolved.current) throw new Error('No durable task record exists for continuation');
    return this.fromRecord(resolved.current);
  }

  private fromRecord(record: WorkRunRecord): ContinuationPacket {
    return {
      schemaVersion: 1,
      projectId: record.projectId,
      missionId: record.missionId,
      taskId: record.taskId,
      taskVersion: record.taskVersion,
      priorRunId: record.runId,
      priorHarness: record.harness,
      priorStatus: record.status,
      candidateId: record.candidateAfter ?? record.candidateBefore,
      handoffRef: record.handoffRef,
      contextPackRef: record.contextPackRef,
      contextSnapshotRef: record.contextSnapshotRef,
      authorityRefs: [...record.authorityRefs],
      oracleRefs: [...record.oracleRefs],
      evidenceRefs: [...record.evidenceRefs],
      changedRefs: [...record.changedRefs],
      decisions: [...record.decisions],
      blockers: [...record.blockers],
      remaining: [...record.remaining],
      nextAction: record.nextAction,
      mutableFactsToRecheck: ['candidate identity', 'workspace classification', 'dependency readiness', 'capability probe'],
    };
  }
}
