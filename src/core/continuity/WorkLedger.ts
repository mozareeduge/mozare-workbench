import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export type HarnessId = 'claude' | 'codex' | 'hermes' | 'manual' | 'fake';
export type WorkStatus = 'queued' | 'running' | 'needs_input' | 'interrupted' | 'parked' | 'completed' | 'failed' | 'superseded';

export type WorkRunRecord = {
  schemaVersion: 1;
  runId: string;
  projectId: string;
  missionId: string;
  taskId: string;
  taskVersion: number;
  supersedesRunId: string | null;
  harness: HarnessId;
  model: string | null;
  effort: string | null;
  capabilitySnapshotRef: string;
  contextPackRef: string;
  contextSnapshotRef: string | null;
  authorityRefs: string[];
  oracleRefs: string[];
  candidateBefore: string | null;
  candidateAfter: string | null;
  status: WorkStatus;
  resultSummary: string;
  changedRefs: string[];
  evidenceRefs: string[];
  decisions: string[];
  blockers: string[];
  remaining: string[];
  nextAction: string;
  handoffRef: string | null;
  operatorRole: 'owner' | 'agent' | 'reviewer' | 'system';
  startedAt: string;
  endedAt: string | null;
  recordedAt: string;
};

export type WorkRecordInput = Omit<WorkRunRecord, 'schemaVersion' | 'recordedAt'> & {
  expectedTaskVersion?: number | null;
};

export type TaskConflictReceipt = {
  code: 'stale_task_version';
  taskId: string;
  attemptedVersion: number;
  currentVersion: number;
  currentRunId: string;
  safeRoute: 'continue_current_or_create_successor';
};

export class WorkLedgerConflictError extends Error {
  constructor(readonly receipt: TaskConflictReceipt) {
    super(`Task ${receipt.taskId} version ${receipt.attemptedVersion} is stale; current version is ${receipt.currentVersion}`);
    this.name = 'WorkLedgerConflictError';
  }
}

export type ResolvedTask = {
  current: WorkRunRecord | null;
  history: WorkRunRecord[];
  parked: WorkRunRecord[];
  superseded: WorkRunRecord[];
};

export type ContinuitySummary = {
  currentTaskId: string;
  currentTaskVersion: number;
  latestRunId: string;
  harness: HarnessId;
  model: string;
  effort: string;
  status: WorkStatus;
  resultSummary: string;
  evidenceState: 'observed' | 'unverified';
  changedRefs: string[];
  remaining: string[];
  nextAction: string;
  recordedAt: string;
};

const FORBIDDEN_VALUE = /(BEGIN [A-Z ]*PRIVATE KEY|(?:api[_-]?key|password|secret)\s*[:=]|hidden reasoning|raw transcript|prompt body|step diagnostic line)/i;
const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

function safeText(value: string, field: string, allowEmpty = false): string {
  const trimmed = value.trim();
  if (!allowEmpty && trimmed.length === 0) throw new Error(`${field} must not be empty`);
  if (FORBIDDEN_VALUE.test(trimmed)) throw new Error(`${field} contains forbidden transcript, reasoning, log, or secret-shaped content`);
  return trimmed;
}

function safeList(values: readonly string[], field: string, limit = 100): string[] {
  if (!Array.isArray(values) || values.length > limit) throw new Error(`${field} is not a bounded string list`);
  return values.map((value) => safeText(String(value), field));
}

function normalize(input: WorkRecordInput): WorkRunRecord {
  for (const [field, value] of Object.entries({ runId: input.runId, projectId: input.projectId, missionId: input.missionId, taskId: input.taskId })) {
    if (!idPattern.test(value)) throw new Error(`${field} must be a stable explicit ID`);
  }
  if (!Number.isInteger(input.taskVersion) || input.taskVersion < 1) throw new Error('taskVersion must be a positive integer');
  if (input.supersedesRunId !== null && !idPattern.test(input.supersedesRunId)) throw new Error('supersedesRunId must be a stable explicit ID');
  if (!['claude', 'codex', 'hermes', 'manual', 'fake'].includes(input.harness)) throw new Error('unknown harness');
  if (!['queued', 'running', 'needs_input', 'interrupted', 'parked', 'completed', 'failed', 'superseded'].includes(input.status)) throw new Error('unknown work status');
  if (!['owner', 'agent', 'reviewer', 'system'].includes(input.operatorRole)) throw new Error('unknown operator role');
  const startedAt = new Date(input.startedAt);
  const endedAt = input.endedAt === null ? null : new Date(input.endedAt);
  if (Number.isNaN(startedAt.valueOf())) throw new Error('startedAt must be a valid timestamp');
  if (endedAt && Number.isNaN(endedAt.valueOf())) throw new Error('endedAt must be a valid timestamp');
  if (endedAt && endedAt < startedAt) throw new Error('endedAt cannot be earlier than startedAt');
  return {
    schemaVersion: 1,
    runId: input.runId,
    projectId: input.projectId,
    missionId: input.missionId,
    taskId: input.taskId,
    taskVersion: input.taskVersion,
    supersedesRunId: input.supersedesRunId,
    harness: input.harness,
    model: input.model ? safeText(input.model, 'model') : null,
    effort: input.effort ? safeText(input.effort, 'effort') : null,
    capabilitySnapshotRef: safeText(input.capabilitySnapshotRef, 'capabilitySnapshotRef'),
    contextPackRef: safeText(input.contextPackRef, 'contextPackRef'),
    contextSnapshotRef: input.contextSnapshotRef ? safeText(input.contextSnapshotRef, 'contextSnapshotRef') : null,
    authorityRefs: safeList(input.authorityRefs, 'authorityRefs'),
    oracleRefs: safeList(input.oracleRefs, 'oracleRefs'),
    candidateBefore: input.candidateBefore ? safeText(input.candidateBefore, 'candidateBefore') : null,
    candidateAfter: input.candidateAfter ? safeText(input.candidateAfter, 'candidateAfter') : null,
    status: input.status,
    resultSummary: safeText(input.resultSummary, 'resultSummary').slice(0, 800),
    changedRefs: safeList(input.changedRefs, 'changedRefs'),
    evidenceRefs: safeList(input.evidenceRefs, 'evidenceRefs'),
    decisions: safeList(input.decisions, 'decisions', 40),
    blockers: safeList(input.blockers, 'blockers', 40),
    remaining: safeList(input.remaining, 'remaining', 40),
    nextAction: safeText(input.nextAction, 'nextAction').slice(0, 500),
    handoffRef: input.handoffRef ? safeText(input.handoffRef, 'handoffRef') : null,
    operatorRole: input.operatorRole,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt?.toISOString() ?? null,
    recordedAt: new Date().toISOString(),
  };
}

/** Immutable, file-per-record execution provenance. Canonical project files are never touched. */
export class WorkLedger {
  constructor(private readonly directory: string) {}

  append(input: WorkRecordInput): WorkRunRecord {
    const record = normalize(input);
    const prior = this.records({ projectId: record.projectId, missionId: record.missionId, taskId: record.taskId });
    if (prior.some((item) => item.runId === record.runId)) throw new Error(`runId already exists: ${record.runId}`);
    const resolved = this.resolveTask(record.projectId, record.missionId, record.taskId);
    if (resolved.current) {
      const expected = input.expectedTaskVersion ?? record.taskVersion;
      if (expected < resolved.current.taskVersion || record.taskVersion < resolved.current.taskVersion) {
        throw new WorkLedgerConflictError({
          code: 'stale_task_version', taskId: record.taskId, attemptedVersion: record.taskVersion,
          currentVersion: resolved.current.taskVersion, currentRunId: resolved.current.runId,
          safeRoute: 'continue_current_or_create_successor',
        });
      }
      if (record.taskVersion > resolved.current.taskVersion && record.supersedesRunId !== resolved.current.runId) {
        throw new Error('A successor task version must name the current run it supersedes');
      }
      if (record.taskVersion > resolved.current.taskVersion + 1) {
        throw new Error('A successor task version cannot skip an intermediate version');
      }
      if (record.taskVersion === resolved.current.taskVersion && record.supersedesRunId !== resolved.current.runId) {
        throw new Error('Same-version continuation must name the current run it continues');
      }
    } else if (record.taskVersion !== 1 || record.supersedesRunId !== null) {
      throw new Error('The first task record must be version 1 with no predecessor');
    }
    mkdirSync(this.directory, { recursive: true });
    const digest = createHash('sha256').update(JSON.stringify(record)).digest('hex').slice(0, 12);
    const finalPath = join(this.directory, `${Date.now()}-${digest}-${randomUUID()}.json`);
    const temporary = `${finalPath}.${randomUUID()}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    renameSync(temporary, finalPath);
    return record;
  }

  records(filter: { projectId?: string; missionId?: string; taskId?: string } = {}): WorkRunRecord[] {
    if (!existsSync(this.directory)) return [];
    return readdirSync(this.directory).filter((name) => name.endsWith('.json')).sort().map((name) => JSON.parse(readFileSync(join(this.directory, name), 'utf8')) as WorkRunRecord)
      .filter((record) => (!filter.projectId || record.projectId === filter.projectId) && (!filter.missionId || record.missionId === filter.missionId) && (!filter.taskId || record.taskId === filter.taskId));
  }

  resolveTask(projectId: string, missionId: string, taskId: string): ResolvedTask {
    const history = this.records({ projectId, missionId, taskId });
    const byRunId = new Map(history.map((record) => [record.runId, record]));
    const supersededIds = new Set(history.map((record) => record.supersedesRunId).filter((id): id is string => Boolean(id)));
    const candidates = history.filter((record) => record.status !== 'superseded' && !supersededIds.has(record.runId) && this.hasIntactChain(record, byRunId));
    const current = candidates.sort((a, b) => a.taskVersion - b.taskVersion || a.recordedAt.localeCompare(b.recordedAt)).at(-1) ?? null;
    return {
      current,
      history,
      parked: history.filter((record) => record.status === 'parked'),
      superseded: history.filter((record) => record.status === 'superseded' || supersededIds.has(record.runId)),
    };
  }

  private hasIntactChain(record: WorkRunRecord, byRunId: Map<string, WorkRunRecord>): boolean {
    const seen = new Set<string>();
    let current = record;
    while (current.supersedesRunId) {
      if (seen.has(current.runId)) return false;
      seen.add(current.runId);
      const parent = byRunId.get(current.supersedesRunId);
      if (!parent || parent.projectId !== current.projectId || parent.missionId !== current.missionId || parent.taskId !== current.taskId) return false;
      if (parent.taskVersion > current.taskVersion || current.taskVersion - parent.taskVersion > 1) return false;
      current = parent;
    }
    return current.taskVersion === 1;
  }

  summary(projectId: string): ContinuitySummary | null {
    const records = this.records({ projectId }).filter((record) => record.status !== 'superseded');
    const latest = records.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)).at(-1);
    if (!latest) return null;
    return {
      currentTaskId: latest.taskId,
      currentTaskVersion: latest.taskVersion,
      latestRunId: latest.runId,
      harness: latest.harness,
      model: latest.model ?? 'unknown',
      effort: latest.effort ?? 'unknown',
      status: latest.status,
      resultSummary: latest.resultSummary,
      evidenceState: latest.evidenceRefs.length > 0 ? 'observed' : 'unverified',
      changedRefs: latest.changedRefs.slice(0, 8),
      remaining: latest.remaining.slice(0, 8),
      nextAction: latest.nextAction,
      recordedAt: latest.recordedAt,
    };
  }
}
