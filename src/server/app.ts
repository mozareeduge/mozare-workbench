import Fastify from 'fastify';
import Ajv2020 from 'ajv/dist/2020.js';
import { ContextCompiler, ContextExpansionError } from '../core/context/ContextCompiler.js';
import { BudgetExceededError } from '../core/context/Budgeter.js';
import {
  CONTEXT_LEVELS,
  CONTEXT_PROFILES,
  type ContextPack,
  type ContextPackInput,
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

export function buildApp() {
  const app = Fastify({ logger: false });
  const compiler = new ContextCompiler();

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validateCompileInput = ajv.compile(compileInputSchema);
  const validateExpandInput = ajv.compile(expandInputSchema);

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

  return app;
}
