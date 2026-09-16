import { existsSync } from 'node:fs';
import { GitAdapter } from './GitAdapter.js';

export class DirtyRepositoryError extends Error {
  constructor() {
    super('The registered repository has uncommitted work and is protected from mission worktree creation.');
    this.name = 'DirtyRepositoryError';
  }
}

export class WorktreeManager {
  constructor(private readonly git: GitAdapter) {}

  async create(repositoryId: string, destination: string): Promise<void> {
    const status = await this.git.status(repositoryId);
    if (status.dirty) throw new DirtyRepositoryError();
    if (existsSync(destination)) throw new Error('Worktree destination already exists.');
    await this.git.createWorktree(repositoryId, destination);
  }
}
