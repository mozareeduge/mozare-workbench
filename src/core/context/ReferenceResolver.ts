import type { ContextItem, ContextProfile } from '../../shared/contextTypes.js';

/**
 * Typed relevance resolution for context items (TASK-P04-03, SCN-CTX-01/06).
 *
 * Rules, in order:
 * - Typed `layer` metadata wins: `layer: 'history'` items are out of scope for
 *   mission packets (unrelated theoretical/history material is absent).
 * - The mission-input fixture convention marks unrelated material explicitly
 *   with a `HISTORY-` ref prefix (the deterministic reference compiler's
 *   "explicit unrelated marker", scripts/context_compiler.py); it is a fixed
 *   namespace marker, not a substring search over text bodies.
 * - When an item carries explicit `profiles`, it only compiles into those
 *   profiles (role-scoped context); otherwise it stays profile-neutral.
 * Excluded refs are returned so the compiler records them in `omitted`
 * instead of dropping them silently.
 */
export type ResolutionResult = {
  kept: ContextItem[];
  omitted: string[];
};

export class ReferenceResolver {
  resolve(items: readonly ContextItem[], profile: ContextProfile): ResolutionResult {
    const kept: ContextItem[] = [];
    const omitted: string[] = [];
    for (const item of items) {
      if (item.layer === 'history' || item.ref.startsWith('HISTORY-')) {
        omitted.push(item.ref);
        continue;
      }
      if (item.profiles !== undefined && !item.profiles.includes(profile)) {
        omitted.push(item.ref);
        continue;
      }
      kept.push(item);
    }
    return { kept, omitted };
  }
}
