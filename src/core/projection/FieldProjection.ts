import type { CanonicalObject, CanonicalRelation, WorkspaceSnapshot } from '../workspace.js';

export const FIELD_NODE_LIMIT = 100;

export type DerivedNodePosition = { x: number; y: number };
export type FieldProjection = {
  currentObject: CanonicalObject;
  nodes: CanonicalObject[];
  relations: CanonicalRelation[];
  hiddenByProjection: number;
  layout: Record<string, DerivedNodePosition>;
};

/** A read-only, bounded relation slice. Layout is display state, never canonical truth. */
export function projectField(snapshot: WorkspaceSnapshot, layout: Record<string, DerivedNodePosition> = {}): FieldProjection {
  const currentObject = snapshot.objects.find((object) => object.id === snapshot.project.current_question_id);
  if (!currentObject) throw new Error(`Current question ${snapshot.project.current_question_id} is missing from the workspace snapshot`);
  const relatedIds = new Set(snapshot.relations.filter((relation) => relation.participants.includes(currentObject.id)).flatMap((relation) => relation.participants));
  const candidates = snapshot.objects.filter((object) => relatedIds.has(object.id));
  const nodes = candidates.slice(0, FIELD_NODE_LIMIT);
  const visibleIds = new Set(nodes.map(({ id }) => id));
  return {
    currentObject,
    nodes,
    relations: snapshot.relations.filter((relation) => relation.participants.every((id) => visibleIds.has(id))),
    hiddenByProjection: Math.max(0, candidates.length - nodes.length),
    layout: { ...layout },
  };
}

/** Returns a new derived layout record; callers must not persist it with canonical records. */
export function moveFieldNode(layout: Record<string, DerivedNodePosition>, nodeId: string, position: DerivedNodePosition): Record<string, DerivedNodePosition> {
  return { ...layout, [nodeId]: { x: position.x, y: position.y } };
}
