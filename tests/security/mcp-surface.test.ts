import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  FORBIDDEN_MCP_TOOL_NAMES,
  McpWorkspaceServer,
  MCP_TOOL_NAMES,
  WorkspaceRegistry,
} from '../../src/mcp/McpWorkspaceServer.js';
import { PathSafetyError, resolveWithin } from '../../src/mcp/pathSafety.js';

const roots: string[] = [];
const outsideRoots: string[] = [];

function fixture(): { root: string; server: McpWorkspaceServer; workspaceId: string } {
  const root = mkdtempSync(join(tmpdir(), 'mozare-mcp-'));
  roots.push(root);
  cpSync(join(process.cwd(), 'seed', 'example-project'), root, { recursive: true });
  writeFileSync(join(root, '.env'), 'MOZARE_SECRET_TOKEN=not-for-context\n', 'utf8');
  const registry = new WorkspaceRegistry();
  const server = new McpWorkspaceServer(registry);
  const workspaceId = registry.register(root).id;
  return { root, server, workspaceId };
}

function recursiveFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(full.slice(root.length + 1));
    }
  };
  walk(root);
  return out.sort();
}

afterEach(() => {
  roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }));
  outsideRoots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }));
});

describe('TEST-003 (MCP clause): connect creates a proposal only — no direct canonical relation write via MCP', () => {
  it('mozare_propose_relation_connect stages a pending_review proposal and leaves canonical truth byte-identical', () => {
    const { root, server, workspaceId } = fixture();
    const filesBefore = recursiveFiles(root);
    const relationsBefore = readdirSync(join(root, 'relations')).sort();

    const result = server.handleToolCall({
      name: 'mozare_propose_relation_connect',
      arguments: {
        workspaceId,
        participantIds: ['q_20260914_example01', 'src_20260914_example01'],
        descriptor: 'supports',
        classification: 'evidential',
      },
    });

    expect(result.isError).toBeFalsy();
    const proposal = JSON.parse(result.content[0].text) as {
      kind: string;
      status: string;
      participantIds: string[];
      projectId: string;
      descriptor: string | null;
      classification: string | null;
      baseCanonicalHash: string;
      id: string;
    };
    expect(proposal.kind).toBe('relation_connect');
    expect(proposal.status).toBe('pending_review');
    expect(proposal.participantIds).toEqual(['q_20260914_example01', 'src_20260914_example01']);
    expect(proposal.projectId).toBe('example-artistic-research');
    expect(proposal.descriptor).toBe('supports');
    expect(proposal.classification).toBe('evidential');
    expect(proposal.id).toMatch(/^[\w-]+$/);

    // The proposal is staged for human review, not applied.
    expect(server.pendingProposals).toHaveLength(1);
    expect(server.pendingProposals[0]?.id).toBe(proposal.id);

    // Canonical truth untouched: no new/changed file anywhere in the workspace.
    expect(recursiveFiles(root)).toEqual(filesBefore);
    expect(readdirSync(join(root, 'relations')).sort()).toEqual(relationsBefore);
  });

  it('rejects a connect proposal whose participants do not exist in canonical state', () => {
    const { root, server, workspaceId } = fixture();
    const filesBefore = recursiveFiles(root);

    const result = server.handleToolCall({
      name: 'mozare_propose_relation_connect',
      arguments: {
        workspaceId,
        participantIds: ['q_20260914_example01', 'obj_does_not_exist'],
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/unknown participant/i);
    expect(recursiveFiles(root)).toEqual(filesBefore);
  });

  it('exposes no write/accept/shell/delete tool, and refuses forbidden names whether or not they are known', () => {
    const { root, server } = fixture();
    const marker = join(root, 'must-not-exist');

    for (const forbidden of FORBIDDEN_MCP_TOOL_NAMES) {
      expect(MCP_TOOL_NAMES).not.toContain(forbidden);
    }
    for (const name of ['mozare_write_canonical', 'mozare_accept_proposal', 'mozare_run_shell', 'mozare_delete_object']) {
      const result = server.handleToolCall({ name, arguments: { command: 'touch must-not-exist' } });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/not exposed/i);
    }
    expect(server.handleToolCall({ name: 'totally_unknown_tool', arguments: {} }).isError).toBe(true);
    expect(existsSync(marker)).toBe(false);
  });
});

describe('TEST-012 (MCP clause): path traversal/symlink escape, shell metacharacters, protected secrets', () => {
  it('rejects path traversal before any read or write (SCN-ERR-04) and reports it as a security event', () => {
    const { server, workspaceId } = fixture();
    const outside = mkdtempSync(join(tmpdir(), 'mozare-mcp-outside-'));
    outsideRoots.push(outside);
    const outsideFile = join(outside, 'outside.txt');
    writeFileSync(outsideFile, 'outside\n', 'utf8');

    const result = server.handleToolCall({
      name: 'mozare_read_object',
      arguments: { workspaceId, objectId: '../../outside.txt' },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('path_escape');
    expect(result.content[0].text).not.toContain('outside');
    expect(existsSync(outsideFile)).toBe(true);
  });

  it('rejects a symlink/junction that escapes the workspace root (SCN-ERR-04)', () => {
    const { root, server, workspaceId } = fixture();
    const outside = mkdtempSync(join(tmpdir(), 'mozare-mcp-outside-'));
    outsideRoots.push(outside);
    symlinkSync(outside, join(root, 'escape'), 'junction');

    const result = server.handleToolCall({
      name: 'mozare_read_object',
      arguments: { workspaceId, objectId: 'escape' },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('symlink_escape');
  });

  it('treats shell metacharacters in tool arguments as data, never as commands (SCN-ERR-05)', () => {
    const { root, server, workspaceId } = fixture();
    const marker = join(root, 'must-not-exist-mcp');
    const hostileQuery = `'; touch ${marker} & | $(rm -rf x) `;

    const search = server.handleToolCall({
      name: 'mozare_search_workspace',
      arguments: { workspaceId, query: hostileQuery },
    });
    expect(search.isError).toBeFalsy();

    const read = server.handleToolCall({
      name: 'mozare_read_object',
      arguments: { workspaceId, objectId: 'q_20260914_example01' },
    });
    expect(read.isError).toBeFalsy();
    expect(read.content[0].text).toContain('How can this relation');

    expect(existsSync(marker)).toBe(false);
  });

  it('excludes protected secret paths from context and reports them as a protected exclusion (SCN-ERR-06)', () => {
    const { root, server, workspaceId } = fixture();

    const byContent = server.handleToolCall({
      name: 'mozare_search_workspace',
      arguments: { workspaceId, query: 'MOZARE_SECRET_TOKEN' },
    });
    expect(byContent.isError).toBeFalsy();
    expect(byContent.content[0].text).not.toContain('MOZARE_SECRET_TOKEN');
    expect(byContent.content[0].text).not.toContain('not-for-context');

    const byName = server.handleToolCall({
      name: 'mozare_search_workspace',
      arguments: { workspaceId, query: '.env' },
    });
    expect(byName.isError).toBeFalsy();
    expect(byName.content[0].text).not.toMatch(/\.env/);

    const direct = server.handleToolCall({
      name: 'mozare_read_object',
      arguments: { workspaceId, objectId: '.env' },
    });
    expect(direct.isError).toBe(true);
    expect(direct.content[0].text).toContain('protected_path');
    expect(direct.content[0].text).toMatch(/protected/i);

    // The secret file itself is untouched and was never read into any response.
    expect(existsSync(join(root, '.env'))).toBe(true);
  });
});

describe('MCP read surface (canonical read, outside transcripts)', () => {
  it('mozare_read_project returns the validated canonical snapshot', () => {
    const { server, workspaceId } = fixture();
    const result = server.handleToolCall({ name: 'mozare_read_project', arguments: { workspaceId } });
    expect(result.isError).toBeFalsy();
    const snapshot = JSON.parse(result.content[0].text) as { project: { id: string }; objects: { id: string }[] };
    expect(snapshot.project.id).toBe('example-artistic-research');
    expect(snapshot.objects.map((o) => o.id)).toContain('q_20260914_example01');
  });

  it('resolveWithin enforces containment directly (unit-level negative control)', () => {
    const root = mkdtempSync(join(tmpdir(), 'mozare-mcp-'));
    roots.push(root);
    expect(() => resolveWithin(root, '../elsewhere')).toThrow(PathSafetyError);
    expect(() => resolveWithin(root, '.env')).toThrow(PathSafetyError);
    expect(resolveWithin(root, 'objects')).toBe(join(root, 'objects'));
  });
});
