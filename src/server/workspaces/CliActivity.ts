import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProcessRunner } from '../process/ProcessRunner.js';

/**
 * Work done directly in agent CLIs (Codex, Claude Code, Hermes) is recorded by the project's own
 * MAWS thread (`.maws/`) and git history, not by Workbench. This reader turns both into a bounded,
 * read-only activity summary so Workbench shows CLI work for any registered project. It never
 * writes to the project and never returns absolute paths, prompts or raw logs.
 */
export type HarnessName = 'claude' | 'codex' | 'hermes' | 'other';

export type CliWorkItem = { id: string; title: string; status: 'queued' | 'active' | 'done' | 'failed' | 'blocked' | 'deferred'; closedAt: string | null };
export type CliEvent = { at: string; harness: HarnessName; kind: string; text: string };
export type CliCommit = { sha: string; author: string; at: string; subject: string; harness: HarnessName | null };

export type CliActivity = {
  maws: {
    threadTitle: string;
    objective: string;
    status: string;
    phase: string;
    summary: string;
    lastHarness: HarnessName | null;
    updatedAt: string | null;
    activeItem: CliWorkItem | null;
    items: CliWorkItem[];
    blockers: string[];
    recentDecisions: string[];
    recentEvents: CliEvent[];
  } | null;
  git: { branch: string; uncommittedFiles: number; commits: CliCommit[] } | null;
};

const text = (value: unknown, limit = 400) => (typeof value === 'string' ? value.trim().slice(0, limit) : '');
const strings = (value: unknown, count: number) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(-count).map((item) => item.slice(0, 300)) : []);

export function harnessOf(value: string): HarnessName | null {
  const lower = value.toLowerCase();
  if (/claude/.test(lower)) return 'claude';
  if (/codex|openai|chatgpt/.test(lower)) return 'codex';
  if (/hermes/.test(lower)) return 'hermes';
  return null;
}

function readJsonLines(path: string, limit: number): Array<Record<string, unknown>> {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean).slice(-limit).flatMap((line) => {
    try { return [JSON.parse(line) as Record<string, unknown>]; } catch { return []; }
  });
}

function readMaws(root: string): CliActivity['maws'] {
  const activeFile = join(root, '.maws', 'ACTIVE');
  if (!existsSync(activeFile)) return null;
  const threadId = readFileSync(activeFile, 'utf8').trim();
  if (!/^[\w.-]+$/.test(threadId)) return null;
  const thread = join(root, '.maws', 'threads', threadId);
  const statePath = join(thread, 'state.json');
  if (!existsSync(statePath)) return null;
  type ThreadState = { title?: unknown; objective?: unknown; status?: unknown; phase?: unknown; summary?: unknown; blockers?: unknown; decisions?: unknown; updated_at?: unknown; host?: { last?: unknown }; work?: { items?: unknown; active_item?: unknown } };
  let state: ThreadState;
  try { state = JSON.parse(readFileSync(statePath, 'utf8')) as ThreadState; } catch { return null; }
  const items: CliWorkItem[] = (Array.isArray(state.work?.items) ? state.work.items as Array<Record<string, unknown>> : []).map((item: Record<string, unknown>) => ({
    id: text(item.id, 60), title: text(item.title, 200), status: (['queued', 'active', 'done', 'failed', 'blocked', 'deferred'].includes(String(item.status)) ? item.status : 'queued') as CliWorkItem['status'],
    closedAt: typeof item.closed_at === 'string' ? item.closed_at : null,
  }));
  const events = [...readJsonLines(join(thread, 'events.jsonl'), 40), ...readJsonLines(join(thread, 'evidence.jsonl'), 40)]
    .filter((event) => typeof event.at === 'string')
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, 8)
    .map((event) => ({
      at: String(event.at),
      harness: harnessOf(String(event.host ?? '')) ?? 'other',
      kind: text(event.type ?? event.kind, 40) || 'event',
      text: text(event.message ?? event.note ?? `${event.item_id ?? ''} ${event.result ?? ''}`, 240),
    }));
  return {
    threadTitle: text(state.title, 200),
    objective: text(state.objective, 600),
    status: text(state.status, 40),
    phase: text(state.phase, 40),
    summary: text(state.summary, 600),
    lastHarness: harnessOf(String(state.host?.last ?? '')),
    updatedAt: typeof state.updated_at === 'string' ? state.updated_at : null,
    activeItem: items.find((item) => item.id === state.work?.active_item) ?? null,
    items,
    blockers: strings(state.blockers, 5),
    recentDecisions: strings(state.decisions, 3),
    recentEvents: events,
  };
}

async function readGit(root: string, runner: ProcessRunner): Promise<CliActivity['git']> {
  if (!existsSync(join(root, '.git'))) return null;
  const run = (args: string[]) => runner.run('git', args, root, { timeoutMs: 15_000 });
  const [branch, status, log] = await Promise.all([
    run(['rev-parse', '--abbrev-ref', 'HEAD']),
    run(['status', '--porcelain=v1']),
    run(['log', '-8', '--format=%h%x1f%an%x1f%aI%x1f%s%x1f%b%x1e']),
  ]);
  if (branch.exitCode !== 0) return null;
  const commits = log.stdout.split('\x1e').map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const [sha, author, at, subject, body = ''] = entry.split('\x1f');
    const trailer = body.split(/\r?\n/).filter((line) => /^co-authored-by:/i.test(line)).join(' ');
    return { sha, author: author.slice(0, 80), at, subject: subject.slice(0, 200), harness: harnessOf(trailer) ?? harnessOf(author) };
  });
  return { branch: branch.stdout.trim(), uncommittedFiles: status.stdout.split(/\r?\n/).filter(Boolean).length, commits };
}

export async function readCliActivity(root: string, runner = new ProcessRunner()): Promise<CliActivity> {
  let maws: CliActivity['maws'] = null;
  try { maws = readMaws(root); } catch { maws = null; }
  let git: CliActivity['git'] = null;
  try { git = await readGit(root, runner); } catch { git = null; }
  return { maws, git };
}
