import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { APIRequestContext } from '@playwright/test';
import { SEED_DECISION_PREFIX } from './live-seed';

const runtime = join(process.cwd(), '.mozare-runtime', 'e2e');

/** Removes review decisions made by earlier tests, keeping the seeded ones, and re-activates the alpha workspace. */
export async function resetAlpha(request: APIRequestContext): Promise<void> {
  const workspaceId = readFileSync(join(runtime, 'alpha-workspace-id'), 'utf8').trim();
  const proposals = join(runtime, 'proposals', workspaceId);
  if (existsSync(proposals)) {
    for (const entry of readdirSync(proposals).filter((name) => name.endsWith('.decisions'))) {
      for (const decision of readdirSync(join(proposals, entry))) {
        if (!decision.startsWith(SEED_DECISION_PREFIX)) rmSync(join(proposals, entry, decision));
      }
    }
  }
  await request.post(`/api/workspaces/${workspaceId}/activate`);
}
