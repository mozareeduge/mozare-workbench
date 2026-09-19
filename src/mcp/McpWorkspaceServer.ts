import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRelationConnectProposal, type RelationConnectProposal } from '../core/proposals/RelationProposal.js';
import { canonicalHash, loadWorkspace } from '../core/workspace.js';
import { isProtectedRelativePath, PathSafetyError, protectedPathCategory, resolveWithin } from './pathSafety.js';

/**
 * Safe stdio MCP read/proposal surface (TASK-P06-01).
 *
 * Authority: the MCP surface is READ AND PROPOSAL ONLY
 * (IMPLEMENTATION_STACK_LOCK.yaml `mcp.authority: read_and_proposal_only`;
 * TECH/SECURITY.md control 8; ORACLE-006). Canonical truth is read through the
 * existing validated loader; the single state route stages a pending proposal
 * that only a human can accept through the existing proposal transaction. The
 * MCP surface structurally cannot accept proposals or write canonical truth:
 *
 * - the tool name list is frozen: no write/accept/shell/delete capability is a
 *   member, and forbidden names are refused whether or not they are known;
 * - `mozare_propose_relation_connect` is the only mutation-shaped action and it
 *   touches NO canonical file — it returns a pending_review proposal;
 * - every path argument crosses resolveWithin() (traversal, symlink and
 *   protected-path exclusion) before any read;
 * - secret-shaped paths are excluded from the searchable index entirely.
 */

export type RegisteredWorkspace = {
  id: string;
  root: string;
};

export type McpToolResult = {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
};

export type ToolCall = {
  name: string;
  arguments?: Record<string, unknown>;
};

export const MCP_TOOL_NAMES = [
  'mozare_read_project',
  'mozare_read_object',
  'mozare_search_workspace',
  'mozare_propose_relation_connect',
] as const;

export const FORBIDDEN_MCP_TOOL_NAMES = [
  'mozare_write_canonical',
  'mozare_accept_proposal',
  'mozare_run_shell',
  'mozare_delete_object',
  'mozare_mkdir',
  'mozare_write_file',
  'mozare_delete_file',
  'mozare_exec',
] as const;

type ScopedFile = {
  absolute: string;
  relative: string;
};

/**
 * Indexes a registered workspace root for search. Secret-shaped paths are
 * excluded at the INDEX level (never listed, never scanned for content), and
 * symlinked entries are not indexed — the read tool re-validates containment
 * per call via resolveWithin(), so indexing only canonical content is the
 * conservative choice.
 */
function indexWorkspaceFiles(root: string): ScopedFile[] {
  const out: ScopedFile[] = [];
  const walk = (dir: string, relative: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // unreadable subtree: skip it, never crash the surface
    }
    for (const entry of entries) {
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
      if (isProtectedRelativePath(childRelative)) continue;
      if (entry.isSymbolicLink()) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, childRelative);
      } else {
        out.push({ absolute: full, relative: childRelative });
      }
    }
  };
  walk(resolve(root), '');
  return out;
}

function textResult(payload: unknown): McpToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

function errorResult(payload: unknown): McpToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], isError: true };
}

/**
 * Security-event and error responses must never echo a hostile argument back
 * into context. All of these keys could carry attacker-controlled strings
 * (object ids, queries, names), so responses are built field-by-field instead
 * of spreading `{ ...args }` into a JSON payload (SCN-ERR-04/05/06).
 */
const SAFE_ERROR_FIELDS = new Set(['workspaceId', 'kind']);

function sanitizedArgsForError(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (SAFE_ERROR_FIELDS.has(key) && (typeof value === 'string' || typeof value === 'number')) {
      out[key] = value;
    }
  }
  return out;
}

function sanitizedError(base: Record<string, unknown>, args: Record<string, unknown>): McpToolResult {
  return errorResult({ ...base, argumentsReceived: sanitizedArgsForError(args) });
}

export class WorkspaceRegistry {
  private readonly workspaces = new Map<string, RegisteredWorkspace>();
  private nextId = 1;

  register(root: string): RegisteredWorkspace {
    const absoluteRoot = resolve(root);
    const id = `ws_${String(this.nextId).padStart(3, '0')}`;
    this.nextId += 1;
    const workspace: RegisteredWorkspace = { id, root: absoluteRoot };
    this.workspaces.set(id, workspace);
    return workspace;
  }

  get(id: string): RegisteredWorkspace {
    const workspace = this.workspaces.get(id);
    if (!workspace) {
      throw new Error(`unknown workspace id: ${id}`);
    }
    return workspace;
  }
}

export class McpWorkspaceServer {
  readonly pendingProposals: RelationConnectProposal[] = [];

  constructor(private readonly registry: WorkspaceRegistry) {}

  handleToolCall(call: ToolCall): McpToolResult {
    const name = call?.name;
    const args = call.arguments ?? {};
    if (typeof name !== 'string' || (MCP_TOOL_NAMES as readonly string[]).includes(name) === false) {
      if (typeof name === 'string' && (FORBIDDEN_MCP_TOOL_NAMES as readonly string[]).includes(name)) {
        return errorResult({
          error: 'not exposed',
          message: 'forbidden capability: the MCP surface is read and proposal only (no write/accept/shell/delete tools)',
        });
      }
      // Unknown tool names are hostile-shaped input: they are refused without
      // being echoed back into context.
      return errorResult({ error: 'unknown tool' });
    }

    try {
      switch (name) {
        case 'mozare_read_project':
          return this.readProject(args);
        case 'mozare_read_object':
          return this.readObject(args);
        case 'mozare_search_workspace':
          return this.searchWorkspace(args);
        case 'mozare_propose_relation_connect':
          return this.proposeRelationConnect(args);
        default:
          // Unreachable: `name` passed the MCP_TOOL_NAMES guard above.
          return errorResult({ error: 'unknown tool' });
      }
    } catch (error) {
      if (error instanceof PathSafetyError) {
        // Security events carry their kind so callers report the event class,
        // not a generic failure (SCN-ERR-04/06). Hostile arguments are never
        // echoed back into the response.
        return sanitizedError(
          { error: 'security_rejected', kind: error.kind, message: error.message },
          args,
        );
      }
      return sanitizedError(
        { error: 'tool_failed', message: error instanceof Error ? error.message : String(error) },
        args,
      );
    }
  }

  private workspaceFrom(args: Record<string, unknown>) {
    const workspaceId = typeof args.workspaceId === 'string' ? args.workspaceId : '';
    return this.registry.get(workspaceId);
  }

  private readProject(args: Record<string, unknown>): McpToolResult {
    const workspace = this.workspaceFrom(args);
    const snapshot = loadWorkspace(workspace.root);
    // Canonical snapshot at top level (spread first so snapshot keys win);
    // registry/hash metadata ride alongside for provenance.
    return textResult({
      ...snapshot,
      workspaceId: workspace.id,
      canonicalHash: canonicalHash(snapshot),
    });
  }

  private readObject(args: Record<string, unknown>): McpToolResult {
    const workspace = this.workspaceFrom(args);
    const objectId = typeof args.objectId === 'string' ? args.objectId : '';
    // Bare canonical ids resolve to their canonical files; path-like inputs
    // stay as given. Every candidate still crosses resolveWithin() — the
    // FIRST candidate that survives containment and exists is read.
    const candidates = objectId.includes('/') || objectId.includes('\\') || objectId.includes('.')
      ? [objectId]
      : [objectId, join('objects', `${objectId}.md`), join('relations', `${objectId}.yaml`)];
    let target: string | null = null;
    let usedRelative: string | null = null;
    for (const candidate of candidates) {
      const resolved = resolveWithin(workspace.root, candidate); // throws on traversal/symlink/protected
      if (existsSync(resolved)) {
        target = resolved;
        usedRelative = candidate.replaceAll('\\', '/');
        break;
      }
    }
    if (target === null || usedRelative === null) {
      return errorResult({ error: 'not_found', message: `object not found in workspace: ${objectId}` });
    }
    let content: string;
    try {
      content = readFileSync(target, 'utf8');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EISDIR') {
        return errorResult({ error: 'not_a_file', message: `object is a directory, not a readable file: ${usedRelative}` });
      }
      throw error;
    }
    return textResult({ workspaceId: workspace.id, objectId: usedRelative, content });
  }

  private searchWorkspace(args: Record<string, unknown>): McpToolResult {
    const workspace = this.workspaceFrom(args);
    const query = typeof args.query === 'string' ? args.query : '';
    const needle = query.toLowerCase();

    const files = indexWorkspaceFiles(workspace.root);
    const hits: { relative: string; snippet: string }[] = [];
    const exclusionsByCategory = new Map<string, number>();
    let protectedHits = 0;

    for (const file of files) {
      let content: string;
      try {
        content = readFileSync(file.absolute, 'utf8');
      } catch {
        continue;
      }
      if (isProtectedRelativePath(file.relative)) {
        // Defensive re-check: a protected file is never scanned or named.
        protectedHits += 1;
        continue;
      }
      if (needle.length > 0) {
        const index = content.toLowerCase().indexOf(needle);
        if (index >= 0) {
          hits.push({ relative: file.relative, snippet: content.slice(Math.max(0, index - 40), index + needle.length + 40) });
        }
      } else {
        hits.push({ relative: file.relative, snippet: '' });
      }
    }

    // Report protected exclusions as a category, never by path, so protected
    // names never echo back into context (SCN-ERR-06).
    for (const relative of this.protectedCandidates(workspace.root)) {
      protectedHits += 1;
      const category = protectedPathCategory(relative);
      exclusionsByCategory.set(category, (exclusionsByCategory.get(category) ?? 0) + 1);
    }

    return textResult({
      workspaceId: workspace.id,
      // The raw query is NOT echoed back: a query is hostile input, and
      // protected names entering via a query must never re-enter context
      // (SCN-ERR-06). Callers get a shape descriptor instead.
      queryRepr: `len=${query.length}`,
      hits,
      protectedExclusions: [...exclusionsByCategory.entries()].map(([category, count]) => ({
        category,
        count,
        excluded: 'protected path excluded from context by policy',
      })),
      protectedHitsExcluded: protectedHits,
    });
  }

  /**
   * Secret-shaped paths that exist in the workspace but are absent from the
   * index (counted only — names are never returned).
   */
  private protectedCandidates(root: string): string[] {
    const candidates: string[] = [];
    const walk = (dir: string, relative: string): void => {
      let entries;
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
        if (isProtectedRelativePath(childRelative)) {
          candidates.push(childRelative);
          continue;
        }
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) walk(join(dir, entry.name), childRelative);
      }
    };
    walk(resolve(root), '');
    return candidates;
  }

  private proposeRelationConnect(args: Record<string, unknown>): McpToolResult {
    const workspace = this.workspaceFrom(args);
    const rawParticipants = args.participantIds;
    const participantIds = Array.isArray(rawParticipants) ? rawParticipants.filter((p): p is string => typeof p === 'string') : [];
    const descriptor = typeof args.descriptor === 'string' ? args.descriptor : null;
    const classification = typeof args.classification === 'string' ? args.classification : null;

    if (participantIds.length !== 2 || participantIds[0] === participantIds[1]) {
      return errorResult({
        error: 'invalid_arguments',
        message: 'mozare_propose_relation_connect requires exactly two distinct participant ids',
      });
    }

    const snapshot = loadWorkspace(workspace.root);
    const knownIds = new Set(snapshot.objects.map((object) => object.id));
    const unknown = participantIds.filter((id) => !knownIds.has(id));
    if (unknown.length > 0) {
      return errorResult({
        error: 'unknown_participant',
        message: `unknown participant(s) in canonical workspace: ${unknown.join(', ')}`,
      });
    }

    const proposal = createRelationConnectProposal({
      projectId: snapshot.project.id,
      participantIds: [participantIds[0], participantIds[1]],
      descriptor,
      classification,
      baseCanonicalHash: canonicalHash(snapshot),
    });
    this.pendingProposals.push(proposal);

    // Proposal only: nothing canonical is written here. Human acceptance flows
    // exclusively through the existing review/apply transaction.
    return textResult({
      ...proposal,
      review: 'pending_human_acceptance',
      asks: descriptor ? [] : ['descriptor', 'classification'],
      note: 'connect mode is modal and cancellable; this proposal awaits human review and canonical truth is unchanged',
    });
  }
}
