import { execa } from 'execa';

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
};

export type RunningProcess = {
  completion: Promise<ProcessResult>;
  stop: () => boolean;
};

/** Runs a fixed executable with a separate argv array; no input is ever parsed by a shell. */
export class ProcessRunner {
  start(command: string, args: string[], cwd: string, options: ProcessOptions = {}): RunningProcess {
    const subprocess = execa(command, args, {
      cwd,
      shell: false,
      reject: false,
      input: options.stdin,
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
      stop: () => subprocess.kill('SIGTERM'),
    };
  }

  async run(command: string, args: string[], cwd: string, options: ProcessOptions = {}): Promise<ProcessResult> {
    return this.start(command, args, cwd, options).completion;
  }
}
