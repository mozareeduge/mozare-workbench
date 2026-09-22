import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net, { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

// TASK-P09-01 (TEST-013 loopback, TEST-017 degraded adapters): Windows
// launcher preflight and recovery diagnostics must observe the real machine
// state and report truthfully — optional capability absence is advisory, a
// missing required runtime or canonical project truth is blocking.

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const POWERSHELL = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

type JsonRecord = Record<string, unknown>;

const tempRoots: string[] = [];
const children: ReturnType<typeof spawn>[] = [];

function runScript(script: 'preflight.ps1' | 'diagnostics.ps1' | 'start-mozare.ps1', args: string[], options: { env?: NodeJS.ProcessEnv; timeout?: number } = {}) {
  return spawnSync(POWERSHELL, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(ROOT, 'scripts', script), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: options.timeout ?? 90_000,
    env: options.env,
  });
}

function parseJson(raw: string): JsonRecord {
  const start = raw.indexOf('{');
  expect(start).toBeGreaterThanOrEqual(0);
  return JSON.parse(raw.slice(start)) as JsonRecord;
}

function makeTempRoot(withPackage: boolean, withNodeModules: boolean, withCanonical: boolean): string {
  const root = mkdtempSync(join(tmpdir(), 'mozare-launch-'));
  tempRoots.push(root);
  if (withPackage) {
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'synthetic', engines: { node: '>=22 <26' } }), 'utf8');
  }
  if (withNodeModules) {
    mkdirSync(join(root, 'node_modules'), { recursive: true });
    writeFileSync(join(root, 'node_modules', '.package-lock.json'), '{}', 'utf8');
  }
  if (withCanonical) {
    mkdirSync(join(root, 'seed', 'example-project'), { recursive: true });
    writeFileSync(join(root, 'seed', 'example-project', 'PROJECT.md'), '# Synthetic canonical project\n', 'utf8');
  }
  return root;
}

afterAll(() => {
  for (const child of children.splice(0)) {
    if (child.pid && !child.killed) {
      try {
        child.kill();
      } catch {
        // already gone
      }
    }
  }
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('TASK-P09-01 preflight: required runtime is blocking, optional capability is advisory', () => {
  it('preflight passes on the real repository and observes the machine truthfully', { timeout: 120_000 }, () => {
    const result = runScript('preflight.ps1', ['-Json']);
    expect(result.status, result.stdout + result.stderr).toBe(0);
    const body = parseJson(result.stdout) as {
      ok: boolean;
      blocking: string[];
      node: { present: boolean; major: number; ok: boolean };
      npm: { present: boolean };
      node_modules: { present: boolean };
      canonical: { present: boolean; project_md: string };
      capabilities: Record<string, boolean>;
      advisories: string[];
    };
    expect(body.ok).toBe(true);
    expect(body.blocking).toEqual([]);
    expect(body.node.present).toBe(true);
    expect(body.node.major).toBeGreaterThanOrEqual(22);
    expect(body.node.ok).toBe(true);
    expect(body.npm.present).toBe(true);
    expect(body.node_modules.present).toBe(true);
    expect(body.canonical.present).toBe(true);
    // TEST-017 (ORACLE-023): optional capability report is truthful per machine.
    expect(typeof body.capabilities.qmd).toBe('boolean');
    expect(typeof body.capabilities.claude).toBe('boolean');
    expect(typeof body.capabilities.codex).toBe('boolean');
    expect(typeof body.capabilities.hermes).toBe('boolean');
    expect(Array.isArray(body.advisories)).toBe(true);
  });

  it('a root without runtime or canonical records blocks with a repair route', { timeout: 120_000 }, () => {
    const root = makeTempRoot(false, false, false);
    const result = runScript('preflight.ps1', ['-Json', '-Root', root]);
    expect(result.status).toBe(1);
    const body = parseJson(result.stdout) as { ok: boolean; blocking: string[]; repair: string[] };
    expect(body.ok).toBe(false);
    expect(body.blocking.join(' ')).toContain('node');
    expect(body.blocking.join(' ')).toContain('node_modules');
    expect(body.blocking.join(' ')).toContain('package.json');
    expect(body.blocking.join(' ')).toContain('canonical');
    expect(body.repair.length).toBeGreaterThan(0);
  });

  it('required-tool absence blocks while all-optional absence stays advisory (TEST-017 path)', { timeout: 120_000 }, () => {
    const result = runScript('preflight.ps1', ['-Json'], {
      env: { ...process.env, PATH: 'C:\\Windows\\System32' },
    });
    expect(result.status).toBe(1);
    const body = parseJson(result.stdout) as { blocking: string[]; capabilities: Record<string, boolean>; advisories: string[] };
    const blockingText = body.blocking.join(' ');
    for (const required of ['node', 'npm', 'git']) {
      expect(blockingText).toContain(required);
    }
    // Optional adapters are all unavailable on this stripped environment and
    // must be reported truthfully without becoming blockers (ORACLE-023).
    for (const optional of ['qmd', 'claude', 'codex', 'hermes']) {
      expect(body.capabilities[optional]).toBe(false);
      expect(blockingText).not.toContain(`optional:${optional}`);
    }
    expect(body.advisories.length).toBeGreaterThan(0);
  });

  it('start-mozare.ps1 -CheckOnly defers to preflight and exits 0 on the real repository', { timeout: 120_000 }, () => {
    const result = runScript('start-mozare.ps1', ['-CheckOnly']);
    expect(result.status, result.stdout + result.stderr).toBe(0);
  });
});

describe('TASK-P09-01 diagnostics: recovery reporting distinguishes canonical truth from derived cache', () => {
  it('missing canonical records is blocking with a repair route (ORACLE-001 negative branch)', { timeout: 120_000 }, () => {
    const root = makeTempRoot(true, true, false);
    const result = runScript('diagnostics.ps1', ['-Json', '-Root', root]);
    expect(result.status).toBe(1);
    const body = parseJson(result.stdout) as { ok: boolean; blocking: string[]; recovery: string[] };
    expect(body.ok).toBe(false);
    expect(body.blocking.join(' ')).toContain('canonical');
    expect(body.recovery.join(' ')).toMatch(/canonical|restore|re-clone/i);
  });

  it('deleted derived cache is non-blocking and reported as rebuildable from canonical records (SCN-LOC-01)', { timeout: 120_000 }, () => {
    const root = makeTempRoot(true, true, true);
    const result = runScript('diagnostics.ps1', ['-Json', '-Root', root]);
    expect(result.status, result.stdout + result.stderr).toBe(0);
    const body = parseJson(result.stdout) as {
      ok: boolean;
      blocking: string[];
      derived_cache: { present: boolean; reconstructable: boolean };
      canonical: { present: boolean };
      recovery: string[];
    };
    expect(body.ok).toBe(true);
    expect(body.blocking).toEqual([]);
    expect(body.canonical.present).toBe(true);
    expect(body.derived_cache.present).toBe(false);
    expect(body.derived_cache.reconstructable).toBe(true);
    expect(body.recovery.join(' ')).toMatch(/rebuild|reconstruct/i);
  });

  it('diagnostics observe the real repository: git head, canonical seed, qmd capability (TEST-017 observed)', { timeout: 120_000 }, () => {
    const expectedHead = spawnSync('git', ['-C', ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
    const result = runScript('diagnostics.ps1', ['-Json']);
    expect(result.status, result.stdout + result.stderr).toBe(0);
    const body = parseJson(result.stdout) as {
      head: string | null;
      canonical: { present: boolean };
      capabilities: Record<string, boolean>;
      server: { health: string };
    };
    expect(body.head).toBe(expectedHead);
    expect(body.canonical.present).toBe(true);
    expect(body.capabilities.qmd).toBe(true);
    // Server not started by diagnostics itself: unreachable must be a
    // truthful non-blocking status (SCN-LOC-02 style degradation).
    expect(body.server.health).toBe('unreachable');
  });
});

describe('TEST-013 (ORACLE-019): the application server binds loopback only', () => {
  it('started server answers health on 127.0.0.1 and owns no non-loopback listener', { timeout: 180_000 }, async () => {
    const tsxCli = join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
    expect(existsSync(tsxCli)).toBe(true);
    const freePort = await new Promise<number>((resolve, reject) => {
      const probe = net.createServer();
      probe.once('error', reject);
      probe.listen(0, '127.0.0.1', () => {
        const address = probe.address() as AddressInfo;
        probe.close(() => resolve(address.port));
      });
    });
    const child = spawn('node', [tsxCli, join(ROOT, 'src', 'server', 'index.ts')], {
      cwd: ROOT,
      env: { ...process.env, MOZARE_PORT: String(freePort) },
      stdio: 'ignore',
    });
    children.push(child);
    expect(child.pid).toBeDefined();

    // tsx relays execution through a descendant node process, so the listener can
    // be owned by a PID other than the spawned one. Attribute sockets to the whole
    // observed process tree (TEST-013 inspects the real server).
    const processTreePids = (rootPid: number): number[] => {
      const query = spawnSync(
        POWERSHELL,
        [
          '-NoProfile',
          '-Command',
          `$ids=@(${rootPid}); for($i=0; $i -lt $ids.Count; $i++) { Get-CimInstance Win32_Process -Filter "ParentProcessId=$($ids[$i])" | ForEach-Object { $ids += $_.ProcessId } }; $ids -join ' '`,
        ],
        { encoding: 'utf8', timeout: 30_000 },
      );
      return query.stdout
        .trim()
        .split(/\s+/)
        .map(Number)
        .filter((pid) => Number.isFinite(pid) && pid > 0);
    };

    const listenersFor = (pids: number[]): { address: string; port: number }[] => {
      const netstat = spawnSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8', timeout: 30_000 });
      const rows: { address: string; port: number }[] = [];
      const pidSet = new Set(pids);
      for (const line of netstat.stdout.split(/\r?\n/)) {
        if (!line.includes('LISTENING')) continue;
        const columns = line.trim().split(/\s+/);
        const local = columns[1] ?? '';
        const owner = Number(columns[columns.length - 1]);
        if (!pidSet.has(owner)) continue;
        const [address, port] = local.split(':');
        rows.push({ address: address ?? '', port: Number(port) });
      }
      return rows;
    };

    let listeners: { address: string; port: number }[] = [];
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (!existsSync(join(ROOT, 'node_modules'))) break;
      listeners = listenersFor(processTreePids(child.pid!));
      if (listeners.length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    expect(listeners.length).toBeGreaterThan(0);
    const port = listeners[0]!.port;

    let healthStatus = 0;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/health`);
        healthStatus = response.status;
        if (healthStatus === 200) break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    expect(healthStatus).toBe(200);

    // Authoritative socket inspection: every listener owned by the server is
    // loopback-only (TEST-013 pass condition).
    const pids = processTreePids(child.pid!);
    const inspect = spawnSync(
      POWERSHELL,
      [
        '-NoProfile',
        '-Command',
        `$owned=@(${pids.join(',')}); Get-NetTCPConnection -State Listen | Where-Object { $owned -contains $_.OwningProcess } | ForEach-Object { $_.LocalAddress + ':' + $_.LocalPort }`,
      ],
      { encoding: 'utf8', timeout: 30_000 },
    );
    const owned = inspect.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    expect(owned.length).toBeGreaterThan(0);
    for (const entry of owned) {
      expect(entry.startsWith('127.0.0.1:')).toBe(true);
    }
    // netstat cross-check agrees: no 0.0.0.0 or [::] binding for the server.
    for (const listener of listeners) {
      expect(['0.0.0.0', '::', '[::]']).not.toContain(listener.address);
      expect(listener.address).toBe('127.0.0.1');
    }

    child.kill();
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => resolve(), 5_000);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    // Tree-kill the whole tsx relay chain so no descendant outlives the test.
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { timeout: 15_000 });
  });

  it('vite dev server is pinned to loopback by configuration (web surface of the same guarantee)', () => {
    const viteConfig = readFileSync(fileURLToPath(new URL('../../vite.config.ts', import.meta.url)), 'utf8');
    expect(viteConfig).toContain("host: '127.0.0.1'");
  });
});
