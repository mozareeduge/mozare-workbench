import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, relative, sep } from 'node:path';
import type { CanonicalArtifact, CanonicalObject } from '../../core/workspace.js';
import type { FieldProjection } from '../../core/projection/FieldProjection.js';

const OUTPUT_DIRS = ['outputs', 'output', 'artifacts', 'exports', '_exports', 'deliverables'];
const HIDDEN = new Set(['.git', '.maws', '.mozare', '.claude', '.codex', '.hermes', 'node_modules', 'dist', 'build', '.venv', 'venv', '.cache']);
const FIELD_LIMIT = 20;
const OUTPUT_LIMIT = 30;
const id = (prefix: string, path: string) => `${prefix}_${createHash('sha256').update(path).digest('hex').slice(0, 16)}`;
const posix = (path: string) => path.split(sep).join('/');

const kindFor = (path: string): string => {
  const extension = extname(path).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(extension)) return 'image';
  if (['.mp3', '.wav', '.ogg', '.m4a'].includes(extension)) return 'audio';
  if (['.mp4', '.webm', '.mov'].includes(extension)) return 'video';
  if (extension === '.pdf') return 'pdf';
  if (extension === '.html') return 'html';
  if (extension === '.json') return 'json';
  if (['.md', '.txt', '.csv', '.yaml', '.yml'].includes(extension)) return 'text';
  return 'binary';
};

/** Filesystem orientation for existing projects without Workbench canonical records. */
export function observeStructure(root: string): { field: FieldProjection & { source: 'observed' }; artifacts: CanonicalArtifact[] } {
  const entries = readdirSync(root, { withFileTypes: true })
    .filter((entry) => !HIDDEN.has(entry.name) && !entry.name.startsWith('.') && !entry.isSymbolicLink())
    .filter((entry) => entry.isDirectory() || (entry.isFile() && /^(README|PROJECT|INDEX|OVERVIEW)(\.|$)/i.test(entry.name)))
    .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
  const nodes: CanonicalObject[] = entries.slice(0, FIELD_LIMIT).map((entry) => ({
    id: id('observed', entry.name), type: entry.isDirectory() ? 'folder' : 'document', project_id: 'observed',
    name: entry.name, lifecycle: 'observed', evidence_state: 'unverified', use_status: 'orientation',
    verification_state: 'unverified', origin: { kind: 'filesystem' }, relations: [],
  }));
  const candidates: Array<{ path: string; mtime: number }> = [];
  const visit = (directory: string, depth: number) => {
    if (depth > 2) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || HIDDEN.has(entry.name) || entry.isSymbolicLink()) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path, depth + 1);
      else if (entry.isFile()) candidates.push({ path, mtime: statSync(path).mtimeMs });
      if (candidates.length > 500) return;
    }
  };
  for (const name of OUTPUT_DIRS) {
    const directory = join(root, name);
    if (existsSync(directory) && !lstatSync(directory).isSymbolicLink() && statSync(directory).isDirectory()) visit(directory, 0);
  }
  const artifacts: CanonicalArtifact[] = candidates.sort((a, b) => b.mtime - a.mtime).slice(0, OUTPUT_LIMIT).map(({ path }) => {
    const ref = posix(relative(root, path));
    return { id: id('observed_artifact', ref), name: basename(path), kind: kindFor(path), ref, canonicality: 'external', verification_state: 'unverified', source: 'observed' };
  });
  return { field: { source: 'observed', currentObject: null, nodes, relations: [], hiddenByProjection: Math.max(0, entries.length - nodes.length), layout: {} }, artifacts };
}
