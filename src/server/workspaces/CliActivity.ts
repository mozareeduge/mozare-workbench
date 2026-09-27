import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { ProcessRunner } from '../process/ProcessRunner.js';

/**
 * Work done directly in agent CLIs is recorded by the project's own MAWS threads (`.maws/`) and
 * git history, not by Workbench. This reader turns both into a bounded, read-only summary for any
 * registered project. Harness names are open strings (claude, codex, hermes, opencode, …); an
 * event is attributed to the harness MAWS says was working at that moment ("Created by codex",
 * "Resumed by hermes", "Claimed by claude"). It never writes to the project and never returns
 * absolute paths, prompts or raw logs.
 */
export type HarnessName = string;

export type CliWorkItem = {
  id: string;
  title: string;
  outcome: string;
  status: 'queued' | 'active' | 'done' | 'failed' | 'blocked' | 'deferred';
  closedAt: string | null;
  /** Harness that created, claimed and (if done) completed the item, as recorded in MAWS events. */
  createdBy: HarnessName | null;
  claimedBy: HarnessName | null;
  completedBy: HarnessName | null;
  evidence: string[];
};
export type CliEvent = { at: string; harness: HarnessName | null; kind: string; text: string; itemId: string | null };
export type CliThread = {
  id: string;
  title: string;
  objective: string;
  status: string;
  phase: string;
  summary: string;
  active: boolean;
  lastHarness: HarnessName | null;
  updatedAt: string | null;
  activeItem: CliWorkItem | null;
  items: CliWorkItem[];
  blockers: string[];
  recentDecisions: string[];
  recentEvents: CliEvent[];
};
export type CliCommit = { sha: string; author: string; at: string; subject: string; harness: HarnessName | null };

export type CliActivity = {
  /** The active MAWS thread (kept for the Focus summary). */
  maws: CliThread | null;
  /** Every MAWS thread in the project, newest first; non-active open threads are parked phases. */
  threads: CliThread[];
  git: { branch: string; uncommittedFiles: number; commits: CliCommit[] } | null;
};

const text = (value: unknown, limit = 400) => (typeof value === 'string' ? value.trim().slice(0, limit) : '');
const strings = (value: unknown, count: number) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(-count).map((item) => item.slice(0, 300)) : []);

const KNOWN = ['claude', 'codex', 'hermes', 'opencode', 'cursor', 'gemini', 'aider', 'copilot', 'openclaw'];

/** Recognizes a harness in free text (commit trailers, author names, host fields). */
export function harnessOf(value: string): HarnessName | null {
  const lower = value.toLowerCase();
  if (/openai|chatgpt/.test(lower)) return 'codex';
  return KNOWN.find((name) => lower.includes(name)) ?? null;
}

/** "Created by codex", "Resumed by hermes", "Claimed by claude", "to codex" → the harness named. */
function harnessInMessage(message: string): HarnessName | null {
  const match = message.match(/\b(?:created|resumed|claimed|completed|started)\s+by\s+([\w.-]+)/i) ?? message.match(/^to\s+([\w.-]+)$/i);
  return match ? match[1].toLowerCase() : null;
}

function readJsonLines(path: string): Array<Record<string, unknown>> {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line) as Record<string, unknown>]; } catch { return []; }
  });
}

type ThreadState = {
  title?: unknown; objective?: unknown; status?: unknown; phase?: unknown; summary?: unknown; blockers?: unknown; decisions?: unknown;
  updated_at?: unknown; host?: { last?: unknown }; work?: { items?: unknown; active_item?: unknown };
};

function readThread(directory: string, id: string, active: boolean): CliThread | null {
  const statePath = join(directory, 'state.json');
  if (!existsSync(statePath)) return null;
  let state: ThreadState;
  try { state = JSON.parse(readFileSync(statePath, 'utf8')) as ThreadState; } catch { return null; }

  // Replay events in time order, tracking which harness is working, and attribute item events to it.
  const raw = [...readJsonLines(join(directory, 'events.jsonl')), ...readJsonLines(join(directory, 'evidence.jsonl'))]
    .filter((event) => typeof event.at === 'string')
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const attribution = new Map<string, { createdBy: HarnessName | null; claimedBy: HarnessName | null; completedBy: HarnessName | null; evidence: string[] }>();
  const at = (itemId: string) => {
    const existing = attribution.get(itemId) ?? { createdBy: null, claimedBy: null, completedBy: null, evidence: [] };
    attribution.set(itemId, existing);
    return existing;
  };
  let current: HarnessName | null = null;
  const events: CliEvent[] = [];
  for (const event of raw) {
    const message = text(event.message ?? event.note ?? '', 240);
    const kind = text(event.type ?? event.kind, 40) || 'event';
    const named = (typeof event.host === 'string' ? event.host.toLowerCase() : null) ?? harnessInMessage(message);
    if (named) current = named;
    const harness = named ?? current;
    const itemId = typeof event.item_id === 'string' ? event.item_id
      : /^item-/.test(kind) ? message.split(':')[0].trim() || null : null;
    if (itemId) {
      const record = at(itemId);
      if (kind === 'item-added') record.createdBy = harness;
      if (kind === 'item-claimed') record.claimedBy = harness;
      if (kind === 'item-completed') record.completedBy = harness;
      if (event.result || kind === 'evidence') record.evidence.push(`${text(event.kind ?? kind, 30)}: ${text(event.ref ?? message, 160)} ${text(event.result, 20)}`.trim());
    }
    const shown = kind === 'evidence' || event.result ? `${itemId ?? ''} ${text(event.ref, 120)} ${text(event.result, 20)} ${message}`.trim() : message;
    events.push({ at: String(event.at), harness, kind, text: shown.slice(0, 240), itemId });
  }

  const items: CliWorkItem[] = (Array.isArray(state.work?.items) ? state.work.items as Array<Record<string, unknown>> : []).map((item) => {
    const id = text(item.id, 60);
    const record = attribution.get(id);
    return {
      id,
      title: text(item.title, 200),
      outcome: text(item.outcome, 600),
      status: (['queued', 'active', 'done', 'failed', 'blocked', 'deferred'].includes(String(item.status)) ? item.status : 'queued') as CliWorkItem['status'],
      closedAt: typeof item.closed_at === 'string' ? item.closed_at : null,
      createdBy: record?.createdBy ?? null,
      claimedBy: record?.claimedBy ?? null,
      completedBy: record?.completedBy ?? null,
      evidence: [...(record?.evidence ?? []), ...strings(item.evidence, 5)].slice(-6),
    };
  });
  const lastHost = typeof state.host?.last === 'string' ? state.host.last.toLowerCase() : null;
  let updatedAt = typeof state.updated_at === 'string' ? state.updated_at : null;
  if (!updatedAt) { try { updatedAt = statSync(statePath).mtime.toISOString(); } catch { updatedAt = null; } }
  return {
    id,
    title: text(state.title, 200),
    objective: text(state.objective, 600),
    status: text(state.status, 40),
    phase: text(state.phase, 40),
    summary: text(state.summary, 600),
    active,
    // Events carry the observed worker; the state's host field can lag behind, so it is only a fallback.
    lastHarness: current ?? lastHost,
    updatedAt,
    activeItem: items.find((item) => item.id === state.work?.active_item) ?? null,
    items,
    blockers: strings(state.blockers, 5),
    recentDecisions: strings(state.decisions, 3),
    recentEvents: events.slice(-10).reverse(),
  };
}

function readThreads(root: string): CliThread[] {
  const threadsDirectory = join(root, '.maws', 'threads');
  if (!existsSync(threadsDirectory)) return [];
  const activeFile = join(root, '.maws', 'ACTIVE');
  const activeId = existsSync(activeFile) ? readFileSync(activeFile, 'utf8').trim() : '';
  return readdirSync(threadsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^[\w.-]+$/.test(entry.name))
    .flatMap((entry) => {
      const thread = readThread(join(threadsDirectory, entry.name), entry.name, entry.name === activeId);
      return thread ? [thread] : [];
    })
    .sort((a, b) => Number(b.active) - Number(a.active) || (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

/** Finds the git directory, including worktrees where `.git` is a file pointing elsewhere. */
export function gitDirectory(root: string): string | null {
  const dotGit = join(root, '.git');
  if (!existsSync(dotGit)) return null;
  if (statSync(dotGit).isDirectory()) return dotGit;
  const match = readFileSync(dotGit, 'utf8').match(/^gitdir:\s*(.+)$/m);
  if (!match) return null;
  const pointed = isAbsolute(match[1].trim()) ? match[1].trim() : resolve(root, match[1].trim());
  // A worktree's gitdir is <main>/.git/worktrees/<name>; the shared config lives in <main>/.git.
  return /[\\/]worktrees[\\/][^\\/]+$/.test(pointed) ? dirname(dirname(pointed)) : pointed;
}

async function readGit(root: string, runner: ProcessRunner): Promise<CliActivity['git']> {
  if (!gitDirectory(root)) return null;
  const run = (args: string[]) => runner.run('git', args, root, { timeoutMs: 15_000 });
  const [branch, status, log] = await Promise.all([
    run(['rev-parse', '--abbrev-ref', 'HEAD']),
    run(['status', '--porcelain=v1']),
    run(['log', '-12', '--format=%h%x1f%an%x1f%ae%x1f%aI%x1f%s%x1f%b%x1e']),
  ]);
  if (branch.exitCode !== 0) return null;
  const commits = log.stdout.split('\x1e').map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const [sha, author, email, at, subject, body = ''] = entry.split('\x1f');
    const trailer = body.split(/\r?\n/).filter((line) => /^co-authored-by:|generated with|created with/i.test(line)).join(' ');
    return { sha, author: author.slice(0, 80), at, subject: subject.slice(0, 200), harness: harnessOf(trailer) ?? harnessOf(`${author} ${email}`) ?? harnessOf(subject) };
  });
  return { branch: branch.stdout.trim(), uncommittedFiles: status.stdout.split(/\r?\n/).filter(Boolean).length, commits };
}

export async function readCliActivity(root: string, runner = new ProcessRunner()): Promise<CliActivity> {
  let threads: CliThread[] = [];
  try { threads = readThreads(root); } catch { threads = []; }
  let git: CliActivity['git'] = null;
  try { git = await readGit(root, runner); } catch { git = null; }
  return { maws: threads.find((thread) => thread.active) ?? threads[0] ?? null, threads, git };
}
