import { realpathSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

/**
 * Path safety for the MCP surface (TEST-012 / SCN-ERR-04 / SCN-ERR-06,
 * TECH/SECURITY.md controls 1, 2 and 4).
 *
 * Every path handed to the MCP surface is treated as hostile until proven to
 * resolve to a location inside the registered workspace root. Errors carry a
 * machine-readable `kind` so callers can report a security event rather than a
 * generic failure:
 *
 * - `path_escape`     — traversal/absolute-path rejection, decided BEFORE any read;
 * - `symlink_escape`  — a real (resolved) path leaves the registered root;
 * - `protected_path`  — secret/credential-shaped content is excluded from context
 *                       entirely (it is never read, never listed by content).
 */

export type PathSafetyErrorKind = 'path_escape' | 'symlink_escape' | 'protected_path';

export class PathSafetyError extends Error {
  constructor(message: string, readonly kind: PathSafetyErrorKind) {
    super(message);
    this.name = 'PathSafetyError';
  }
}

/**
 * Race-free containment keys (see the Windows pitfall: never compare two
 * `Path.resolve()` outputs with `relative_to`-style logic). Both sides go
 * through realpath + separator/case normalization, so the same tree always
 * produces the same key on this host.
 */
export function canonicalPathKey(path: string): string {
  let key = resolve(path);
  try {
    key = realpathSync(key);
  } catch {
    // Non-existent tail: fall back to the resolved path; existence is the
    // caller's concern, containment below is still enforced.
  }
  if (key.startsWith('\\\\?\\')) key = key.slice(4);
  key = key.replaceAll('\\', '/');
  return process.platform === 'win32' ? key.toLowerCase() : key;
}

const PROTECTED_DIR_SEGMENT_NAMES = new Set(['.git', '.ssh', '.aws', '.gnupg', '.config', 'credentials', 'secrets']);
const PROTECTED_BASENAMES = new Set([
  '.npmrc', '.netrc', '.git-credentials', '.htpasswd',
  'credentials.json', 'secrets.json', 'secrets.yaml', 'secrets.yml',
  'id_rsa', 'id_ed25519', 'id_ecdsa', 'id_dsa',
  'credentials.xml', 'known_hosts',
]);

/**
 * Secret/credential-shaped relative paths excluded from context by default
 * (TECH/SECURITY.md control 4). Callers must report the exclusion category,
 * not the path itself, so protected names never echo back into context.
 */
export function isProtectedRelativePath(relativePath: string): boolean {
  const segments = relativePath.replaceAll('\\', '/').split('/').filter(Boolean).map((s) => s.toLowerCase());
  if (segments.length === 0) return false;
  for (const segment of segments) {
    if (PROTECTED_DIR_SEGMENT_NAMES.has(segment)) return true;
    if (segment.startsWith('.env')) return true; // .env, .env.local, .env.production, ...
    if (PROTECTED_BASENAMES.has(segment)) return true;
  }
  return false;
}

/** Human-reportable category for a protected path, without echoing the path. */
export function protectedPathCategory(relativePath: string): string {
  const segments = relativePath.replaceAll('\\', '/').split('/').filter(Boolean).map((s) => s.toLowerCase());
  for (const segment of segments) {
    if (segment.startsWith('.env')) return 'secret configuration file';
    if (segment === '.ssh' || segment.startsWith('id_')) return 'SSH key material';
    if (segment === '.aws' || segment === '.gnupg') return 'credential store';
    if (segment === 'credentials' || segment.startsWith('credentials.')) return 'credential store';
    if (segment === 'secrets' || segment.startsWith('secrets.')) return 'secret store';
    if (segment === '.git' || segment === 'known_hosts' || segment === '.npmrc' || segment === '.netrc' || segment === '.htpasswd') return 'internal/credential file';
  }
  return 'protected file';
}

/**
 * Resolve a workspace-relative candidate to an absolute real path that is
 * PROVEN to stay inside the registered root, or throw a PathSafetyError.
 * Absolute candidates are rejected outright: MCP callers receive registered
 * IDs and relative object paths, never filesystem-wide addressing.
 */
export function resolveWithin(root: string, candidate: string): string {
  if (typeof candidate !== 'string' || candidate.trim() === '') {
    throw new PathSafetyError('path candidates must be non-empty workspace-relative strings', 'path_escape');
  }
  if (isAbsolute(candidate) || /^[A-Za-z]:[\\/]/.test(candidate) || candidate.startsWith('\\\\')) {
    throw new PathSafetyError('absolute paths are not accepted through the MCP surface', 'path_escape');
  }
  const segments = candidate.replaceAll('\\', '/').split('/');
  if (segments.some((s) => s === '..')) {
    throw new PathSafetyError('path traversal rejected: candidate escapes the registered workspace root', 'path_escape');
  }
  if (isProtectedRelativePath(candidate)) {
    throw new PathSafetyError('protected path excluded from context by policy', 'protected_path');
  }

  const rootKey = canonicalPathKey(root);
  const joined = join(resolve(root), ...segments.filter((s) => s.length > 0 && s !== '.'));
  const joinedKey = joined.replaceAll('\\', '/').toLowerCase();
  const rootKeyNormalized = rootKey.replaceAll('\\', '/');
  if (!joinedKey.startsWith(rootKeyNormalized.endsWith('/') ? rootKeyNormalized : `${rootKeyNormalized}/`)) {
    throw new PathSafetyError('path traversal rejected: candidate escapes the registered workspace root', 'path_escape');
  }

  // Symlink containment: if anything along the chain exists and resolves
  // outside the root, the candidate is an escape — even though the naive join
  // stayed inside it.
  const realKey = canonicalPathKey(joined);
  if (realKey !== rootKey && !realKey.startsWith(rootKeyNormalized.endsWith('/') ? rootKeyNormalized : `${rootKeyNormalized}/`)) {
    throw new PathSafetyError('symlink escape rejected: resolved target leaves the registered workspace root', 'symlink_escape');
  }
  return joined;
}
