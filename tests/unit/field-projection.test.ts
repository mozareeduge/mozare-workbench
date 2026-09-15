import { describe, expect, it } from 'vitest';
import { moveFieldNode, projectField } from '../../src/core/projection/FieldProjection.js';
import type { WorkspaceSnapshot } from '../../src/core/workspace.js';

const object = (id: string) => ({ id, type: 'question', project_id: 'p', name: id, lifecycle: 'active', evidence_state: 'candidate', use_status: 'active', verification_state: 'not_applicable', origin: { kind: 'human' }, relations: ['r'] });
const snapshot = (count: number): WorkspaceSnapshot => ({ project: { id: 'p', name: 'P', kind: 'research', lifecycle: 'active', current_objective: 'O', current_question_id: 'current' }, objects: [object('current'), ...Array.from({ length: count }, (_, index) => object(`neighbor-${index}`))], relations: Array.from({ length: count }, (_, index) => ({ id: `r-${index}`, project_id: 'p', participants: ['current', `neighbor-${index}`], relation_type: null, classification_state: 'unsettled', evidence_state: 'candidate', use_status: 'exploratory', claimability: 'blocked', origin: { kind: 'human' } })), artifacts: [] });

describe('TEST-003: Field derived relation projection', () => {
  it('preserves an unsettled relation and limits dense projections', () => {
    const field = projectField(snapshot(150));
    expect(field.relations[0].classification_state).toBe('unsettled');
    expect(field.relations[0].relation_type).toBeNull();
    expect(field.nodes).toHaveLength(100);
    expect(field.hiddenByProjection).toBe(51);
  });

  it('moves nodes only in a copied derived layout record', () => {
    const layout = { current: { x: 0, y: 0 } };
    const moved = moveFieldNode(layout, 'current', { x: 18, y: 27 });
    expect(moved).toEqual({ current: { x: 18, y: 27 } });
    expect(layout).toEqual({ current: { x: 0, y: 0 } });
    expect(projectField(snapshot(1)).currentObject.id).toBe('current');
  });
});
