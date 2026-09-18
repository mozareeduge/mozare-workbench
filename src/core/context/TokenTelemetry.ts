import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import type { ContextPack } from '../../shared/contextTypes.js';

/**
 * TokenTelemetry (TASK-P04-05, TEST-MET-01, SCN-MET-01/02, ORACLE-039/040).
 *
 * Privacy bounds are structural, not scan-only:
 * - the stored record shape is the frozen token-metrics contract (schema
 *   validated, additionalProperties: false);
 * - forbidden fields (prompt bodies, hidden reasoning, secrets) are rejected
 *   outright — never silently stored;
 * - every string value is scanned for secret-like material before persist.
 */

export const TOKEN_METRICS_SCHEMA_PATH = join(process.cwd(), 'CONTEXT', 'token-metrics.schema.json');

export class TelemetryPrivacyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TelemetryPrivacyError';
  }
}

/** Binding shape of CONTEXT/token-metrics.schema.json. */
export type TokenMetricsRecord = {
  run_id: string;
  route: string;
  compiled_estimate: number;
  provider_input_tokens?: number | null;
  provider_output_tokens?: number | null;
  cache_hits: number;
  expansions: number;
  duplicate_ratio: number;
  task_result?: string | null;
  qa_verdict?: string | null;
};

/** Fields that may never appear in stored metrics. Exact key matches. */
const FORBIDDEN_KEYS = new Set([
  'prompt_body',
  'prompt',
  'messages',
  'hidden_reasoning',
  'reasoning',
  'chain_of_thought',
  'api_key',
  'apikey',
  'secret',
  'password',
  'authorization',
  'cookie',
]);

/** Secret-like value signatures (API-key shapes and explicit redaction markers). */
const SECRET_VALUE_PATTERNS: RegExp[] = [/\u00abredacted:/, /\bsk-[A-Za-z0-9]{3,}/];

export type EfficiencyCase = {
  tokens: number;
  critical_outcome: string;
  unresolved_expansions: number;
  failed_tasks: number;
};

/**
 * Efficiency quality gate (TEST-MET-02, SCN-MET-02, ORACLE-040): lower tokens
 * alone is never an optimization. Any quality regression classifies the
 * policy as a regression regardless of token savings. Only an explicit
 * `pass` counts as a passing critical outcome.
 */
export function classifyEfficiency(baseline: EfficiencyCase, candidate: EfficiencyCase): 'optimization' | 'regression' | 'no_gain' {
  const outcomeRegressed =
    (baseline.critical_outcome === 'pass' && candidate.critical_outcome !== 'pass') ||
    candidate.unresolved_expansions > baseline.unresolved_expansions ||
    candidate.failed_tasks > baseline.failed_tasks;
  if (outcomeRegressed) return 'regression';
  if (candidate.tokens < baseline.tokens) return 'optimization';
  return 'no_gain';
}

export type TokenTelemetryOptions = {
  /** Storage directory (default .mozare/cache/telemetry under cwd). */
  dir?: string;
  /** Schema path override (tests/CI only; default is the binding contract). */
  schemaPath?: string;
};

/** Derive privacy-bounded metrics directly from a compiled pack build. */
export function telemetryFromPack(
  run_id: string,
  route: string,
  pack: ContextPack,
  extras: Partial<Pick<TokenMetricsRecord, 'provider_input_tokens' | 'provider_output_tokens' | 'cache_hits' | 'expansions' | 'task_result' | 'qa_verdict'>> = {},
): TokenMetricsRecord {
  return {
    run_id,
    route,
    compiled_estimate: pack.budget.estimated_tokens ?? 0,
    provider_input_tokens: extras.provider_input_tokens ?? null,
    provider_output_tokens: extras.provider_output_tokens ?? null,
    cache_hits: extras.cache_hits ?? 0,
    expansions: extras.expansions ?? 0,
    duplicate_ratio: pack.metrics.duplicate_ratio,
    task_result: extras.task_result ?? null,
    qa_verdict: extras.qa_verdict ?? null,
  };
}

function assertNoForbiddenKeys(input: object): void {
  for (const key of Object.keys(input)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      throw new TelemetryPrivacyError(`forbidden telemetry field: ${key}`);
    }
  }
}

function assertNoSecretValues(input: object): void {
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      for (const pattern of SECRET_VALUE_PATTERNS) {
        if (pattern.test(value)) {
          throw new TelemetryPrivacyError(`secret-like value detected in field: ${key}`);
        }
      }
    }
  }
}

function safeRunId(run_id: string): string {
  const safe = run_id.replace(/[^A-Za-z0-9._-]/g, '_');
  return safe.length > 0 ? safe : 'unnamed-run';
}

export class TokenTelemetry {
  private readonly dir: string;
  private readonly validate: (instance: unknown) => boolean;
  private readonly errorsText: (errors: unknown) => string;

  constructor(options: TokenTelemetryOptions = {}) {
    this.dir = options.dir ?? join(process.cwd(), '.mozare', 'cache', 'telemetry');
    const schema = JSON.parse(readFileSync(options.schemaPath ?? TOKEN_METRICS_SCHEMA_PATH, 'utf8')) as object;
    const ajv = new Ajv({ strict: false, allErrors: true });
    let lastErrors: unknown = null;
    const validate = ajv.compile(schema);
    this.validate = (instance) => {
      const ok = validate(instance);
      lastErrors = validate.errors;
      return ok;
    };
    this.errorsText = () => ajv.errorsText((lastErrors ?? []) as never);
  }

  /** Record one run's metrics: privacy gate → schema gate → persist. Returns the frozen record. */
  record(input: TokenMetricsRecord): TokenMetricsRecord {
    assertNoForbiddenKeys(input as unknown as object);
    assertNoSecretValues(input as unknown as object);

    const record: TokenMetricsRecord = {
      run_id: input.run_id,
      route: input.route,
      compiled_estimate: input.compiled_estimate,
      provider_input_tokens: input.provider_input_tokens ?? null,
      provider_output_tokens: input.provider_output_tokens ?? null,
      cache_hits: input.cache_hits,
      expansions: input.expansions,
      duplicate_ratio: input.duplicate_ratio,
      task_result: input.task_result ?? null,
      qa_verdict: input.qa_verdict ?? null,
    };
    if (!this.validate(record)) {
      throw new Error(`schema-invalid token metrics: ${this.errorsText('')}`);
    }

    mkdirSync(this.dir, { recursive: true });
    writeFileSync(join(this.dir, `${safeRunId(record.run_id)}.json`), JSON.stringify(record, null, 2), 'utf8');
    return record;
  }

  /** Persisted metric file names. */
  list(): string[] {
    try {
      return readdirSync(this.dir).filter((f) => f.endsWith('.json')).sort();
    } catch {
      return [];
    }
  }

  get(run_id: string): TokenMetricsRecord | null {
    try {
      const raw = readFileSync(join(this.dir, `${safeRunId(run_id)}.json`), 'utf8');
      return JSON.parse(raw) as TokenMetricsRecord;
    } catch {
      return null;
    }
  }
}
