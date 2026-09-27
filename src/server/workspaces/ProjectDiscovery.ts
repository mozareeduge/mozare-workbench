import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { ProcessRunner } from '../process/ProcessRunner.js';
import { gitDirectory } from './CliActivity.js';

/**
 * Finds the projects the owner's agent CLIs already work in, so Workbench never depends on a
 * hand-maintained list. Sources are read-only: Claude Code (~/.claude.json), Codex
 * (~/.codex/config.toml + session metadata), Hermes (~/.hermes projects.db + state.db), and
 * GitHub repositories visible to the `gh` CLI. Absolute paths stay server-side; the browser gets
 * an opaque id, a display name and a short location hint.
 */
export type DiscoverySource = 'claude' | 'codex' | 'hermes' | 'maws' | 'github';

export type DiscoveredProject = {
  id: string;
  name: string;
  locationHint: string;
  sources: DiscoverySource[];
  lastUsedAt: string | null;
  local: boolean;
  /** GitHub `owner/name` when the project exists only in the cloud. */
  cloudRepo: string | null;
};

type Candidate = { root: string; source: DiscoverySource; at: string | null };

const HOME = homedir();
const CACHE_MS = 60_000;

function norm(path: string): string {
  return resolve(path).replace(/[\\/]+$/, '').toLowerCase();
}

/** Places that are workspaces for tools, not projects. */
function isNoise(path: string): boolean {
  const p = norm(path);
  const home = norm(HOME);
  if (p === home) return !existsSync(join(HOME, '.maws', 'threads'));
  if (/^[a-z]:$/.test(p) || ['Documents', 'Desktop', 'Downloads', 'OneDrive'].some((folder) => p === norm(join(HOME, folder)))) return true;
  const inside = (prefix: string) => p === prefix || p.startsWith(`${prefix}\\`) || p.startsWith(`${prefix}/`);
  // Judge by the part below the home folder, so a home that itself lives somewhere unusual is not filtered out.
  const below = inside(home) ? p.slice(home.length) : p;
  return (!inside(home) && inside(norm(tmpdir())))
    || ['AppData', '.harness-mem', '.codex', '.claude', '.hermes'].some((folder) => inside(norm(join(HOME, folder))))
    // Codex desktop creates dated scratch folders (Documents\Codex\2026-09-27\...).
    || /[\\/]codex[\\/]\d{4}-\d{2}-\d{2}([\\/]|$)/.test(below)
    || /scratch-workspaces|[\\/]temp[\\/]/.test(below);
}

/** Maps a working directory to its repository root when it lives inside one. */
function projectRoot(path: string): string {
  let current = resolve(path);
  for (let depth = 0; depth < 8; depth += 1) {
    // The home folder is only its own project when work started there; subfolders never collapse into it.
    if (norm(current) === norm(HOME) && depth > 0) break;
    if (existsSync(join(current, '.git')) || existsSync(join(current, '.maws'))) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return resolve(path);
}

function fromClaude(): Candidate[] {
  const file = join(HOME, '.claude.json');
  if (!existsSync(file)) return [];
  try {
    const projects = (JSON.parse(readFileSync(file, 'utf8')) as { projects?: Record<string, unknown> }).projects ?? {};
    const sessions = join(HOME, '.claude', 'projects');
    const fromSessions: Candidate[] = [];
    // Claude desktop (Code tab) sessions are recorded per folder here even when ~/.claude.json does not list the folder.
    if (existsSync(sessions)) {
      for (const entry of readdirSync(sessions, { withFileTypes: true }).filter((item) => item.isDirectory())) {
        const directory = join(sessions, entry.name);
        const newest = readdirSync(directory).filter((name) => name.endsWith('.jsonl'))
          .map((name) => ({ name, mtime: statSync(join(directory, name)).mtimeMs })).sort((a, b) => b.mtime - a.mtime)[0];
        if (!newest) continue;
        const head = readFileSync(join(directory, newest.name), 'utf8').slice(0, 200_000);
        const cwd = head.match(/"cwd":"((?:[^"\\]|\\.)*)"/);
        if (cwd) fromSessions.push({ root: JSON.parse(`"${cwd[1]}"`) as string, source: 'claude', at: new Date(newest.mtime).toISOString() });
      }
    }
    return [...fromSessions, ...Object.keys(projects).map((root) => {
      const encoded = join(sessions, root.replace(/[^A-Za-z0-9]/g, '-'));
      let at: string | null = null;
      try { at = statSync(encoded).mtime.toISOString(); } catch { at = null; }
      return { root, source: 'claude' as const, at };
    })];
  } catch { return []; }
}

function fromCodex(): Candidate[] {
  const candidates: Candidate[] = [];
  const config = join(HOME, '.codex', 'config.toml');
  if (existsSync(config)) {
    for (const match of readFileSync(config, 'utf8').matchAll(/^\[projects\.(?:"([^"]+)"|'([^']+)')\]/gm)) {
      candidates.push({ root: (match[1] ?? match[2]).replace(/\\\\/g, '\\'), source: 'codex', at: null });
    }
  }
  const sessions = join(HOME, '.codex', 'sessions');
  if (existsSync(sessions)) {
    const files: string[] = [];
    const walk = (directory: string, depth: number) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory() && depth < 4) walk(path, depth + 1);
        else if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(path);
      }
    };
    walk(sessions, 0);
    for (const file of files.sort().reverse().slice(0, 400)) {
      try {
        const first = readFileSync(file, 'utf8').split('\n', 1)[0];
        const meta = JSON.parse(first) as { payload?: { cwd?: string; timestamp?: string } };
        if (meta.payload?.cwd) candidates.push({ root: meta.payload.cwd, source: 'codex', at: meta.payload.timestamp ?? null });
      } catch { /* unreadable session metadata is skipped */ }
    }
  }
  return candidates;
}

async function fromHermes(): Promise<Candidate[]> {
  const home = join(HOME, '.hermes');
  if (!existsSync(home)) return [];
  const candidates: Candidate[] = [];
  try {
    const { DatabaseSync } = await import('node:sqlite');
    if (existsSync(join(home, 'projects.db'))) {
      const db = new DatabaseSync(join(home, 'projects.db'), { readOnly: true });
      for (const row of db.prepare('select path from project_folders union select primary_path as path from projects where archived = 0').all() as Array<{ path: string | null }>) {
        if (row.path) candidates.push({ root: row.path, source: 'hermes', at: null });
      }
      db.close();
    }
    if (existsSync(join(home, 'state.db'))) {
      const db = new DatabaseSync(join(home, 'state.db'), { readOnly: true });
      const rows = db.prepare('select coalesce(git_repo_root, cwd) as root, max(coalesce(last_activity_at, started_at)) as latest from sessions where coalesce(git_repo_root, cwd) is not null group by 1 order by latest desc limit 200').all() as Array<{ root: string; latest: number | null }>;
      for (const row of rows) candidates.push({ root: row.root, source: 'hermes', at: row.latest ? new Date(row.latest * 1000).toISOString() : null });
      db.close();
    }
  } catch { /* Hermes store unavailable or locked: skip, never fail discovery */ }
  return candidates;
}

/** Projects with a MAWS setup on disk: every harness writes here, so it catches projects no session store lists. */
function fromMaws(): Candidate[] {
  const candidates: Candidate[] = [];
  const skip = new Set(['node_modules', '.git', 'AppData', '.venv', 'venv', '__pycache__', '.cache', 'dist', 'build']);
  const walk = (directory: string, depth: number) => {
    let entries;
    try { entries = readdirSync(directory, { withFileTypes: true }); } catch { return; }
    if (entries.some((entry) => entry.isDirectory() && entry.name === '.maws')) {
      let at: string | null = null;
      try { at = statSync(join(directory, '.maws')).mtime.toISOString(); } catch { at = null; }
      candidates.push({ root: directory, source: 'maws', at });
    }
    if (depth >= 6) return;
    for (const entry of entries) {
      if (entry.isDirectory() && !skip.has(entry.name) && !entry.name.startsWith('.')) walk(join(directory, entry.name), depth + 1);
    }
  };
  if (existsSync(join(HOME, '.maws', 'threads'))) candidates.push({ root: HOME, source: 'maws', at: null });
  for (const base of ['Documents', 'Desktop', 'source', 'repos', 'code', 'projects', 'github']) {
    const path = join(HOME, base);
    if (existsSync(path)) walk(path, 0);
  }
  return candidates;
}

async function fromGithub(runner: ProcessRunner): Promise<Array<{ name: string; repo: string; updatedAt: string }>> {
  try {
    const result = await runner.run('gh', ['repo', 'list', '--limit', '200', '--json', 'name,nameWithOwner,updatedAt'], process.cwd(), { timeoutMs: 20_000 });
    if (result.exitCode !== 0) return [];
    return (JSON.parse(result.stdout) as Array<{ name: string; nameWithOwner: string; updatedAt: string }>).map((repo) => ({ name: repo.name, repo: repo.nameWithOwner, updatedAt: repo.updatedAt }));
  } catch { return []; }
}

/** `owner/name` of the GitHub remote in a local repository's git config, if any. */
function githubRemote(root: string): string | null {
  try {
    const directory = gitDirectory(root);
    if (!directory) return null;
    const config = readFileSync(join(directory, 'config'), 'utf8');
    const match = config.match(/url\s*=\s*(?:https:\/\/github\.com\/|git@github\.com:)([^\s]+?)(?:\.git)?\s*$/m);
    return match ? match[1].toLowerCase() : null;
  } catch { return null; }
}

function hint(root: string): string {
  const parent = basename(dirname(root));
  const grand = basename(dirname(dirname(root)));
  return [grand, parent].filter(Boolean).join(' › ');
}

export class ProjectDiscovery {
  private cache: { at: number; projects: DiscoveredProject[]; roots: Map<string, string> } | null = null;

  constructor(private readonly runner = new ProcessRunner()) {}

  async list(force = false): Promise<DiscoveredProject[]> {
    if (!force && this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.projects;
    const [hermes, github] = await Promise.all([fromHermes(), fromGithub(this.runner)]);
    const byRoot = new Map<string, { root: string; sources: Set<DiscoverySource>; at: string | null }>();
    for (const candidate of [...fromClaude(), ...fromCodex(), ...hermes, ...fromMaws()]) {
      if (!candidate.root || isNoise(candidate.root)) continue;
      let exists = false;
      try { exists = statSync(candidate.root).isDirectory(); } catch { exists = false; }
      if (!exists) continue;
      const root = projectRoot(candidate.root);
      if (isNoise(root)) continue;
      const key = norm(root);
      const entry = byRoot.get(key) ?? { root, sources: new Set<DiscoverySource>(), at: null };
      entry.sources.add(candidate.source);
      if (candidate.at && (!entry.at || candidate.at > entry.at)) entry.at = candidate.at;
      byRoot.set(key, entry);
    }
    const roots = new Map<string, string>();
    const localByRepo = new Map<string, DiscoveredProject>();
    const projects: DiscoveredProject[] = [...byRoot.values()].map((entry) => {
      const id = `dsc_${createHash('sha256').update(norm(entry.root)).digest('hex').slice(0, 16)}`;
      roots.set(id, entry.root);
      const project: DiscoveredProject = { id, name: norm(entry.root) === norm(HOME) ? `Home folder (${basename(entry.root)})` : basename(entry.root), locationHint: hint(entry.root), sources: [...entry.sources].sort(), lastUsedAt: entry.at, local: true, cloudRepo: null };
      const remote = githubRemote(entry.root);
      if (remote) localByRepo.set(remote, project);
      return project;
    });
    for (const repo of github) {
      const local = localByRepo.get(repo.repo.toLowerCase());
      if (local) {
        if (!local.sources.includes('github')) local.sources.push('github');
        continue;
      }
      projects.push({ id: `gh_${createHash('sha256').update(repo.repo).digest('hex').slice(0, 16)}`, name: repo.name, locationHint: `GitHub · ${repo.repo}`, sources: ['github'], lastUsedAt: repo.updatedAt, local: false, cloudRepo: repo.repo });
    }
    projects.sort((a, b) => Number(b.local) - Number(a.local) || (b.lastUsedAt ?? '').localeCompare(a.lastUsedAt ?? '') || a.name.localeCompare(b.name));
    this.cache = { at: Date.now(), projects, roots };
    return projects;
  }

  /** Resolves a discovery id to its local root (server-side only). */
  async rootFor(id: string): Promise<string | null> {
    if (!this.cache) await this.list();
    return this.cache?.roots.get(id) ?? null;
  }

  async cloudRepoFor(id: string): Promise<string | null> {
    return (await this.list()).find((project) => project.id === id)?.cloudRepo ?? null;
  }

  /** Clones a GitHub-only project into ~/Documents/Workbench Projects/<name> with fixed argv. */
  async clone(id: string): Promise<string> {
    const repo = await this.cloudRepoFor(id);
    if (!repo) throw new Error('Unknown cloud project.');
    const target = join(HOME, 'Documents', 'Workbench Projects', repo.split('/')[1]);
    if (existsSync(target)) return target;
    const result = await this.runner.run('gh', ['repo', 'clone', repo, target], process.cwd(), { timeoutMs: 600_000 });
    if (result.exitCode !== 0) throw new Error('Cloning from GitHub failed; nothing was registered.');
    this.cache = null;
    return target;
  }
}
