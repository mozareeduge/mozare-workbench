import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CACHE_DIRECTORY, loadWorkspace, type WorkspaceSnapshot } from '../workspace.js';
import { ProjectionEngine } from '../projection/ProjectionEngine.js';
import type { ProjectProjection } from '../projection/projectionTypes.js';

/**
 * Read-only canonical workspace access and derived projection cache management.
 * It has no canonical write API, so displaying a project cannot mutate project truth.
 */
export class WorkspaceEngine {
  readonly projectionEngine: ProjectionEngine;

  constructor(readonly workspaceRoot: string, projectionEngine = new ProjectionEngine()) {
    this.workspaceRoot = resolve(workspaceRoot);
    this.projectionEngine = projectionEngine;
  }

  load(): WorkspaceSnapshot {
    return loadWorkspace(this.workspaceRoot);
  }

  project(): ProjectProjection {
    const projection = this.projectionEngine.project(this.load());
    const cacheRoot = join(this.workspaceRoot, CACHE_DIRECTORY);
    mkdirSync(cacheRoot, { recursive: true });
    writeFileSync(join(cacheRoot, 'project-projection.json'), `${JSON.stringify(projection, null, 2)}\n`, 'utf8');
    return projection;
  }
}
