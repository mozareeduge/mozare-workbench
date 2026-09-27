import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WorkLedger } from '../../src/core/continuity/WorkLedger.js';
import { HarnessAdapter, type RealHarnessId } from '../../src/server/agents/HarnessAdapter.js';
import { buildApp } from '../../src/server/app.js';
import { ProcessRunner, type ProcessOptions, type ProcessResult, type RunningProcess } from '../../src/server/process/ProcessRunner.js';
import { WorkspaceRegistry } from '../../src/server/workspaces/WorkspaceRegistry.js';

/** Simulates an agent: edits one file, adds one, deletes one, then writes a handoff with a self-reported test. */
class EditingRunner extends ProcessRunner {
  readonly carriedNotes: string[] = [];
  override async run(command: string, args: string[], cwd: string, options: ProcessOptions = {}): Promise<ProcessResult> {
    if (command === 'git') return super.run(command, args, cwd, options);
    return { command, args, cwd, exitCode: 0, stdout: args.includes('--version') ? `${command} test-version` : 'help', stderr: '' };
  }

  override start(command: string, args: string[], cwd: string): RunningProcess {
    const completion = Promise.resolve().then(() => {
      if (existsSync(join(cwd, 'agent-note.md'))) this.carriedNotes.push(readFileSync(join(cwd, 'agent-note.md'), 'utf8'));
      const objects = join(cwd, 'objects');
      const edited = readdirSync(objects).find((name) => name.startsWith('q_'))!;
      writeFileSync(join(objects, edited), `${readFileSync(join(objects, edited), 'utf8')}\nAgent refinement line.\n`, 'utf8');
      writeFileSync(join(cwd, 'agent-note.md'), '# Agent note\n', 'utf8');
      // Harness runtime state (as Claude Code hooks write) must never become part of a proposal.
      mkdirSync(join(cwd, '.claude', 'state'), { recursive: true });
      writeFileSync(join(cwd, '.claude', 'state', 'session.json'), '{}', 'utf8');
      const source = readdirSync(objects).find((name) => name.startsWith('src_'));
      if (source) unlinkSync(join(objects, source));
      writeFileSync(join(cwd, '.mozare-run', 'handoff.json'), JSON.stringify({
        run_id: 'fake', state: 'completed', summary: 'Refined the question note. Added an agent note.',
        system_view: { intent: 'Tighten the current question.', behavior: 'Note updated.', architecture: ['objects/'], implementation: [], verification: [] },
        changed: [], decisions: [], tests: [{ name: 'Self-check', status: 'passed', command: null, evidence: 'I checked it myself' }],
        artifacts: [], technical_terms: [], blockers: [], open_questions: ['Should sources be re-linked?'], next_action: 'Review.',
      }), 'utf8');
      return { command, args, cwd, exitCode: 0, stdout: '', stderr: '' };
    });
    return { completion, stop: () => true };
  }
}

const hashTree = (root: string): string => {
  const hash = createHash('sha256');
  const walk = (directory: string) => readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).forEach((entry) => {
    const path = join(directory, entry.name);
    hash.update(path.slice(root.length));
    if (entry.isDirectory()) walk(path); else hash.update(readFileSync(path));
  });
  walk(root);
  return hash.digest('hex');
};

describe('TEST-004/006/007/019: live mission-to-review loop', { timeout: 30_000 }, () => {
  const roots: string[] = [];
  const apps: ReturnType<typeof buildApp>[] = [];
  const temp = () => { const root = mkdtempSync(join(tmpdir(), 'mwb-mission-')); roots.push(root); return root; };
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
    roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }));
  });

  const setup = () => {
    const runtime = temp();
    const project = join(temp(), 'project');
    cpSync(join(process.cwd(), 'seed', 'example-project'), project, { recursive: true });
    const ledger = new WorkLedger(join(runtime, 'work-ledger'));
    const registry = new WorkspaceRegistry(join(runtime, 'workspaces.json'), ledger);
    const workspace = registry.register(project);
    const runner = new EditingRunner();
    const adapters = Object.fromEntries((['claude', 'codex', 'hermes'] as RealHarnessId[]).map((id) => [id, new HarnessAdapter(id, id, runner)])) as Record<RealHarnessId, HarnessAdapter>;
    const app = buildApp({ workspaceRegistry: registry, workLedger: ledger, harnessAdapters: adapters, runtimeDir: runtime });
    apps.push(app);
    return { app, project, runtime, runner, id: workspace.id };
  };

  const startMission = (app: ReturnType<typeof buildApp>, id: string, extra: Record<string, unknown> = {}) => app.inject({
    method: 'POST', url: `/api/workspaces/${id}/missions`,
    payload: { harness: 'codex', target: 'Current question', outcome: 'A sharper question', acceptance: ['The question names one testable operation.'], ...extra },
  });

  const waitForItems = async (app: ReturnType<typeof buildApp>, id: string, count: number) => {
    for (let attempt = 0; attempt < 800; attempt += 1) {
      const items = (await app.inject({ method: 'GET', url: `/api/workspaces/${id}/review` })).json().items as Array<Record<string, unknown>>;
      if (items.length >= count) return items;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error('proposal never appeared');
  };

  it('runs in a sandbox, proposes without touching the project, and applies only on Accept', async () => {
    const { app, project, runtime, id } = setup();
    const before = hashTree(project);

    expect((await startMission(app, id, { acceptance: ['  '] })).statusCode).toBe(409);
    const started = await startMission(app, id);
    expect(started.statusCode).toBe(202);
    const [item] = await waitForItems(app, id, 1);

    expect(hashTree(project)).toBe(before);
    const body = JSON.stringify(item);
    expect(body).not.toContain(project);
    expect(body).not.toContain(runtime);
    expect(item.changes).toHaveLength(3);
    expect(item.decisionState).toBe('under_review');
    expect(item.currentBaseCanonicalHash).toBe(item.baseCanonicalHash);
    // The agent's self-reported pass is a claim, never observed evidence.
    expect(item.evidence).toEqual([expect.objectContaining({ status: 'passed', evidence: null })]);

    const flowBefore = (await app.inject({ method: 'GET', url: `/api/workspaces/${id}/flow` })).json().outcomes;
    expect(flowBefore).toEqual([expect.objectContaining({ runState: 'completed_awaiting_review' })]);
    const projection = (await app.inject({ method: 'GET', url: `/api/workspaces/${id}/projection` })).json();
    expect(projection.focus.humanReviewNeed).toEqual({ count: 1, status: 'needs_review' });

    const accepted = await app.inject({ method: 'POST', url: `/api/workspaces/${id}/review/${item.id}/decision`, payload: { state: 'accepted' } });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json().decision).toMatchObject({ state: 'accepted', written: expect.arrayContaining(['agent-note.md']), movedToResidue: [expect.stringMatching(/^objects\/src_/)] });
    expect(existsSync(join(project, 'agent-note.md'))).toBe(true);
    expect(readdirSync(join(runtime, 'residue', id), { recursive: true }).some((name) => String(name).includes('src_'))).toBe(true);
    expect((await app.inject({ method: 'POST', url: `/api/workspaces/${id}/review/${item.id}/decision`, payload: { state: 'rejected' } })).statusCode).toBe(409);
    expect((await app.inject({ method: 'GET', url: `/api/workspaces/${id}/flow` })).json().outcomes).toEqual([expect.objectContaining({ runState: 'accepted' })]);
    const mawsEvents = readFileSync(join(project, '.maws', 'workbench-missions.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    expect(mawsEvents).toEqual([expect.objectContaining({ event: 'mission-accepted', proposal_id: item.id, review_state: 'accepted', harness: 'codex' })]);
  });

  it('refuses a stale Accept and writes nothing; revision needs a note and continues the same task', async () => {
    const { app, project, runner, runtime, id } = setup();
    await startMission(app, id);
    const [item] = await waitForItems(app, id, 1);

    const objects = join(project, 'objects');
    const edited = readdirSync(objects).find((name) => name.startsWith('q_'))!;
    writeFileSync(join(objects, edited), 'Owner changed this meanwhile.\n', 'utf8');
    const before = hashTree(project);
    const stale = await app.inject({ method: 'POST', url: `/api/workspaces/${id}/review/${item.id}/decision`, payload: { state: 'accepted' } });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().error).toBe('stale_base');
    expect(hashTree(project)).toBe(before);

    expect((await app.inject({ method: 'POST', url: `/api/workspaces/${id}/review/${item.id}/decision`, payload: { state: 'revision_requested' } })).statusCode).toBe(409);
    expect((await app.inject({ method: 'POST', url: `/api/workspaces/${id}/review/${item.id}/decision`, payload: { state: 'revision_requested', revisionNote: 'Keep the owner edit.' } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: `/api/workspaces/${id}/flow` })).json().outcomes).toEqual([expect.objectContaining({ runState: 'not_started' })]);

    const continued = await startMission(app, id, { harness: 'hermes', continueProposalId: item.id });
    expect(continued.json().mission).toMatchObject({ taskId: item.taskId, missionId: item.missionId, taskVersion: 2, harness: 'hermes' });
    const items = await waitForItems(app, id, 2);
    expect(items.find((candidate) => candidate.taskVersion === 2)).toMatchObject({ harness: 'hermes', taskId: item.taskId });
    expect(runner.carriedNotes).toContain('# Agent note\n');
    const continuation = JSON.parse(readFileSync(join(runtime, 'missions', id, continued.json().mission.runId, 'sandbox', '.mozare-run', 'continuation.json'), 'utf8'));
    expect(continuation).toMatchObject({ priorRunId: item.runId, priorTaskVersion: 1, conflicts: expect.arrayContaining([`objects/${edited}`]) });
  });

  it('reports an unavailable agent instead of starting it', async () => {
    const { app, id } = setup();
    const capabilities = (await app.inject({ method: 'GET', url: `/api/workspaces/${id}/missions/capabilities` })).json();
    expect(capabilities.agents.map((agent: { id: string }) => agent.id).sort()).toEqual(['claude', 'codex', 'hermes']);
    expect((await startMission(app, id, { harness: 'unknown' })).statusCode).toBe(409);
  });
});
