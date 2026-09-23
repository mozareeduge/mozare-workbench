import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { WorkspaceRegistry } from '../../src/server/workspaces/WorkspaceRegistry.js';

export default async function setup() {
  const registryFile = join(process.cwd(), '.mozare', 'runtime', 'workspaces.json');
  const prior = existsSync(registryFile) ? readFileSync(registryFile) : null;
  const tempRoot = mkdtempSync(join(tmpdir(), 'mwb-live-e2e-'));
  const alpha = join(tempRoot, 'alpha-live-project');
  const beta = join(tempRoot, 'beta-live-project');
  cpSync(join(process.cwd(), 'seed', 'example-project'), alpha, { recursive: true });
  cpSync(join(process.cwd(), 'seed', 'example-project'), beta, { recursive: true });
  for (const [root, name] of [[alpha, 'Alpha Live Project'], [beta, 'پروژه Beta Live Project ۲']] as const) {
    const projectFile = join(root, 'PROJECT.md');
    writeFileSync(projectFile, readFileSync(projectFile, 'utf8').replace('name: Example Artistic Research Field', `name: ${name}`), 'utf8');
  }
  mkdirSync(dirname(registryFile), { recursive: true });
  if (existsSync(registryFile)) unlinkSync(registryFile);
  const registry = new WorkspaceRegistry(registryFile);
  const first = registry.register(alpha);
  registry.register(beta);
  registry.activate(first.id);

  return async () => {
    rmSync(tempRoot, { recursive: true, force: true });
    if (prior) writeFileSync(registryFile, prior);
    else if (existsSync(registryFile)) unlinkSync(registryFile);
  };
}
