import type { MicroLibrary } from './RepresentationPlanner.js';
import { ACTION_REGISTRY } from './RepresentationPlanner.js';

/**
 * GenerativeRenderer (TASK-P05-05, SCN-GUI-02/03/04/06/07, ORACLE-035/036/038).
 *
 * Validates and renders a generated OpenUI spec against ONE bounded
 * micro-library and a bounded context packet. Unknown components/actions
 * cannot render or execute as trusted behavior; budget breaches and malformed
 * specs reject the generation and fall back deterministically with the same
 * critical information and allowed actions. Canonical facts stay
 * reference-backed in both paths.
 */

export type UISpec = {
  intent: string;
  /** Component names the generated view uses (must be owned by the library). */
  components: string[];
  /** Action ids the generated view may trigger (must be registry-known). */
  actions: string[];
  content: Record<string, unknown>;
};

export type CriticalInfo = {
  records?: Array<{ ref: string; label: string; detail?: string }>;
  [key: string]: unknown;
};

export type RenderOutcome =
  | { status: 'rendered'; view: RenderedView; reason?: undefined }
  | { status: 'fallback'; view: RenderedView; reason: string };

export type RenderedCritical = CriticalInfo & {
  records: Array<{ ref: string; label: string; detail?: string }>;
};

export type RenderedView = {
  intent: string;
  /** Reference-backed canonical facts — identical in rendered and fallback paths. */
  critical_info: RenderedCritical;
  allowed_actions: string[];
  source: 'generative' | 'deterministic-fallback';
};

/** Bounded context: the generation packet never exceeds this size. */
const CONTENT_BUDGET_CHARS = 20000;

export type RenderContext = {
  library: MicroLibrary;
  /** Same critical info the deterministic fallback must preserve. */
  critical_info?: CriticalInfo;
  allowed_actions?: string[];
};

export class GenerativeRenderer {
  render(spec: unknown, context: RenderContext): RenderOutcome {
    const critical = context.critical_info ?? { records: [] };
    const allowed = [...(context.allowed_actions ?? [])].sort();
const records = Array.isArray(critical.records) ? critical.records : [];

    const fallback = (reason: string): RenderOutcome => ({
      status: 'fallback',
      view: {
        intent: typeof (spec as { intent?: unknown })?.intent === 'string' ? (spec as { intent: string }).intent : context.library.intent,
        critical_info: { ...critical, records },
        allowed_actions: allowed,
        source: 'deterministic-fallback',
      },
      reason,
    });

    // Shape gate: malformed generation never reaches trusted rendering.
    const candidate = spec as UISpec | null;
    if (
      candidate === null ||
      typeof candidate !== 'object' ||
      !Array.isArray(candidate.components) ||
      !Array.isArray(candidate.actions) ||
      typeof candidate.content !== 'object' ||
      candidate.content === null
    ) {
      return fallback('malformed spec: components/actions/content shape invalid');
    }

    // Budget gate (ORACLE-036): one bounded packet, never the whole catalog.
    const serialized = JSON.stringify(candidate);
    if (serialized.length > CONTENT_BUDGET_CHARS) {
      return fallback('generation budget exceeded: spec exceeds bounded packet size');
    }

    // Library ownership gate (SCN-GUI-07): components must be owned by the
    // selected micro-library — unknown components cannot render.
    const unknownComponent = candidate.components.find((c) => !context.library.components.includes(c));
    if (unknownComponent) {
      return fallback(`unknown component for selected micro-library: ${unknownComponent}`);
    }

    // Trusted-action gate (ORACLE-036): only registry-known actions execute.
    const unknownAction = candidate.actions.find((a) => !ACTION_REGISTRY.has(a));
    if (unknownAction) {
      return fallback(`unknown action: ${unknownAction}`);
    }

    // Reference-backing gate: rendered records come from the generated spec's
    // content; each must keep a canonical ref. (Fallback keeps the caller's
    // critical info — ORACLE-038.)
    const contentRecords = Array.isArray((candidate.content as { records?: unknown }).records)
      ? ((candidate.content as { records: Array<{ ref?: unknown; label?: unknown }> }).records)
      : [];
    for (const record of contentRecords) {
      if (typeof record?.ref !== 'string' || record.ref.length === 0 || typeof record?.label !== 'string') {
        return fallback('rendered record missing canonical ref or label');
      }
    }
    const typedRecords: Array<{ ref: string; label: string; detail?: string }> = contentRecords.map((r) => {
      const rec = r as { ref?: unknown; label?: unknown; detail?: unknown };
      return {
        ref: rec.ref as string,
        label: rec.label as string,
        ...(typeof rec.detail === 'string' ? { detail: rec.detail as string } : {}),
      };
    });

    // Registry-validated spec actions join the allowed set (validated above).
    const allowedActions = Array.from(new Set([...allowed, ...candidate.actions])).sort();

    return {
      status: 'rendered',
      view: {
        intent: candidate.intent,
        critical_info: { ...critical, records: typedRecords },
        allowed_actions: allowedActions,
        source: 'generative',
      },
    };
  }
}
