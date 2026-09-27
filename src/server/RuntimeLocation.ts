import { randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

export function userDataRoot(env: NodeJS.ProcessEnv = process.env, platform = process.platform): string {
  if (env.MWB_DATA_DIR) return resolve(env.MWB_DATA_DIR);
  if (platform === 'win32') return join(env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'Mozare Workbench');
  return join(env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'mozare-workbench');
}

/** Copy old records before switching paths. The old copy is retained for recovery. */
export function durableRuntimeDirectory(repositoryRoot = process.cwd(), env: NodeJS.ProcessEnv = process.env): string {
  if (env.MWB_RUNTIME_DIR) return resolve(env.MWB_RUNTIME_DIR);
  const target = join(userDataRoot(env), 'runtime');
  if (existsSync(target)) return target;
  const legacy = join(repositoryRoot, '.mozare', 'runtime');
  mkdirSync(dirname(target), { recursive: true });
  if (existsSync(legacy)) {
    const staged = `${target}.migrating-${randomUUID()}`;
    cpSync(legacy, staged, { recursive: true, force: false, errorOnExist: true });
    try { renameSync(staged, target); } catch (error) {
      if (!existsSync(target)) throw error;
      // Another Workbench process completed migration first; the legacy copy remains intact.
    }
  } else {
    mkdirSync(target, { recursive: true });
  }
  return target;
}

export function configuredWikiRoot(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.MWB_WIKI_ROOT?.trim()) return resolve(env.MWB_WIKI_ROOT.trim());
  const file = join(userDataRoot(env), 'settings.json');
  if (!existsSync(file)) return null;
  try {
    const value = JSON.parse(readFileSync(file, 'utf8')) as { wikiRoot?: unknown };
    return typeof value.wikiRoot === 'string' && value.wikiRoot.trim() ? resolve(value.wikiRoot.trim()) : null;
  } catch { return null; }
}
