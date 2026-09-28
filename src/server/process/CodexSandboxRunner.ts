import { randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { tmpdir } from 'node:os';
import YAML from 'yaml';
import { ProcessRunner, type ProcessOptions, type RunningProcess } from './ProcessRunner.js';

/** Runs non-Codex CLI agents inside Codex's native Windows restricted-token sandbox. */
export class CodexSandboxRunner extends ProcessRunner {
  override readonly workspaceIsolated = true;
  constructor(private readonly raw: ProcessRunner = new ProcessRunner()) { super(); }

  private sandboxEnv(cwd: string, inherited?: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
    const home = join(cwd, '.mozare-run', 'codex-sandbox-home');
    const temporary = join(cwd, '.mozare-run', 'tmp');
    mkdirSync(home, { recursive: true });
    mkdirSync(temporary, { recursive: true });
    // An isolated CODEX_HOME prevents a user's wider Codex profile from adding
    // writable roots. The profile gives read access for CLI auth and tooling,
    // with write access only to this mission's working copy.
    writeFileSync(join(home, 'config.toml'), [
      'default_permissions = "mwb-shell"',
      '[permissions.mwb-shell.filesystem]',
      '":root" = "read"',
      '[permissions.mwb-shell.filesystem.":workspace_roots"]',
      '"." = "write"',
      '[permissions.mwb-shell.network]',
      'enabled = true',
      '',
    ].join('\n'), 'utf8');
    return { ...process.env, ...inherited, CODEX_HOME: home, TMP: temporary, TEMP: temporary, TMPDIR: temporary };
  }

  private sandboxArgs(cwd: string, command: string, args: string[]): string[] {
    return ['sandbox', '-P', 'mwb-shell', '-C', cwd, command, ...args];
  }

  override async isolationReady(): Promise<boolean> {
    if (process.platform !== 'win32' || !process.env.LOCALAPPDATA) return false;
    const parent = join(process.env.LOCALAPPDATA, 'Mozare Workbench', 'isolation-probes');
    mkdirSync(parent, { recursive: true });
    const root = mkdtempSync(join(parent, 'probe-'));
    const inside = join(root, 'inside');
    const outside = join(root, 'outside');
    const tempOutside = join(tmpdir(), `mwb-isolation-${randomUUID()}`);
    try {
      mkdirSync(inside); mkdirSync(outside); mkdirSync(tempOutside);
      const script = join(inside, 'probe.ps1');
      writeFileSync(script, [
        'param([string]$Outside, [string]$TempOutside)',
        "Set-Content -LiteralPath (Join-Path $PSScriptRoot 'inside-proof.txt') -Value 'inside'",
        "try { Set-Content -LiteralPath (Join-Path $Outside 'outside-proof.txt') -Value 'outside' -ErrorAction Stop } catch {}",
        "try { Set-Content -LiteralPath (Join-Path $TempOutside 'outside-proof.txt') -Value 'outside' -ErrorAction Stop } catch {}",
      ].join('\n'), 'utf8');
      const env = this.sandboxEnv(inside);
      const result = await this.raw.run('codex', this.sandboxArgs(inside, 'powershell.exe', ['-NoProfile', '-File', script, outside, tempOutside]), inside, { timeoutMs: 15_000, env });
      return result.exitCode === 0 && existsSync(join(inside, 'inside-proof.txt'))
        && !existsSync(join(outside, 'outside-proof.txt')) && !existsSync(join(tempOutside, 'outside-proof.txt'));
    } catch { return false; }
    finally {
      try { rmSync(root, { recursive: true, force: true }); } catch { /* next probe uses a fresh directory */ }
      try { rmSync(tempOutside, { recursive: true, force: true }); } catch { /* next probe uses a fresh directory */ }
    }
  }

  override start(command: string, args: string[], cwd: string, options: ProcessOptions = {}): RunningProcess {
    if (process.platform !== 'win32') throw new Error('Native isolated shell missions are not configured on this platform');
    let copiedSecrets: string[] = [];
    let env = this.sandboxEnv(cwd, options.env);
    if (command === 'hermes') {
      const source = process.env.HERMES_HOME || join(process.env.LOCALAPPDATA ?? '', 'hermes');
      const home = join(cwd, '.mozare-run', 'hermes-home');
      mkdirSync(home, { recursive: true });
      for (const name of ['.env', 'config.yaml']) {
        const from = join(source, name);
        if (!existsSync(from)) continue;
        const to = join(home, name);
        copyFileSync(from, to);
        copiedSecrets.push(to);
      }
      const configPath = join(home, 'config.yaml');
      const parsed = existsSync(configPath) ? YAML.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown> | null : null;
      const config = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      const approvals = config.approvals && typeof config.approvals === 'object' && !Array.isArray(config.approvals)
        ? config.approvals as Record<string, unknown> : {};
      // Workbench's owner-started mission already authorizes code execution,
      // and the OS runner enforces the writable boundary for child processes.
      writeFileSync(configPath, YAML.stringify({ ...config, approvals: { ...approvals, single_query_mode: 'approve' } }), 'utf8');
      if (!copiedSecrets.includes(configPath)) copiedSecrets.push(configPath);
      const pythonDir = join(cwd, '.mozare-run', 'hermes-python');
      mkdirSync(pythonDir, { recursive: true });
      // Python 3.11 creates tempfile directories with a 0700 ACL that the
      // Windows restricted token cannot reopen. The mission-local temp parent
      // is already private; create descendants with inheritable permissions.
      writeFileSync(join(pythonDir, 'sitecustomize.py'), [
        'import errno, os, sys, tempfile',
        'def _mwb_mkdtemp(suffix=None, prefix=None, dir=None):',
        '    prefix, suffix, dir, output_type = tempfile._sanitize_params(prefix, suffix, dir)',
        '    names = tempfile._get_candidate_names()',
        '    if output_type is bytes: names = map(os.fsencode, names)',
        '    for _ in range(tempfile.TMP_MAX):',
        '        path = os.path.join(dir, prefix + next(names) + suffix)',
        '        sys.audit("tempfile.mkdtemp", path)',
        '        try: os.mkdir(path, 0o777)',
        '        except (FileExistsError, PermissionError): continue',
        '        return path',
        '    raise FileExistsError(errno.EEXIST, "No usable temporary directory name found")',
        'tempfile.mkdtemp = _mwb_mkdtemp',
        '',
      ].join('\n'), 'utf8');
      env = { ...env, HERMES_HOME: home, PYTHONPATH: [pythonDir, env.PYTHONPATH].filter(Boolean).join(delimiter) };
    }
    let running: RunningProcess;
    try {
      running = this.raw.start('codex', this.sandboxArgs(cwd, command, args), cwd, { ...options, env });
    } catch (error) {
      for (const path of copiedSecrets) { try { unlinkSync(path); } catch { /* startup cleanup is best effort */ } }
      throw error;
    }
    return {
      completion: running.completion.finally(() => {
        for (const path of copiedSecrets) { try { unlinkSync(path); } catch { /* recovery removes interrupted copies */ } }
        copiedSecrets = [];
      }),
      stop: running.stop,
    };
  }

  override async run(command: string, args: string[], cwd: string, options: ProcessOptions = {}) {
    // Fixed --version/--help probes never execute model-generated shell commands.
    return this.raw.run(command, args, cwd, options);
  }

  /** Remove credential copies left by a machine shutdown before the runner's cleanup. */
  static cleanInterruptedHome(sandbox: string): void {
    const home = join(sandbox, '.mozare-run', 'hermes-home');
    for (const name of ['.env', 'config.yaml']) {
      const path = join(home, name);
      if (existsSync(path)) {
        try { unlinkSync(path); } catch { /* retry on next recovery */ }
      }
    }
  }
}
