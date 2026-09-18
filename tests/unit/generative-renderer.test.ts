import { describe, expect, it } from 'vitest';
import {
  GenerativeRenderer,
  type UISpec,
} from '../../src/core/representation/GenerativeRenderer.js';
import { selectMicroLibrary } from '../../src/core/representation/RepresentationPlanner.js';

/**
 * TASK-P05-05, TEST-GUI-02, SCN-GUI-02/03/04/06/07, ORACLE-035/036/038. RED.
 */

function validSpec(): UISpec {
  return {
    intent: 'compare',
    components: ['ComparisonTable', 'DiffHighlight'],
    actions: ['compare.side_by_side'],
    content: {
      title: 'Two readings side by side',
      records: [
        { ref: 'obj:R1', label: 'Reading A', detail: 'keeps the internal rhythm' },
        { ref: 'obj:R2', label: 'Reading B', detail: 'loosens the cadence' },
      ],
    },
  };
}

describe('GenerativeRenderer bounded generation (SCN-GUI-02/07, ORACLE-036)', () => {
  it('renders a valid spec built from the selected micro-library with reference-backed records', () => {
    const library = selectMicroLibrary('compare');
    const renderer = new GenerativeRenderer();
    const result = renderer.render(validSpec(), { library });
    expect(result.status).toBe('rendered');
    expect(result.view.critical_info.records).toHaveLength(2);
    expect(result.view.critical_info.records[0]).toMatchObject({ ref: 'obj:R1' });
    expect(result.view.allowed_actions).toContain('compare.side_by_side');
  });

  it('rejects specs that use components outside the selected micro-library (SCN-GUI-07)', () => {
    const library = selectMicroLibrary('compare'); // does not own DecisionForm
    const spec = { ...validSpec(), components: ['ComparisonTable', 'DecisionForm'] };
    const result = new GenerativeRenderer().render(spec, { library });
    expect(result.status).toBe('fallback');
    expect(result.reason).toMatch(/unknown component/i);
  });

  it('rejects unknown actions — they cannot execute as trusted behavior (ORACLE-036)', () => {
    const library = selectMicroLibrary('compare');
    const spec = { ...validSpec(), actions: ['compare.delete_canonical_truth'] };
    const result = new GenerativeRenderer().render(spec, { library });
    expect(result.status).toBe('fallback');
    expect(result.reason).toMatch(/unknown action/i);
  });
});

describe('Deterministic fallback preserves critical information (SCN-GUI-04, ORACLE-038)', () => {
  it('malformed spec (bad JSON shape) falls back with the same critical info and actions', () => {
    const library = selectMicroLibrary('compare');
    const renderer = new GenerativeRenderer();
    const malformed = { components: 'not-an-array' } as unknown as UISpec;
    const result = renderer.render(malformed, { library, critical_info: { records: [{ ref: 'obj:R9', label: 'kept' }] }, allowed_actions: ['compare.side_by_side'] });
    expect(result.status).toBe('fallback');
    expect(result.view.critical_info.records).toEqual([{ ref: 'obj:R9', label: 'kept' }]);
    expect(result.view.allowed_actions).toContain('compare.side_by_side');
  });

  it('generation budget breach (oversized content) falls back deterministically', () => {
    const library = selectMicroLibrary('compare');
    const huge: UISpec = { ...validSpec(), content: { blob: 'x'.repeat(30000) } };
    const result = new GenerativeRenderer().render(huge, { library, critical_info: { records: [] }, allowed_actions: [] });
    expect(result.status).toBe('fallback');
    expect(result.reason).toMatch(/budget/i);
  });

  it('fallback view always exposes labels and primary actions (SCN-GUI-06 invariants)', () => {
    const library = selectMicroLibrary('compare');
    const renderer = new GenerativeRenderer();
    const spec = { ...validSpec(), actions: ['made.up'] };
    const result = renderer.render(spec, { library, critical_info: { records: [{ ref: 'obj:R1', label: 'Reading A' }] }, allowed_actions: ['compare.side_by_side'] });
    expect(result.status).toBe('fallback');
    expect(result.view.critical_info.records[0]?.label).toBe('Reading A');
    expect(result.view.allowed_actions).toContain('compare.side_by_side');
  });
});
