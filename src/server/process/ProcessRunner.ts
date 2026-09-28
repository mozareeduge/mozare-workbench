import { execa } from 'execa';
import { execFileSync } from 'node:child_process';

export type ProcessResult = {
  command: string;
  args: string[];
  cwd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
};

export type ProcessOptions = {
  stdin?: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
};

export type RunningProcess = {
  completion: Promise<ProcessResult>;
  stop: () => boolean;
};

/** Runs a fixed executable with a separate argv array; no input is ever parsed by a shell. */
export class ProcessRunner {
  /** A working directory alone is not filesystem isolation. Only an actual
   * restricted runner may override this after proving child writes stay inside cwd. */
  readonly workspaceIsolated: boolean = false;
  async isolationReady(): Promise<boolean> { return this.workspaceIsolated; }
  start(command: string, args: string[], cwd: string, options: ProcessOptions = {}): RunningProcess {
    const subprocess = execa(command, args, {
      cwd,
      shell: false,
      reject: false,
      input: options.stdin,
      env: options.env,
      timeout: options.timeoutMs,
      maxBuffer: 2_000_000,
    });
    return {
      completion: subprocess.then((result) => ({
        command,
        args: [...args],
        cwd,
        exitCode: result.exitCode ?? 1,
        stdout: String(result.stdout ?? ''),
        stderr: String(result.stderr ?? ''),
        timedOut: result.timedOut,
      })),
      stop: () => {
        if (process.platform === 'win32' && subprocess.pid) {
          try { execFileSync('taskkill', ['/PID', String(subprocess.pid), '/T', '/F'], { stdio: 'ignore' }); return true; } catch { /* process may have exited */ }
        }
        return subprocess.kill('SIGTERM');
      },
    };
  }

  async run(command: string, args: string[], cwd: string, options: ProcessOptions = {}): Promise<ProcessResult> {
    return this.start(command, args, cwd, options).completion;
  }
}
