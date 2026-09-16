import { execa } from 'execa';

export type ProcessResult = {
  command: string;
  args: string[];
  cwd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
};

/** Runs a fixed executable with a separate argv array; no input is ever parsed by a shell. */
export class ProcessRunner {
  async run(command: string, args: string[], cwd: string): Promise<ProcessResult> {
    const result = await execa(command, args, { cwd, shell: false, reject: false });
    return {
      command,
      args: [...args],
      cwd,
      exitCode: result.exitCode ?? 1,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }
}
