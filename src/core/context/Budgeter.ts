import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

/**
 * Budget accounting for compiled context packets (TASK-P04-03).
 * Policy source of truth: CONTEXT/context-policy.yaml (binding contract).
 */
export type BudgetTier = {
  target_tokens: number;
  hard_tokens: number;
};

export type ContextPolicy = {
  budgets: Record<string, BudgetTier>;
  quality: {
    max_duplicate_context_ratio: number;
    truncate_required_material: boolean;
    guess_when_insufficient: boolean;
  };
};

export const CONTEXT_POLICY_PATH = join(process.cwd(), 'CONTEXT', 'context-policy.yaml');

export function loadContextPolicy(path: string = CONTEXT_POLICY_PATH): ContextPolicy {
  return YAML.parse(readFileSync(path, 'utf8')) as ContextPolicy;
}

export class BudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}
