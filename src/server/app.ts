import Fastify from 'fastify';
import Ajv2020 from 'ajv/dist/2020.js';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ContextCompiler, ContextExpansionError } from '../core/context/ContextCompiler.js';
import { BudgetExceededError } from '../core/context/Budgeter.js';
import { CapsuleStore, createCapsule } from '../core/context/CapsuleStore.js';
import { SnapshotService } from '../core/context/SnapshotService.js';
import { DeltaService } from '../core/context/DeltaService.js';
import { ModelRouter, type RouteDecision } from '../core/context/ModelRouter.js';
import { loadWorkspace } from '../core/workspace.js';
import { TelemetryPrivacyError, TokenTelemetry, telemetryFromPack, type TokenMetricsRecord } from '../core/context/TokenTelemetry.js';
import {
  CONTEXT_LEVELS,
  CONTEXT_PROFILES,
  type CapsuleFingerprints,
  type ContextPack,
  type ContextPackInput,
  type EvidenceCapsule,
} from '../shared/contextTypes.js';
import {
  EvidenceCaptureStore,
  QmdAdapter,
  WikiReadAdapter,
  searchLocalProject,
  type EvidenceHit,
} from './adapters/EvidenceService.js';
import { ProcessRunner } from './process/ProcessRunner.js';
import { FolderSelectionTokens, WorkspaceRegistry } from './workspaces/WorkspaceRegistry.js';
import { WorkLedger } from '../core/continuity/WorkLedger.js';
import { realHarnessAdapters, type HarnessAdapter, type RealHarnessId } from './agents/HarnessAdapter.js';
import { MissionService, MissionUnavailableError } from './missions/MissionService.js';
import { ProposalConflictError, ProposalStore } from './missions/ProposalStore.js';
import { SnapshotLimitError } from './missions/ProjectSnapshot.js';

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
    route_role: { type: 'string', minLength: 1 },
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

export type EvidenceAdapterOptions = {
  wikiRoot: string | null;
  qmdCommand: readonly string[] | null;
};

export type AppOptions = {
  contextCacheDir?: string;
  telemetryDir?: string;
  evidence?: Partial<EvidenceAdapterOptions>;
  workspaceRegistry?: WorkspaceRegistry;
  workspaceRegistryFile?: string;
  folderPicker?: () => Promise<string | null>;
  workLedger?: WorkLedger;
  harnessAdapters?: Record<RealHarnessId, HarnessAdapter>;
  runtimeDir?: string;
};

async function defaultFolderPicker(): Promise<string | null> {
  if (process.platform !== 'win32') throw new Error('Native folder selection is not available on this platform');
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$dialog = New-Object System.Windows.Forms.FolderBrowserDialog',
    "$dialog.Description = 'Select a Mozare workspace folder'",
    'if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($dialog.SelectedPath) }',
  ].join('; ');
  const result = await new ProcessRunner().run(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-STA', '-Command', script],
    process.cwd(),
  );
  if (result.exitCode !== 0) throw new Error('Native folder selection failed');
  return result.stdout.trim() || null;
}

function defaultEvidenceOptions(): EvidenceAdapterOptions {
  // No external evidence source ships configured: the surface degrades
  // truthfully and the local project remains fully usable (SCN-EVD-04).
  return { wikiRoot: null, qmdCommand: null };
}

export function buildApp(
  options: AppOptions = {},
) {
  const app = Fastify({ logger: false });
  const compiler = new ContextCompiler();

  const evidenceOptions: EvidenceAdapterOptions = { ...defaultEvidenceOptions(), ...options.evidence };

  const cacheRoot = options.contextCacheDir ?? join(process.cwd(), '.mozare', 'cache', 'context');
  const capsules = new CapsuleStore(join(cacheRoot, 'capsules'));
  const snapshots = new SnapshotService(join(cacheRoot, 'snapshots'));
  const deltas = new DeltaService(join(cacheRoot, 'deltas'));
  const telemetry = new TokenTelemetry(
    options.telemetryDir ? { dir: options.telemetryDir } : {},
  );
  // Workbench ships with no configured providers: routing decisions report
  // graceful unavailability instead of failing (SCN-TOK-03).
  const router = new ModelRouter({ providers: {} });

  // External evidence adapters (TASK-P07-01): read-only wiki/QMD with the
  // local project as the always-present baseline; capture stages candidates
  // only (ORACLE-015).
  const wikiAdapter = new WikiReadAdapter(evidenceOptions.wikiRoot);
  const qmdAdapter = new QmdAdapter(evidenceOptions.qmdCommand);
  const captureStore = new EvidenceCaptureStore();
  const workLedger = options.workLedger ?? new WorkLedger(process.env.MWB_WORK_LEDGER_DIR ?? join(process.cwd(), '.mozare', 'runtime', 'work-ledger'));
  const workspaceRegistry = options.workspaceRegistry ?? new WorkspaceRegistry(
    options.workspaceRegistryFile ?? process.env.MWB_WORKSPACE_REGISTRY_FILE ?? join(process.cwd(), '.mozare', 'runtime', 'workspaces.json'),
    workLedger,
  );
  const runtimeDir = options.runtimeDir ?? process.env.MWB_RUNTIME_DIR ?? join(process.cwd(), '.mozare', 'runtime');
  const proposalStore = new ProposalStore(join(runtimeDir, 'proposals'));
  const missions = new MissionService(options.harnessAdapters ?? realHarnessAdapters(), workLedger, proposalStore, runtimeDir);
  const missionContext = (workspaceId: string) => {
    const root = workspaceRegistry.rootFor(workspaceId);
    if (!root) return null;
    const projection = workspaceRegistry.projection(workspaceId) as { focus?: { projectId?: string } | null };
    return { workspaceId, projectRoot: root, projectId: projection.focus?.projectId ?? workspaceId };
  };
  const folderTokens = new FolderSelectionTokens();
  const pickFolder = options.folderPicker ?? defaultFolderPicker;

  const resolveWorkspaceRoot = (raw: unknown): { id: string; root: string } | null => {
    if (typeof raw !== 'string' || raw.trim() === '') return null;
    const registeredRoot = workspaceRegistry.rootFor(raw);
    if (registeredRoot && existsSync(registeredRoot) && statSync(registeredRoot).isDirectory()) {
      return { id: raw, root: registeredRoot };
    }
    return null;
  };

  const degradedSources = (wikiCaps: { available: boolean }, qmdCaps: { available: boolean }): string[] => {
    const degraded: string[] = [];
    if (!wikiCaps.available) degraded.push('mozare-wiki');
    if (!qmdCaps.available) degraded.push('qmd');
    return degraded;
  };

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

  app.get('/api/workspaces', async () => ({ workspaces: workspaceRegistry.list() }));

  app.post('/api/system/pick-folder', async (_request, reply) => {
    try {
      const selected = await pickFolder();
      if (!selected) return reply.code(409).send({ error: 'selection_cancelled' });
      return folderTokens.issue(selected);
    } catch (error) {
      return reply.code(503).send({ error: 'folder_picker_unavailable', message: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/workspaces/register', async (request, reply) => {
    const body = request.body as { selectionToken?: unknown } | null;
    if (typeof body?.selectionToken !== 'string') return reply.code(400).send({ error: 'selection_token_required' });
    try {
      return { workspace: workspaceRegistry.register(folderTokens.consume(body.selectionToken)) };
    } catch {
      return reply.code(400).send({ error: 'registration_rejected', message: 'The selected folder could not be registered' });
    }
  });

  app.post('/api/workspaces/create', async (request, reply) => {
    const body = request.body as { parentSelectionToken?: unknown; name?: unknown; kind?: unknown; currentObjective?: unknown } | null;
    if (typeof body?.parentSelectionToken !== 'string' || typeof body?.name !== 'string' || typeof body?.kind !== 'string' || typeof body?.currentObjective !== 'string') {
      return reply.code(400).send({ error: 'parent_selection_name_kind_and_objective_required' });
    }
    try {
      return { workspace: workspaceRegistry.create(folderTokens.consume(body.parentSelectionToken), body.name, body.kind, body.currentObjective) };
    } catch {
      return reply.code(400).send({ error: 'creation_rejected', message: 'The project could not be created at the selected location' });
    }
  });

  app.post('/api/workspaces/:workspaceId/activate', async (request, reply) => {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      return { workspace: workspaceRegistry.activate(workspaceId) };
    } catch {
      return reply.code(404).send({ error: 'unknown_workspace', message: 'The workspace is not registered' });
    }
  });

  app.get('/api/workspaces/:workspaceId/projection', async (request, reply) => {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const projection = workspaceRegistry.projection(workspaceId) as { focus?: { humanReviewNeed: { count: number; status: string } } | null };
      const pending = proposalStore.list(workspaceId).filter((proposal) => !proposalStore.latestDecision(workspaceId, proposal.id)).length;
      if (projection.focus && pending > 0) {
        const count = projection.focus.humanReviewNeed.count + pending;
        projection.focus.humanReviewNeed = { count, status: 'needs_review' };
      }
      return projection;
    } catch {
      return reply.code(404).send({ error: 'projection_unavailable', message: 'The workspace projection is unavailable' });
    }
  });

  app.get('/api/workspaces/:workspaceId/continuity', async (request, reply) => {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const projection = workspaceRegistry.projection(workspaceId) as { focus?: { projectId?: string } | null; continuity?: unknown };
      const projectId = projection.focus?.projectId;
      if (!projectId) return { summary: null, records: [] };
      return { summary: projection.continuity ?? null, records: workLedger.records({ projectId }) };
    } catch {
      return reply.code(404).send({ error: 'continuity_unavailable', message: 'Continuity history is unavailable' });
    }
  });

  app.get('/api/workspaces/:workspaceId/missions/capabilities', async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    if (!missionContext(workspaceId)) return reply.code(404).send({ error: 'unknown_workspace', message: 'The workspace is not registered' });
    const capabilities = await missions.capabilities();
    return { agents: capabilities.map(({ harness, level, version, reason }) => ({ id: harness, level, version, reason })) };
  });

  app.post('/api/workspaces/:workspaceId/missions', async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const context = missionContext(workspaceId);
    if (!context) return reply.code(404).send({ error: 'unknown_workspace', message: 'The workspace is not registered' });
    const body = (request.body ?? {}) as Record<string, unknown>;
    const text = (value: unknown) => (typeof value === 'string' ? value : '');
    try {
      const receipt = await missions.start(context, {
        harness: text(body.harness) as RealHarnessId,
        target: text(body.target),
        outcome: text(body.outcome),
        acceptance: Array.isArray(body.acceptance) ? body.acceptance.map(text) : [],
        effort: typeof body.effort === 'string' ? body.effort : null,
        continueProposalId: typeof body.continueProposalId === 'string' ? body.continueProposalId : null,
      });
      return reply.code(202).send({ mission: receipt });
    } catch (error) {
      if (error instanceof MissionUnavailableError || error instanceof SnapshotLimitError) return reply.code(409).send({ error: 'mission_unavailable', message: error.message });
      return reply.code(500).send({ error: 'mission_failed', message: 'The mission could not be started; the project was not changed.' });
    }
  });

  app.post('/api/workspaces/:workspaceId/missions/:runId/stop', async (request) => {
    const { runId } = request.params as { runId: string };
    return { stopped: missions.stop(runId) };
  });

  app.get('/api/workspaces/:workspaceId/flow', async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const context = missionContext(workspaceId);
    if (!context) return reply.code(404).send({ error: 'unknown_workspace', message: 'The workspace is not registered' });
    return { outcomes: missions.flowOutcomes(context) };
  });

  app.get('/api/workspaces/:workspaceId/review', async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const context = missionContext(workspaceId);
    if (!context) return reply.code(404).send({ error: 'unknown_workspace', message: 'The workspace is not registered' });
    return { items: proposalStore.list(workspaceId).map((proposal) => proposalStore.toPublic(proposal, context.projectRoot)) };
  });

  app.post('/api/workspaces/:workspaceId/review/:proposalId/decision', async (request, reply) => {
    const { workspaceId, proposalId } = request.params as { workspaceId: string; proposalId: string };
    const context = missionContext(workspaceId);
    const proposal = context ? proposalStore.get(workspaceId, proposalId) : null;
    if (!context || !proposal) return reply.code(404).send({ error: 'unknown_proposal', message: 'The proposal was not found' });
    const body = (request.body ?? {}) as { state?: string; rationale?: string; revisionNote?: string };
    const states = ['accepted', 'revision_requested', 'rejected', 'preserved_as_residue'] as const;
    const state = states.find((candidate) => candidate === body.state);
    if (!state) return reply.code(400).send({ error: 'invalid_decision', message: 'Unknown decision' });
    try {
      const decision = proposalStore.decide(proposal, context.projectRoot, join(runtimeDir, 'residue', workspaceId), { state, rationale: body.rationale ?? null, revisionNote: body.revisionNote ?? null });
      return { decision: { state: decision.state, decidedAt: decision.decidedAt, written: decision.applied?.written ?? [], movedToResidue: decision.applied?.movedToResidue ?? [] }, item: proposalStore.toPublic(proposal, context.projectRoot) };
    } catch (error) {
      if (error instanceof ProposalConflictError) return reply.code(409).send({ error: error.code, message: error.message });
      return reply.code(500).send({ error: 'decision_failed', message: 'The decision could not be recorded.' });
    }
  });

  /** Unified evidence search: local project + optional wiki/QMD candidates (TASK-P07-01). */
  app.get('/api/evidence/search', async (request, reply) => {
    const query = typeof (request.query as Record<string, unknown>).query === 'string'
      ? ((request.query as Record<string, string>).query as string)
      : '';
    const workspace = resolveWorkspaceRoot((request.query as Record<string, unknown>).workspaceId);
    if (!workspace) {
      return reply.code(400).send({ error: 'unknown_workspace', message: 'workspaceId must be a registered opaque workspace ID' });
    }
    const wikiCaps = wikiAdapter.capabilities();
    const qmdCaps = qmdAdapter.capabilities();
    let wiki: Record<string, unknown>;
    if (wikiCaps.available) {
      wiki = { ...wikiAdapter.search(query) };
    } else {
      wiki = wikiCaps;
    }
    let qmd: Record<string, unknown>;
    if (qmdCaps.available) {
      qmd = { ...(await qmdAdapter.search(query)) };
    } else {
      qmd = qmdCaps;
    }
    const local: EvidenceHit[] = searchLocalProject(workspace.root, query);
    return {
      workspaceId: workspace.id,
      degraded: degradedSources(wikiCaps, qmdCaps),
      local,
      wiki,
      qmd,
    };
  });

  /** Which external evidence adapters exist on this machine. */
  app.get('/api/evidence/capabilities', async () => {
    const wikiCaps = wikiAdapter.capabilities();
    const qmdCaps = qmdAdapter.capabilities();
    return {
      wiki: wikiCaps,
      qmd: qmdCaps,
      degraded: degradedSources(wikiCaps, qmdCaps),
      local_project: { available: true },
    };
  });

  /**
   * Capture stages a candidate evidence reference — pending review, never
   * acceptance; the external source and canonical workspace stay untouched
   * (SCN-EVD-03, SCN-X-08, ORACLE-015).
   */
  app.post('/api/evidence/capture', async (request, reply) => {
    const body = request.body as { workspaceId?: unknown; hit?: unknown; note?: unknown } | null;
    const workspace = resolveWorkspaceRoot(body?.workspaceId);
    if (!workspace) {
      return reply.code(400).send({ error: 'unknown_workspace', message: 'workspaceId must be a registered opaque workspace ID' });
    }
    const hit = body?.hit as EvidenceHit | undefined;
    if (!hit || typeof hit !== 'object' || typeof hit.rel !== 'string' || !hit.route || typeof hit.source !== 'string') {
      return reply.code(400).send({ error: 'invalid_hit', message: 'capture requires a search hit with rel, source and route' });
    }
    try {
      const captured = captureStore.stage(workspace.root, hit, typeof body?.note === 'string' ? body.note : '');
      return { captured };
    } catch (error) {
      return reply.code(400).send({
        error: 'capture_rejected',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /** Staged captures for a workspace — all pending_review by construction. */
  app.get('/api/evidence/captures', async (request, reply) => {
    const workspace = resolveWorkspaceRoot((request.query as Record<string, unknown>).workspaceId);
    if (!workspace) {
      return reply.code(400).send({ error: 'unknown_workspace', message: 'workspaceId must be a registered opaque workspace ID' });
    }
    const snapshot = loadWorkspace(workspace.root);
    return { captures: captureStore.list(snapshot.project.id) };
  });

  /** Resolve a route role to a capability-tier decision (SCN-TOK-02/03). */
  app.post('/api/model/route', async (request, reply) => {
    const body = request.body as { role?: unknown; task?: unknown } | null;
    const role = typeof body?.role === 'string' ? body.role : '';
    const task = typeof body?.task === 'string' ? body.task : '';
    let decision: RouteDecision;
    try {
      decision = router.resolve(role, task);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/unknown route role/i.test(message)) {
        return reply.code(400).send({ error: message });
      }
      throw error;
    }
    return reply.code(200).send({ decision, model_tokens: decision.model_tokens });
  });

  /** Record privacy-bounded token metrics for one run (TEST-MET-01). */
  app.post('/api/telemetry/metrics', async (request, reply) => {
    const body = request.body as Record<string, unknown> | null;
    let record: TokenMetricsRecord;
    try {
      record = telemetry.record(body as never);
    } catch (error) {
      if (error instanceof TelemetryPrivacyError) {
        return reply.code(422).send({ error: error.message });
      }
      const message = error instanceof Error ? error.message : String(error);
      if (/schema-invalid/i.test(message)) {
        return reply.code(422).send({ error: message });
      }
      throw error;
    }
    return reply.code(200).send({ record });
  });

  /** Serve one recorded metric by run id. */
  app.get('/api/telemetry/metrics/:run_id', async (request, reply) => {
    const { run_id } = request.params as { run_id: string };
    const record = telemetry.get(run_id);
    if (!record) {
      return reply.code(404).send({ error: `unknown run: ${run_id}` });
    }
    return reply.code(200).send({ record });
  });

  /** List all recorded metrics. */
  app.get('/api/telemetry/metrics', async () => {
    const records = telemetry
      .list()
      .map((file) => telemetry.get(file.replace(/\.json$/, '')))
      .filter((r): r is TokenMetricsRecord => r !== null);
    return { records };
  });

  /** Compile a mission context packet (no raw prompt concatenation path exists). */
  app.post('/api/context/compile', async (request, reply) => {
    const body = request.body ?? {};
    if (!validateCompileInput(body)) {
      return reply.code(400).send({ error: 'invalid compile input' });
    }
    try {
      const pack = compiler.compile(body as unknown as ContextPackInput);
      const routeRole = (body as { route_role?: string }).route_role;
      if (routeRole) {
        let decision: RouteDecision;
        try {
          decision = router.resolve(routeRole, (body as { objective?: string }).objective ?? '');
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (/unknown route role/i.test(message)) {
            return reply.code(400).send({ error: message });
          }
          throw error;
        }
        const route = decision.tier === 'NONE' ? 'NONE' : decision.tier;
        const metrics = telemetryFromPack(`RUN-${pack.mission_id}`, route, pack, { cache_hits: 0, expansions: 0 });
        telemetry.record(metrics);
        return reply.code(200).send({ pack, route: decision, metrics });
      }
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
