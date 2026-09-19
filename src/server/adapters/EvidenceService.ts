import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { execa } from 'execa';
import { loadWorkspace } from '../../core/workspace.js';
import { isProtectedRelativePath } from '../../mcp/pathSafety.js';

/**
 * Mozare Wiki / QMD read adapter with authority route and candidate capture
 * (TASK-P07-01). Authority: TECH/INTEGRATIONS.md —
 *
 * - Wiki default is read/search/get; the wiki is never copied into the
 *   Workbench and its controller is never bypassed (read-only fs access here);
 * - QMD results are CANDIDATES: `get`/source route is required before a hit is
 *   treated as inspected evidence;
 * - Capture creates a staged candidate reference only — it never asserts
 *   truth, never mutates the external source, and never writes canonical
 *   workspace files (ORACLE-015).
 */

export type EvidenceRoute = {
  kind: 'wiki_original' | 'wiki_derivative' | 'qmd_source' | 'local_object';
  rel: string;
  originalRel?: string;
};

export type EvidenceHit = {
  source: 'mozare-wiki' | 'qmd' | 'local_project';
  rel: string;
  title: string;
  snippet: string;
  /** Every external hit is candidate evidence; there is no "answer" field. */
  candidate: true;
  /** Search hits are always candidates; originals are reached via route. */
  authority: 'candidate';
  sourceStatus: string;
  route: EvidenceRoute;
};

export type UnavailableShape = {
  available: false;
  reason: string;
  setup: string;
};

export type WikiSearchShape = {
  available: true;
  hits: EvidenceHit[];
  error?: string;
};

export type QmdSearchShape = {
  available: true;
  hits: EvidenceHit[];
  error?: string;
};

export type EvidenceCapture = {
  id: string;
  kind: 'evidence_capture';
  status: 'pending_review';
  authority: 'candidate';
  source: string;
  rel: string;
  route: EvidenceRoute;
  qualified: { source_status: string };
  projectId: string;
  note: string;
  captured_at: string;
};

const SEARCHABLE_LOCAL_EXTENSIONS = new Set(['.md', '.yaml', '.yml', '.json', '.txt']);
const MAX_FILE_BYTES = 512 * 1024;
const MAX_FILES_SCANNED = 2000;
const MAX_HITS_PER_SOURCE = 10;
const SNIPPET_CONTEXT = 40;

function fileTitle(content: string, rel: string): string {
  const heading = content.match(/^#\s+(.+)$/m);
  if (heading?.[1]) return heading[1].trim();
  const base = rel.split('/').pop() ?? rel;
  return base.replace(/\.(md|yaml|yml|json|txt)$/i, '');
}

function snippetAround(content: string, needle: string): string {
  const index = content.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return content.slice(0, SNIPPET_CONTEXT * 2);
  return content.slice(Math.max(0, index - SNIPPET_CONTEXT), index + needle.length + SNIPPET_CONTEXT);
}

/**
 * Bounded text-file walk with protected-path exclusion (reuses the MCP
 * surface's protected-path policy so secrets are excluded from evidence
 * context by the same rule that guards MCP responses).
 */
function walkTextFiles(root: string, visit: (rel: string, absolute: string) => void): void {
  let scanned = 0;
  const walk = (dir: string, relative: string): void => {
    if (scanned >= MAX_FILES_SCANNED) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (scanned >= MAX_FILES_SCANNED) return;
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
      if (isProtectedRelativePath(childRelative)) continue;
      if (entry.isSymbolicLink()) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, childRelative);
        continue;
      }
      const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
      if (!SEARCHABLE_LOCAL_EXTENSIONS.has(ext)) continue;
      let size = 0;
      try {
        size = statSync(full).size;
      } catch {
        continue;
      }
      if (size > MAX_FILE_BYTES) continue;
      scanned += 1;
      visit(childRelative, full);
    }
  };
  walk(resolve(root), '');
}

/** Read-only adapter over a configured Mozare Wiki root (never mutates it). */
export class WikiReadAdapter {
  constructor(private readonly wikiRoot: string | null) {}

  capabilities(): UnavailableShape | { available: true } {
    if (!this.wikiRoot || !isAbsolute(this.wikiRoot) || !existsSync(this.wikiRoot)) {
      return {
        available: false,
        reason: 'Mozare Wiki root is not configured or does not exist on this machine',
        setup: 'Set wiki_root in config/evidence.yaml to the governed wiki repository root',
      };
    }
    return { available: true };
  }

  search(query: string): WikiSearchShape | UnavailableShape {
    const caps = this.capabilities();
    if (!caps.available) return caps;
    const root = resolve(this.wikiRoot!);
    // Release metadata drives dispute status; the wiki's own controller owns it.
    let disputed = new Set<string>();
    try {
      const releasePath = join(root, '_release', 'release.json');
      if (existsSync(releasePath)) {
        const parsed = JSON.parse(readFileSync(releasePath, 'utf8')) as { disputed?: unknown };
        if (Array.isArray(parsed.disputed)) {
          disputed = new Set(parsed.disputed.filter((d): d is string => typeof d === 'string'));
        }
      }
    } catch {
      // Unreadable release metadata: fall through with no dispute knowledge.
    }

    const hits: EvidenceHit[] = [];
    let error: string | undefined;
    try {
      walkTextFiles(root, (rel, absolute) => {
        if (hits.length >= MAX_HITS_PER_SOURCE) return;
        let content: string;
        try {
          content = readFileSync(absolute, 'utf8');
        } catch {
          return;
        }
        if (query.length > 0 && !content.toLowerCase().includes(query.toLowerCase())) return;
        const isOriginal = rel.startsWith('_originals/');
        const frontmatterSource = content.match(/^source:\s*(\S+)\s*$/m);
        const route: EvidenceRoute = isOriginal
          ? { kind: 'wiki_original', rel }
          : {
              kind: 'wiki_derivative',
              rel,
              ...(frontmatterSource?.[1] ? { originalRel: frontmatterSource[1] } : {}),
            };
        hits.push({
          source: 'mozare-wiki',
          rel,
          title: fileTitle(content, rel),
          snippet: snippetAround(content, query),
          candidate: true,
          // A search hit is never inspected evidence yet — even when it lives
          // under _originals/. Whether it IS an original is carried by
          // route.kind, not asserted here (ORACLE-015).
          authority: 'candidate',
          sourceStatus: disputed.has(rel) ? 'disputed' : 'current',
          route,
        });
      });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    return { available: true, hits, ...(error ? { error } : {}) };
  }
}

/**
 * Optional QMD retrieval adapter. The query travels as ONE argv value —
 * never through a shell (SCN-ERR-05). Results are candidates with a source
 * route; a failing or missing helper is a compact diagnostic, never a crash.
 */
export class QmdAdapter {
  constructor(private readonly command: readonly string[] | null) {}

  capabilities(): UnavailableShape | { available: true } {
    if (!this.command || this.command.length === 0 || typeof this.command[0] !== 'string') {
      return {
        available: false,
        reason: 'QMD retrieval command is not configured',
        setup: 'Set qmd_command in config/evidence.yaml as an argv array, e.g. ["qmd", "search"]',
      };
    }
    return { available: true };
  }

  async search(query: string): Promise<QmdSearchShape | UnavailableShape> {
    const caps = this.capabilities();
    if (!caps.available) return caps;
    const [file, ...args] = this.command!;
    try {
      const result = await execa(file, [...args, query], {
        timeout: 10_000,
        reject: false,
      });
      if (result.exitCode !== 0) {
        return {
          available: true,
          hits: [],
          error: `qmd command failed with exit code ${result.exitCode}`,
        };
      }
      const parsed = JSON.parse(result.stdout) as {
        rel?: unknown;
        title?: unknown;
        snippet?: unknown;
        route?: unknown;
      } | Array<Record<string, unknown>>;
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const hits: EvidenceHit[] = [];
      for (const item of items) {
        const rel = typeof item.rel === 'string' ? item.rel : '';
        if (!rel) continue;
        const route =
          item.route && typeof item.route === 'object' && typeof (item.route as { rel?: unknown }).rel === 'string'
            ? (item.route as EvidenceRoute)
            : { kind: 'qmd_source' as const, rel };
        hits.push({
          source: 'qmd',
          rel,
          title: typeof item.title === 'string' ? item.title : rel,
          snippet: typeof item.snippet === 'string' ? item.snippet : '',
          candidate: true,
          authority: 'candidate',
          sourceStatus: 'external',
          route,
        });
        if (hits.length >= MAX_HITS_PER_SOURCE) break;
      }
      return { available: true, hits };
    } catch (error) {
      return {
        available: true,
        hits: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Local project search: the always-usable baseline when every external
 * adapter is unavailable (SCN-EVD-04, ORACLE-023 — core continuity never
 * depends on a vendor).
 */
export function searchLocalProject(workspaceRoot: string, query: string): EvidenceHit[] {
  const hits: EvidenceHit[] = [];
  walkTextFiles(workspaceRoot, (rel, absolute) => {
    if (hits.length >= MAX_HITS_PER_SOURCE) return;
    let content: string;
    try {
      content = readFileSync(absolute, 'utf8');
    } catch {
      return;
    }
    if (query.length > 0 && !content.toLowerCase().includes(query.toLowerCase())) return;
    hits.push({
      source: 'local_project',
      rel,
      title: fileTitle(content, rel),
      snippet: snippetAround(content, query),
      candidate: true,
      authority: 'candidate',
      sourceStatus: 'local',
      route: { kind: 'local_object', rel },
    });
  });
  return hits;
}

/**
 * Candidate capture staging: Capture is NOT acceptance. Nothing canonical is
 * written; the capture waits for human review like any other proposal-shaped
 * record. A disputed source stays candidate/qualified (SCN-X-08).
 */
export class EvidenceCaptureStore {
  private readonly captures: EvidenceCapture[] = [];

  stage(workspaceRoot: string, hit: EvidenceHit, note: string): EvidenceCapture {
    if (!hit || typeof hit !== 'object' || typeof hit.rel !== 'string' || !hit.route) {
      throw new Error('invalid evidence hit: rel and route are required');
    }
    const snapshot = loadWorkspace(workspaceRoot);
    const capture: EvidenceCapture = {
      id: `CAP-${randomUUID().replaceAll('-', '').slice(0, 12)}`,
      kind: 'evidence_capture',
      status: 'pending_review',
      authority: 'candidate',
      source: hit.source,
      rel: hit.rel,
      route: hit.route,
      qualified: { source_status: hit.sourceStatus },
      projectId: snapshot.project.id,
      note: typeof note === 'string' ? note : '',
      captured_at: new Date().toISOString(),
    };
    this.captures.push(capture);
    return capture;
  }

  list(projectId: string): EvidenceCapture[] {
    return this.captures.filter((capture) => capture.projectId === projectId);
  }
}
