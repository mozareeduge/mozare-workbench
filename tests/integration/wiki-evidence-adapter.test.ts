import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { buildApp } from '../../src/server/app.js';

const roots: string[] = [];

function tracked<T extends string>(dir: string): T {
  roots.push(dir);
  return dir as T;
}

function makeWikiRoot(): string {
  const root = tracked(mkdtempSync(join(tmpdir(), 'mozare-wiki-')));
  mkdirSync(join(root, '_originals', 'poems'), { recursive: true });
  mkdirSync(join(root, 'casebook'), { recursive: true });
  mkdirSync(join(root, '_release'), { recursive: true });
  writeFileSync(
    join(root, '_originals', 'poems', 'ghazal-01.md'),
    '# Ghazal 01\n\nOriginal poem record. Keyword: nightingale.\n',
    'utf8',
  );
  writeFileSync(
    join(root, 'casebook', 'claim-01.md'),
    '---\nsource: _originals/poems/ghazal-01.md\n---\n\nA derivative claim about the nightingale ghazal.\n',
    'utf8',
  );
  writeFileSync(
    join(root, '_release', 'release.json'),
    JSON.stringify({ artifact_count: 2, disputed: ['_originals/poems/ghazal-01.md'] }, null, 2) + '\n',
    'utf8',
  );
  return root;
}

function makeWorkspace(): { root: string; workspaceId: string } {
  const root = tracked(mkdtempSync(join(tmpdir(), 'mozare-wb-')));
  cpSync(join(process.cwd(), 'seed', 'example-project'), root, { recursive: true });
  // WorkspaceRegistry id convention from the MCP surface: registration order.
  // The evidence routes accept the canonical workspace root path as the id for
  // now (the registry is server-owned); tests pass the root path directly.
  return { root, workspaceId: root };
}

function qmdHelper(dir: string): string {
  const helper = join(dir, 'qmd-fake.mjs');
  writeFileSync(
    helper,
    [
      'const query = process.argv[2] ?? "";',
      'console.log(JSON.stringify({ rel: "index/qmd-01.md", title: "QMD hit", snippet: "qmd data for [" + query + "]", route: { kind: "qmd_source", rel: "index/qmd-01.md" } }));',
    ].join('\n'),
    'utf8',
  );
  return helper;
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

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }));
});

describe('TEST-010 (evidence authority): external search stays candidate evidence with a source route', () => {
  it('wiki hits expose source/authority/candidate state and a derivative routes to its original (SCN-EVD-01/02)', async () => {
    const wikiRoot = makeWikiRoot();
    const { workspaceId } = makeWorkspace();
    const app = buildApp({ evidence: { wikiRoot, qmdCommand: null } });
    apps.push(app);
    await app.listen({ host: '127.0.0.1', port: 0 });
    const port = (app.server.address() as AddressInfo).port;

    const response = await fetch(`http://127.0.0.1:${port}/api/evidence/search?workspaceId=${encodeURIComponent(workspaceId)}&query=nightingale`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      workspaceId: string;
      degraded: string[];
      local: { id: string; snippet: string }[];
      wiki: {
        available: boolean;
        hits: {
          source: string;
          rel: string;
          candidate: boolean;
          authority: string;
          sourceStatus: string;
          route: { kind: string; rel: string; originalRel?: string };
        }[];
      };
      qmd: { available: boolean };
    };

    expect(body.workspaceId).toBe(workspaceId);
    // Unconfigured optional sources are reported truthfully as degraded;
    // the wiki IS configured here, so only qmd is missing.
    expect(body.degraded).toEqual(['qmd']);
    expect(body.wiki.available).toBe(true);

    const original = body.wiki.hits.find((h) => h.rel === '_originals/poems/ghazal-01.md');
    const derivative = body.wiki.hits.find((h) => h.rel === 'casebook/claim-01.md');
    expect(original).toBeDefined();
    expect(derivative).toBeDefined();
    // Candidate state, never truth: every hit is candidate evidence with an
    // explicit source route (ORACLE-015) — and no "answer" field exists.
    for (const hit of body.wiki.hits) {
      expect(hit.source).toBe('mozare-wiki');
      expect(hit.candidate).toBe(true);
      expect(hit.authority).toBe('candidate');
      expect(Object.keys(hit)).not.toContain('answer');
    }
    expect(original!.route).toEqual({ kind: 'wiki_original', rel: '_originals/poems/ghazal-01.md' });
    expect(derivative!.route).toEqual({
      kind: 'wiki_derivative',
      rel: 'casebook/claim-01.md',
      originalRel: '_originals/poems/ghazal-01.md',
    });
    // Local project is searched alongside external sources (direct probe with
    // a term that exists in the seed workspace).
    expect(Array.isArray(body.local)).toBe(true);
    const localSearch = await fetch(`http://127.0.0.1:${port}/api/evidence/search?workspaceId=${encodeURIComponent(workspaceId)}&query=relation`);
    const localBody = (await localSearch.json()) as { local: unknown[] };
    expect(localBody.local.length).toBeGreaterThan(0);
    expect(body.qmd.available).toBe(false);
  });

  it('without wiki/qmd configured the surface degrades truthfully and the local project stays usable (SCN-EVD-04)', async () => {
    const { workspaceId } = makeWorkspace();
    const app = buildApp({ evidence: { wikiRoot: null, qmdCommand: null } });
    apps.push(app);
    await app.listen({ host: '127.0.0.1', port: 0 });
    const port = (app.server.address() as AddressInfo).port;

    const search = await fetch(`http://127.0.0.1:${port}/api/evidence/search?workspaceId=${encodeURIComponent(workspaceId)}&query=example`);
    expect(search.status).toBe(200);
    const body = (await search.json()) as {
      degraded: string[];
      local: unknown[];
      wiki: { available: boolean; reason: string; setup: string };
      qmd: { available: boolean; reason: string; setup: string };
    };
    expect(body.degraded).toEqual(['mozare-wiki', 'qmd']);
    expect(body.local.length).toBeGreaterThan(0);
    expect(body.wiki.available).toBe(false);
    expect(body.wiki.reason.length).toBeGreaterThan(0);
    expect(body.wiki.setup.length).toBeGreaterThan(0);
    expect(body.qmd.available).toBe(false);

    const caps = await fetch(`http://127.0.0.1:${port}/api/evidence/capabilities`);
    expect(caps.status).toBe(200);
    const capBody = (await caps.json()) as { wiki: { available: boolean }; qmd: { available: boolean } };
    expect(capBody.wiki.available).toBe(false);
    expect(capBody.qmd.available).toBe(false);
  });
});

describe('TEST-017 (degraded adapters): a failed QMD command never breaks the surface', () => {
  it('qmd command runs argv-only as data and its failure is a compact diagnostic, not a crash (SCN-ERR-05, SCN-EVD-04)', async () => {
    const { root: helperDir } = makeWorkspace();
    const helper = qmdHelper(helperDir);
    const { workspaceId } = makeWorkspace();
    const app = buildApp({ evidence: { wikiRoot: null, qmdCommand: ['node', helper] } });
    apps.push(app);
    await app.listen({ host: '127.0.0.1', port: 0 });
    const port = (app.server.address() as AddressInfo).port;

    const marker = join(workspaceId, 'must-not-exist-qmd');
    const hostile = `'; touch ${marker} & | $(rm -rf x)`;
    const search = await fetch(`http://127.0.0.1:${port}/api/evidence/search?workspaceId=${encodeURIComponent(workspaceId)}&query=${encodeURIComponent(hostile)}`);
    expect(search.status).toBe(200);
    const body = (await search.json()) as {
      qmd: { available: boolean; hits: { source: string; snippet: string; route: { kind: string; rel: string } }[] };
      degraded: string[];
    };
    expect(body.qmd.available).toBe(true);
    expect(body.qmd.hits).toHaveLength(1);
    expect(body.qmd.hits[0]!.source).toBe('qmd');
    expect(body.qmd.hits[0]!.route).toEqual({ kind: 'qmd_source', rel: 'index/qmd-01.md' });
    // The hostile string traveled as a single argv value (data), never a shell.
    expect(body.qmd.hits[0]!.snippet).toContain(`[${hostile}]`);
    expect(body.degraded).toEqual(['mozare-wiki']);
    expect(existsSync(marker)).toBe(false);

    const failing = buildApp({ evidence: { wikiRoot: null, qmdCommand: ['node', '-e', 'process.exit(1)'] } });
    apps.push(failing);
    await failing.listen({ host: '127.0.0.1', port: 0 });
    const fport = (failing.server.address() as AddressInfo).port;
    const failed = await fetch(`http://127.0.0.1:${fport}/api/evidence/search?workspaceId=${encodeURIComponent(workspaceId)}&query=x`);
    expect(failed.status).toBe(200);
    const fbody = (await failed.json()) as { qmd: { available: boolean; error: string }; degraded: string[]; local: unknown[] };
    expect(fbody.qmd.available).toBe(true);
    expect(fbody.qmd.error.length).toBeGreaterThan(0);
    expect(fbody.degraded).toEqual(['mozare-wiki']);
    expect(fbody.local.length).toBeGreaterThan(0);
  });
});

describe('TEST-010 (capture): Capture stages a candidate reference and never claims truth (SCN-EVD-03, SCN-X-08)', () => {
  it('capture is staged pending review, wiki and canonical workspace stay byte-identical, disputed source stays qualified', async () => {
    const wikiRoot = makeWikiRoot();
    const { workspaceId } = makeWorkspace();
    const app = buildApp({ evidence: { wikiRoot, qmdCommand: null } });
    apps.push(app);
    await app.listen({ host: '127.0.0.1', port: 0 });
    const port = (app.server.address() as AddressInfo).port;

    const wikiBefore = recursiveFiles(wikiRoot);
    const workspaceBefore = recursiveFiles(workspaceId);

    const search = await fetch(`http://127.0.0.1:${port}/api/evidence/search?workspaceId=${encodeURIComponent(workspaceId)}&query=nightingale`);
    const searchBody = (await search.json()) as { wiki: { hits: { rel: string; route: { kind: string; rel: string; originalRel?: string }; sourceStatus: string }[] } };
    const hit = searchBody.wiki.hits.find((h) => h.rel === '_originals/poems/ghazal-01.md')!;

    const capture = await fetch(`http://127.0.0.1:${port}/api/evidence/capture`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workspaceId, hit, note: 'candidate evidence for later review' }),
    });
    expect(capture.status).toBe(200);
    const capBody = (await capture.json()) as {
      captured: {
        id: string;
        kind: string;
        status: string;
        authority: string;
        source: string;
        route: { kind: string; rel: string };
        qualified: { source_status: string };
        projectId: string;
      };
    };
    expect(capBody.captured.id).toMatch(/^CAP-[\w-]+$/);
    expect(capBody.captured.kind).toBe('evidence_capture');
    expect(capBody.captured.status).toBe('pending_review');
    // Capture ≠ Accept truth: a disputed source stays candidate/qualified.
    expect(capBody.captured.authority).toBe('candidate');
    expect(capBody.captured.qualified).toEqual({ source_status: 'disputed' });
    expect(capBody.captured.projectId).toBe('example-artistic-research');

    // External source untouched, canonical workspace untouched.
    expect(recursiveFiles(wikiRoot)).toEqual(wikiBefore);
    expect(recursiveFiles(workspaceId)).toEqual(workspaceBefore);

    const list = await fetch(`http://127.0.0.1:${port}/api/evidence/captures?workspaceId=${encodeURIComponent(workspaceId)}`);
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as { captures: { id: string; status: string }[] };
    expect(listBody.captures.map((c) => c.id)).toContain(capBody.captured.id);
    expect(listBody.captures.every((c) => c.status === 'pending_review')).toBe(true);
  });
});
