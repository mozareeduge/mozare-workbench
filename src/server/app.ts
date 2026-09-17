import Fastify from 'fastify';
import Ajv2020 from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ContextCompiler, ContextExpansionError } from '../core/context/ContextCompiler.js';
import { BudgetExceededError } from '../core/context/Budgeter.js';
import { CapsuleStore, createCapsule } from '../core/context/CapsuleStore.js';
import { SnapshotService } from '../core/context/SnapshotService.js';
import { DeltaService } from '../core/context/DeltaService.js';
import {
  CONTEXT_LEVELS,
  CONTEXT_PROFILES,
  type CapsuleFingerprints,
  type ContextPack,
  type ContextPackInput,
  type EvidenceCapsule,
} from '../shared/contextTypes.js';

const compileInputSchema = {
  type: 'object',
  required: ['mission_id', 'profile', 'budget', 'objective', 'items'],
  properties: {
    mission_id: { type: 'string', minLength: 1 },
    profile: { enum: [...CONTEXT_PROFILES] },
    budget: { type: 'string', minLength: 1 },
    objective: { type: 'string' },
    authority: { type: 'array', items: { type: 'string' } },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['ref', 'level', 'critical', 'text'],
        properties: {
          ref: { type: 'string', minLength: 1 },
          level: { enum: [...CONTEXT_LEVELS] },
          critical: { type: 'boolean' },
          text: { type: 'string' },
        },
      },
    },
    expansion_handles: { type: 'array', items: { type: 'string' } },
  },
} as const;

const expandInputSchema = {
  type: 'object',
  required: ['pack', 'ref', 'record'],
  properties: {
    pack: { type: 'object' },
    ref: { type: 'string', minLength: 1 },
    record: {
      type: 'object',
      required: ['ref', 'level', 'critical', 'text'],
      properties: {
        ref: { type: 'string', minLength: 1 },
        level: { enum: [...CONTEXT_LEVELS] },
        critical: { type: 'boolean' },
        text: { type: 'string' },
      },
    },
  },
} as const;

const capsuleCheckInputSchema = {
  type: 'object',
  required: ['observed'],
  properties: {
    capsule: { type: ['object', 'null'] },
    source_id: { type: 'string', minLength: 1 },
    observed: {
      type: 'object',
      required: ['source_sha256', 'parser_contract', 'authority_metadata_hash', 'schema_contract'],
      properties: {
        source_sha256: { type: 'string', minLength: 1 },
        parser_contract: { type: 'string', minLength: 1 },
        authority_metadata_hash: { type: 'string', minLength: 1 },
        schema_contract: { type: 'string', minLength: 1 },
      },
      additionalProperties: false,
    },
    triggers: { type: 'array', items: { type: 'string', minLength: 1 } },
  },
  additionalProperties: false,
} as const;

const snapshotInputSchema = {
  type: 'object',
  required: ['project_id', 'authority_snapshot', 'fingerprints'],
  properties: {
    project_id: { type: 'string', minLength: 1 },
    authority_snapshot: { type: 'string', minLength: 1 },
    fingerprints: {
      type: 'object',
      minProperties: 1,
      additionalProperties: { type: 'string', minLength: 1 },
    },
  },
  additionalProperties: false,
} as const;

const deltaInputSchema = {
  type: 'object',
  required: ['from_snapshot', 'to_snapshot'],
  properties: {
    from_snapshot: { type: 'string', minLength: 1 },
    to_snapshot: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

const continuationInputSchema = {
  type: 'object',
  required: ['from_snapshot', 'to_snapshot', 'mission_id'],
  properties: {
    from_snapshot: { type: 'string', minLength: 1 },
    to_snapshot: { type: 'string', minLength: 1 },
    mission_id: { type: 'string', minLength: 1 },
    unresolved: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
} as const;

export function buildApp(options: { contextCacheDir?: string } = {}) {
  const app = Fastify({ logger: false });
  const compiler = new ContextCompiler();

  const cacheRoot = options.contextCacheDir ?? join(process.cwd(), '.mozare', 'cache', 'context');
  const capsules = new CapsuleStore(join(cacheRoot, 'capsules'));
  const snapshots = new SnapshotService(join(cacheRoot, 'snapshots'));
  const deltas = new DeltaService(join(cacheRoot, 'deltas'));

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validateCompileInput = ajv.compile(compileInputSchema);
  const validateExpandInput = ajv.compile(expandInputSchema);
  const validateCapsuleCheck = ajv.compile(capsuleCheckInputSchema);
  const validateSnapshotInput = ajv.compile(snapshotInputSchema);
  const validateDeltaInput = ajv.compile(deltaInputSchema);
  const validateContinuationInput = ajv.compile(continuationInputSchema);
  // Binding capsule contract: CONTEXT/evidence-capsule.schema.json.
  const validateCapsuleRecord = ajv.compile(
    JSON.parse(readFileSync(join(process.cwd(), 'CONTEXT', 'evidence-capsule.schema.json'), 'utf8')) as object,
  );

  app.get('/api/health', async () => ({ status: 'ok' }));

  /** Compile a mission context packet (no raw prompt concatenation path exists). */
  app.post('/api/context/compile', async (request, reply) => {
    const body = request.body ?? {};
    if (!validateCompileInput(body)) {
      return reply.code(400).send({ error: 'invalid compile input' });
    }
    try {
      const pack = compiler.compile(body as unknown as ContextPackInput);
      return reply.code(200).send({ pack });
    } catch (error) {
      if (error instanceof BudgetExceededError) {
        return reply.code(400).send({ error: error.message });
      }
      throw error;
    }
  });

  /** Expand exactly one allowed handle to a fuller record (targeted, no reload). */
  app.post('/api/context/expand', async (request, reply) => {
    const body = request.body ?? {};
    if (!validateExpandInput(body)) {
      return reply.code(400).send({ error: 'invalid expand input' });
    }
    const { pack, ref, record } = body as { pack: ContextPack; ref: string; record: Parameters<ContextCompiler['expand']>[2] };
    if (typeof pack !== 'object' || pack === null || typeof pack.mission_id !== 'string') {
      return reply.code(400).send({ error: 'invalid pack' });
    }
    try {
      const result = compiler.expand(pack, ref, record);
      return reply.code(200).send({ pack: result.pack, expansion: result.expansion });
    } catch (error) {
      if (error instanceof ContextExpansionError) {
        return reply.code(409).send({ error: error.message });
      }
      throw error;
    }
  });

  /** Route a source judgment: cache hit, reopen, or mandatory first read. */
  app.post('/api/context/capsules/check', async (request, reply) => {
    const body = request.body ?? {};
    if (!validateCapsuleCheck(body)) {
      return reply.code(400).send({ error: 'invalid capsule check input' });
    }
    const { capsule, source_id, observed, triggers } = body as {
      capsule?: EvidenceCapsule | null;
      source_id?: string;
      observed: CapsuleFingerprints;
      triggers?: string[];
    };

    if (!capsule) {
      const decision = capsules.routeNewSource(source_id ?? 'unknown-source');
      return reply.code(200).send({ decision, capsule: null });
    }
    if (!validateCapsuleRecord(capsule)) {
      return reply.code(400).send({ error: 'capsule does not satisfy evidence-capsule.schema.json' });
    }

    const result = capsules.lookup(capsule, observed, { triggers });
    if (result.capsule) {
      capsules.save(createCapsule(result.capsule));
    }
    return reply.code(200).send({ decision: { ...result, capsule: undefined }, capsule: result.capsule });
  });

  /** Record a deterministic context snapshot of project fingerprints. */
  app.post('/api/context/snapshots', async (request, reply) => {
    const body = request.body ?? {};
    if (!validateSnapshotInput(body)) {
      return reply.code(400).send({ error: 'invalid snapshot input' });
    }
    const snapshot = snapshots.createSnapshot(body as Parameters<SnapshotService['createSnapshot']>[0]);
    return reply.code(200).send({ snapshot });
  });

  /** Compute the delta between two stored snapshots (404 on unknown ids). */
  app.post('/api/context/deltas', async (request, reply) => {
    const body = request.body ?? {};
    if (!validateDeltaInput(body)) {
      return reply.code(400).send({ error: 'invalid delta input' });
    }
    const { from_snapshot, to_snapshot } = body as { from_snapshot: string; to_snapshot: string };
    const from = snapshots.get(from_snapshot);
    const to = snapshots.get(to_snapshot);
    if (!from || !to) {
      return reply.code(404).send({ error: `unknown snapshot: ${!from ? from_snapshot : to_snapshot}` });
    }
    return reply.code(200).send({ delta: deltas.computeDelta(from, to) });
  });

  /** Delta-first continuation packet: changed refs + unresolved deps only. */
  app.post('/api/context/continuation', async (request, reply) => {
    const body = request.body ?? {};
    if (!validateContinuationInput(body)) {
      return reply.code(400).send({ error: 'invalid continuation input' });
    }
    const { from_snapshot, to_snapshot, mission_id, unresolved } = body as {
      from_snapshot: string;
      to_snapshot: string;
      mission_id: string;
      unresolved?: string[];
    };
    const from = snapshots.get(from_snapshot);
    const to = snapshots.get(to_snapshot);
    if (!from || !to) {
      return reply.code(404).send({ error: `unknown snapshot: ${!from ? from_snapshot : to_snapshot}` });
    }
    const packet = deltas.buildContinuationPacket(from, to, { mission_id, unresolved });
    return reply.code(200).send({ packet });
  });

  return app;
}
