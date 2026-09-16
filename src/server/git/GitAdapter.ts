import { realpathSync, statSync } from 'node:fs';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';
import { ProcessRunner } from '../process/ProcessRunner.js';

export type GitRepository = { id: string; root: string };
export type GitStatus = { head: string; branch: string; dirty: boolean; modified: string[]; untracked: string[] };
export type GitDiff = { base: string; diff: string };

const PROTECTED_NAMES = new Set(['.env', '.env.local', '.env.production', '.npmrc', 'credentials', 'id_rsa', 'id_ed25519']);

export class GitPathSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitPathSafetyError';
  }
}

export class GitRepositoryRegistry {
  private readonly repositories = new Map<string, GitRepository>();

  register(root: string): GitRepository {
    const resolvedRoot = realpathSync(root);
    if (!statSync(resolvedRoot).isDirectory()) throw new GitPathSafetyError('A registered repository root must be a directory.');
    const repository = { id: resolvedRoot, root: resolvedRoot };
    this.repositories.set(repository.id, repository);
    return repository;
  }

  get(id: string): GitRepository {
    const repository = this.repositories.get(id);
    if (!repository) throw new GitPathSafetyError('Repository is not registered.');
    return repository;
  }

  resolvePath(repositoryId: string, requestedPath: string): string {
    const { root } = this.get(repositoryId);
    if (!requestedPath || isAbsolute(requestedPath) || requestedPath.split(/[\\/]/).some((part) => part === '..')) {
      throw new GitPathSafetyError('Path must remain below the registered repository root.');
    }
    if (requestedPath.split(/[\\/]/).some((part) => PROTECTED_NAMES.has(part) || part.startsWith('.env.'))) {
      throw new GitPathSafetyError('Protected secret paths cannot enter mission context.');
    }
    const candidate = resolve(root, requestedPath);
    const relativePath = relative(root, candidate);
    if (relativePath === '' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      throw new GitPathSafetyError('Path must identify a file below the registered repository root.');
    }
    try {
      const resolvedCandidate = realpathSync(candidate);
      const resolvedRelative = relative(root, resolvedCandidate);
      if (resolvedRelative.startsWith(`..${sep}`) || isAbsolute(resolvedRelative)) {
        throw new GitPathSafetyError('Resolved symlink escapes the registered repository root.');
      }
    } catch (error) {
      if (error instanceof GitPathSafetyError) throw error;
    }
    return candidate;
  }
}

export class GitAdapter {
  constructor(private readonly registry: GitRepositoryRegistry, private readonly processes = new ProcessRunner()) {}

  async register(root: string): Promise<GitRepository> {
    const repository = this.registry.register(root);
    const result = await this.processes.run('git', ['rev-parse', '--is-inside-work-tree'], repository.root);
    if (result.exitCode !== 0 || result.stdout !== 'true') throw new GitPathSafetyError('Registered path is not a Git worktree.');
    return repository;
  }

  async status(repositoryId: string): Promise<GitStatus> {
    const { root } = this.registry.get(repositoryId);
    const [head, branch, porcelain] = await Promise.all([
      this.requiredGit(root, ['rev-parse', 'HEAD']),
      this.requiredGit(root, ['branch', '--show-current']),
      this.requiredGit(root, ['status', '--porcelain=v1', '-uall']),
    ]);
    const modified: string[] = [];
    const untracked: string[] = [];
    for (const line of porcelain.stdout.split('\n').filter(Boolean)) {
      const path = line.slice(3).split(' -> ').at(-1) ?? '';
      if (line.startsWith('??')) untracked.push(path);
      else modified.push(path);
    }
    return { head: head.stdout, branch: branch.stdout, dirty: modified.length + untracked.length > 0, modified, untracked };
  }

  async diff(repositoryId: string, base = 'HEAD'): Promise<GitDiff> {
    const { root } = this.registry.get(repositoryId);
    const result = await this.requiredGit(root, ['diff', '--no-ext-diff', base, '--']);
    return { base, diff: result.stdout };
  }

  async createWorktree(repositoryId: string, destination: string): Promise<void> {
    const { root } = this.registry.get(repositoryId);
    await this.requiredGit(root, ['worktree', 'add', '--detach', destination, 'HEAD']);
  }

  private async requiredGit(cwd: string, args: string[]) {
    const result = await this.processes.run('git', args, cwd);
    if (result.exitCode !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
    return result;
  }
}
