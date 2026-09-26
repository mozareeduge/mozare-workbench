import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { ProcessRunner } from '../process/ProcessRunner.js';

/** Folders that are tooling state, not project content; agents never receive or return them. */
const EXCLUDED_DIRECTORIES = new Set(['.git', 'node_modules', '.mozare', '.mozare-runtime', '.venv', 'venv', '__pycache__', 'dist', 'build', '.next', '.cache']);
export const RUN_DIRECTORY_NAME = '.mozare-run';
/**
 * Runtime state agent CLIs write for themselves (sessions, hook logs, memory). It is never
 * project work, so it is kept out of proposals even when the harness writes it into the copy.
 */
const HARNESS_STATE_PREFIXES = ['.claude/state/', '.claude/sessions/', '.claude/memory/', '.claude/settings.local.json', '.codex/', '.hermes/'];
const isHarnessState = (path: string) => HARNESS_STATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
const MAX_FILES = 20_000;
const MAX_BYTES = 1024 * 1024 * 1024;
const MAX_DIFF_CHARS = 200_000;

export type FileHashes = Record<string, string>;
export type ChangeKind = 'added' | 'modified' | 'deleted';
export type FileChange = { path: string; kind: ChangeKind };

export class SnapshotLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotLimitError';
  }
}

function sha256(buffer: Buffer | string): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function toPosix(path: string): string {
  return path.split(sep).join('/');
}

/** Lists regular project files (relative, posix) under `root`, skipping tooling folders and links. */
export function listProjectFiles(root: string, skip: Set<string> = new Set()): string[] {
  const files: string[] = [];
  let bytes = 0;
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      const rel = toPosix(relative(root, absolute));
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRECTORIES.has(entry.name) || skip.has(rel)) continue;
        walk(absolute);
      } else if (entry.isFile()) {
        files.push(rel);
        bytes += lstatSync(absolute).size;
        if (files.length > MAX_FILES) throw new SnapshotLimitError(`Project has more than ${MAX_FILES} files; missions support smaller projects in this release.`);
        if (bytes > MAX_BYTES) throw new SnapshotLimitError('Project is larger than 1 GB; missions support smaller projects in this release.');
      }
    }
  };
  walk(root);
  return files.sort();
}

export function hashFiles(root: string, paths: string[]): Record<string, string | null> {
  return Object.fromEntries(paths.map((path) => {
    const absolute = join(root, path);
    return [path, existsSync(absolute) && lstatSync(absolute).isFile() ? sha256(readFileSync(absolute)) : null];
  }));
}

/** One hash over a path→hash map, used as the proposal's base identity for stale detection. */
export function combinedHash(hashes: Record<string, string | null>): string {
  return sha256(JSON.stringify(Object.keys(hashes).sort().map((path) => [path, hashes[path]])));
}

/** Copies the project into a Workbench-owned sandbox and returns the baseline hashes. Never writes to `root`. */
export function createSandbox(root: string, sandbox: string): FileHashes {
  const files = listProjectFiles(root);
  const baseline: FileHashes = {};
  for (const path of files) {
    const source = join(root, path);
    const target = join(sandbox, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    baseline[path] = sha256(readFileSync(source));
  }
  mkdirSync(sandbox, { recursive: true });
  return baseline;
}

/** Compares the sandbox after a run with the baseline taken before it. */
export function sandboxChanges(sandbox: string, baseline: FileHashes): FileChange[] {
  const after = listProjectFiles(sandbox, new Set([RUN_DIRECTORY_NAME]));
  const afterHashes = hashFiles(sandbox, after);
  const changes: FileChange[] = [];
  for (const path of after) {
    if (isHarnessState(path)) continue;
    if (!(path in baseline)) changes.push({ path, kind: 'added' });
    else if (baseline[path] !== afterHashes[path]) changes.push({ path, kind: 'modified' });
  }
  for (const path of Object.keys(baseline)) if (!after.includes(path) && !isHarnessState(path)) changes.push({ path, kind: 'deleted' });
  return changes.sort((a, b) => a.path.localeCompare(b.path));
}

/** Text diff of each change against the live project file, bounded in size; uses fixed git argv, no shell. */
export async function describeChanges(root: string, sandbox: string, changes: FileChange[], scratch: string, runner = new ProcessRunner()): Promise<string> {
  mkdirSync(scratch, { recursive: true });
  const empty = join(scratch, 'empty');
  writeFileSync(empty, '', 'utf8');
  let text = '';
  for (const change of changes) {
    if (text.length >= MAX_DIFF_CHARS) break;
    const before = change.kind === 'added' ? empty : join(root, change.path);
    const after = change.kind === 'deleted' ? empty : join(sandbox, change.path);
    const result = await runner.run('git', ['diff', '--no-index', '--no-color', '--', before, after], scratch, { timeoutMs: 20_000 });
    const body = result.stdout.split(/\r?\n/).filter((line) => !line.startsWith('diff --git') && !line.startsWith('index ') && !line.startsWith('--- ') && !line.startsWith('+++ ')).join('\n');
    text += `--- a/${change.path}\n+++ b/${change.path}\n${body.trim() || `(${change.kind}; binary or no text difference)`}\n`;
  }
  return text.length > MAX_DIFF_CHARS ? `${text.slice(0, MAX_DIFF_CHARS)}\n… diff truncated` : text;
}
