import { randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { ProcessRunner, type ProcessResult, type RunningProcess } from '../process/ProcessRunner.js';

export type RealHarnessId = 'claude' | 'codex' | 'hermes';
export type CapabilityLevel = 'available' | 'partial' | 'unavailable';

export type HarnessCapability = {
  harness: RealHarnessId;
  level: CapabilityLevel;
  executable: string;
  version: string | null;
  reason: string | null;
  observedAt: string;
};

export type HarnessMission = {
  runId: string;
  projectId: string;
  missionId: string;
  taskId: string;
  taskVersion: number;
  workspaceRoot: string;
  runDirectory: string;
  objective: string;
  contextPackRef: string;
  authorityRefs: string[];
  oracleRefs: string[];
  model: string | null;
  effort: string | null;
  /** `probe` proves the contract without edits; `work` may edit the (sandboxed) workspace to reach the objective. */
  mode?: 'probe' | 'work';
};

export type SafeInvocation = {
  executable: string;
  args: string[];
  cwd: string;
  input: string | undefined;
  promptRef: string;
};

export type HarnessResult = {
  harness: RealHarnessId;
  status: 'completed' | 'failed' | 'interrupted';
  exitCode: number;
  model: string | null;
  effort: string | null;
  handoffRef: string | null;
  handoffState: 'completed' | 'partial' | 'failed' | 'stopped' | 'needs_review' | null;
  diagnosticRef: string;
  failureReason: string | null;
  process: ProcessResult;
};

export type HarnessExecution = {
  invocation: Omit<SafeInvocation, 'input'> & { inputSource: 'run-local-query' | 'none' };
  completion: Promise<HarnessResult>;
  stop: () => boolean;
};

function assertContained(root: string, target: string, label: string): void {
  const canonicalRoot = resolve(root);
  const canonicalTarget = resolve(target);
  const rel = relative(canonicalRoot, canonicalTarget);
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) return;
  throw new Error(`${label} must stay inside the registered workspace root`);
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  renameSync(temporary, path);
}

// Hermes (uv/Python) cold-starts in ~15s on Windows; a tighter limit falsely reports it unavailable.
const PROBE_TIMEOUT_MS = 60_000;

function safeFailure(result: ProcessResult, stopRequested: boolean, timeoutMs: number): string {
  if (stopRequested) return 'process stopped by operator';
  if (result.timedOut) return `process exceeded ${timeoutMs}ms limit`;
  const output = `${result.stdout}\n${result.stderr}`;
  if (/failed to authenticate|oauth session expired|authentication required/i.test(output)) return 'harness authentication is unavailable or expired';
  if (/unknown toolsets?/i.test(output)) return 'harness tool configuration is invalid or stale';
  return result.exitCode !== 0 ? `process exited ${result.exitCode}` : 'schema-valid handoff was not produced';
}

function safeDiagnosticSummary(value: string): string {
  return value
    .replace(/((?:api[_-]?key|password|secret|token)\s*[:=]\s*)\S+/gi, '$1[redacted]')
    .replace(/\b(?:sk|key)-[A-Za-z0-9_-]{8,}\b/g, '[redacted]')
    .trim()
    .slice(0, 400);
}

export class HarnessAdapter {
  constructor(
    readonly id: RealHarnessId,
    readonly executable: string,
    private readonly runner: ProcessRunner = new ProcessRunner(),
    private readonly executionTimeoutMs = 180_000,
  ) {}

  async probe(): Promise<HarnessCapability> {
    const observedAt = new Date().toISOString();
    try {
      const version = await this.runner.run(this.executable, ['--version'], process.cwd(), { timeoutMs: PROBE_TIMEOUT_MS });
      if (version.exitCode !== 0) return { harness: this.id, level: 'unavailable', executable: this.executable, version: null, reason: version.stderr.trim() || 'version probe failed', observedAt };
      const help = await this.runner.run(this.executable, this.helpArgs(), process.cwd(), { timeoutMs: PROBE_TIMEOUT_MS });
      if (help.exitCode !== 0) return { harness: this.id, level: 'partial', executable: this.executable, version: version.stdout.trim().split(/\r?\n/)[0] || 'unknown', reason: 'help probe failed', observedAt };
      return { harness: this.id, level: 'available', executable: this.executable, version: version.stdout.trim().split(/\r?\n/)[0] || 'unknown', reason: null, observedAt };
    } catch (error) {
      return { harness: this.id, level: 'unavailable', executable: this.executable, version: null, reason: error instanceof Error ? error.message : String(error), observedAt };
    }
  }

  prepare(mission: HarnessMission): SafeInvocation {
    assertContained(mission.workspaceRoot, mission.runDirectory, 'run directory');
    assertContained(mission.workspaceRoot, mission.contextPackRef, 'context pack');
    if (!this.validJson(mission.contextPackRef, join(process.cwd(), 'CONTEXT', 'context-pack.schema.json'))) {
      throw new Error('adapter run requires a schema-valid compiled context pack');
    }
    mkdirSync(mission.runDirectory, { recursive: true });
    const handoffRef = join(mission.runDirectory, 'handoff.json');
    const contractRef = join(mission.runDirectory, 'mission-contract.json');
    const queryRef = join(mission.runDirectory, 'query.txt');
    const schemaRef = join(mission.runDirectory, 'handoff.schema.json');
    copyFileSync(join(process.cwd(), 'config', 'handoff.schema.json'), schemaRef);
    const work = mission.mode === 'work';
    const runDirectoryRef = relative(mission.workspaceRoot, mission.runDirectory);
    atomicJson(contractRef, {
      contractVersion: 1,
      ids: { projectId: mission.projectId, missionId: mission.missionId, taskId: mission.taskId, taskVersion: mission.taskVersion, runId: mission.runId },
      objective: mission.objective,
      contextPackRef: relative(mission.workspaceRoot, mission.contextPackRef),
      authorityRefs: mission.authorityRefs,
      oracleRefs: mission.oracleRefs,
      constraints: work
        ? [
          'This folder is a disposable Workbench copy of the project; your file changes become a proposal the owner accepts or rejects.',
          'Change only what the objective needs, inside this folder. Do not touch paths outside it.',
          `Do not edit anything under ${runDirectoryRef} except the handoff file.`,
          `When done, write a schema-valid handoff to ${relative(mission.workspaceRoot, handoffRef)}; list real verification you ran in tests[] and leave unobserved claims out.`,
          'Do not include prompts, transcripts, hidden reasoning, secrets, or raw logs in the handoff.',
        ]
        : [
          'Read only the bounded contract and referenced context.',
          'Do not modify canonical project content for this harmless continuity probe.',
          `Write a schema-valid handoff to ${relative(mission.workspaceRoot, handoffRef)}.`,
          'Do not include prompts, transcripts, hidden reasoning, secrets, or raw logs in the handoff.',
        ],
      handoffSchemaRef: relative(mission.workspaceRoot, schemaRef),
    });
    const query = work
      ? `Execute the mission contract at ${relative(mission.workspaceRoot, contractRef)}: do the objective in this workspace copy, then write the required structured handoff.`
      : `Execute the bounded mission contract at ${relative(mission.workspaceRoot, contractRef)}. Write only the required structured handoff; do not change canonical project files.`;
    writeFileSync(queryRef, `${query}
`, { encoding: 'utf8', mode: 0o600 });
    const invocation = this.invocation(mission, query, queryRef);
    if (resolve(invocation.cwd) !== resolve(mission.workspaceRoot)) throw new Error('adapter cwd must equal the registered workspace root');
    return invocation;
  }

  start(mission: HarnessMission): HarnessExecution {
    const invocation = this.prepare(mission);
    const running: RunningProcess = this.runner.start(invocation.executable, invocation.args, invocation.cwd, { stdin: invocation.input, timeoutMs: this.executionTimeoutMs });
    const diagnosticRef = join(mission.runDirectory, 'diagnostic.json');
    const processOutputRef = join(mission.runDirectory, 'process-output.log');
    const handoffRef = join(mission.runDirectory, 'handoff.json');
    let stopRequested = false;
    const completion = running.completion.then((processResult) => {
      const handoffState = processResult.exitCode === 0 ? this.handoffState(handoffRef) : null;
      const valid = handoffState !== null;
      writeFileSync(processOutputRef, `STDOUT\n${processResult.stdout}\n\nSTDERR\n${processResult.stderr}\n`, { encoding: 'utf8', mode: 0o600 });
      atomicJson(diagnosticRef, {
        harness: this.id,
        executable: invocation.executable,
        args: invocation.args,
        cwd: invocation.cwd,
        exitCode: processResult.exitCode,
        timedOut: processResult.timedOut ?? false,
        stdoutRef: 'process output intentionally omitted from durable continuity',
        stderrSummary: safeDiagnosticSummary(processResult.stderr),
      });
      return {
        harness: this.id,
        status: handoffState === 'completed' ? 'completed' : handoffState === 'stopped' || stopRequested || processResult.timedOut ? 'interrupted' : 'failed',
        exitCode: processResult.exitCode,
        model: mission.model,
        effort: mission.effort,
        handoffRef: valid ? handoffRef : null,
        handoffState,
        diagnosticRef,
        failureReason: handoffState === 'completed' ? null : valid ? `handoff reported ${handoffState}` : safeFailure(processResult, stopRequested, this.executionTimeoutMs),
        process: processResult,
      } satisfies HarnessResult;
    });
    return {
      invocation: { executable: invocation.executable, args: [...invocation.args], cwd: invocation.cwd, promptRef: invocation.promptRef, inputSource: invocation.input ? 'run-local-query' : 'none' },
      completion,
      stop: () => {
        stopRequested = true;
        return running.stop();
      },
    };
  }

  private helpArgs(): string[] {
    return this.id === 'codex' ? ['exec', '--help'] : this.id === 'hermes' ? ['chat', '--help'] : ['--help'];
  }

  private invocation(mission: HarnessMission, query: string, queryRef: string): SafeInvocation {
    const model = mission.model ? ['--model', mission.model] : [];
    if (this.id === 'claude') {
      const effort = mission.effort ? ['--effort', mission.effort] : [];
      return { executable: this.executable, args: ['-p', '--output-format', 'json', '--permission-mode', 'dontAsk', '--allowedTools', mission.mode === 'work' ? 'Read,Write,Edit,Glob,Grep' : 'Read,Write', ...model, ...effort], cwd: mission.workspaceRoot, input: query, promptRef: queryRef };
    }
    if (this.id === 'codex') {
      return { executable: this.executable, args: ['exec', '--sandbox', 'workspace-write', '--ephemeral', '--json', ...model, '-'], cwd: mission.workspaceRoot, input: query, promptRef: queryRef };
    }
    const reasoning = mission.effort ? ['--reasoning', mission.effort] : [];
    return { executable: this.executable, args: ['chat', '--query-file', relative(mission.workspaceRoot, queryRef), '--oneshot', '-Q', '--in', mission.workspaceRoot, '--toolsets', 'file', '--ignore-rules', '--max-turns', '12', '--run-budget', '120', ...model, ...reasoning], cwd: mission.workspaceRoot, input: undefined, promptRef: queryRef };
  }

  private handoffState(path: string): HarnessResult['handoffState'] {
    if (!this.validJson(path, join(process.cwd(), 'config', 'handoff.schema.json'))) return null;
    const value = JSON.parse(readFileSync(path, 'utf8')) as { state: HarnessResult['handoffState'] };
    return value.state;
  }

  private validJson(path: string, schemaPath: string): boolean {
    if (!existsSync(path)) return false;
    try {
      const schema = JSON.parse(readFileSync(schemaPath, 'utf8')) as object;
      const instance = JSON.parse(readFileSync(path, 'utf8')) as unknown;
      return new Ajv2020({ allErrors: true, strict: false }).compile(schema)(instance) as boolean;
    } catch {
      return false;
    }
  }
}

export function realHarnessAdapters(runner: ProcessRunner = new ProcessRunner()): Record<RealHarnessId, HarnessAdapter> {
  return {
    claude: new HarnessAdapter('claude', 'claude', runner),
    codex: new HarnessAdapter('codex', 'codex', runner),
    hermes: new HarnessAdapter('hermes', 'hermes', runner),
  };
}
