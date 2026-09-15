import { useRef, useState } from 'react';

type Node = { id: string; type: string; title: string; state: string };
const nodes: Node[] = [
  { id: 'q_20260914_example01', type: 'Question', title: 'How can this relation become an operational design experiment?', state: 'Current · candidate evidence' },
  { id: 'src_20260914_example01', type: 'Source', title: 'Primary source fragment', state: 'Verified evidence' },
];
const relation = { id: 'rel_20260914_example01', participants: ['How can this relation become an operational design experiment?', 'Primary source fragment'], classification: 'Unsettled', statement: 'No relation type has been accepted.', evidence: 'Primary source fragment', uncertainty: 'The source is relevant, but the exact design implication remains unsettled.', use: 'Exploratory · design research', history: 'No recorded history events' };

export function Field() {
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [selected, setSelected] = useState<{ kind: 'object'; value: Node } | { kind: 'relation'; value: typeof relation }>({ kind: 'object', value: nodes[0] });
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const drag = useRef<{ id: string; x: number; y: number } | null>(null);
  const openObject = (node: Node) => setSelected({ kind: 'object', value: node });
  const startDrag = (event: React.PointerEvent<HTMLButtonElement>, node: Node) => { drag.current = { id: node.id, x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); };
  const dragNode = (event: React.PointerEvent<HTMLButtonElement>) => { if (!drag.current) return; const item = drag.current; setPositions((old) => ({ ...old, [item.id]: { x: event.clientX - item.x, y: event.clientY - item.y } })); };
  const stopDrag = () => { drag.current = null; };
  return <section className="field-surface" aria-labelledby="field-heading">
    <div className="field-heading"><div><p className="eyebrow">Project surface</p><h1 id="field-heading">Field</h1><p>Current inquiry and its bounded relation slice.</p></div><div className="field-controls" aria-label="Field view controls"><button className={mode === 'map' ? 'is-active' : ''} type="button" onClick={() => setMode('map')}>Map</button><button className={mode === 'list' ? 'is-active' : ''} type="button" onClick={() => setMode('list')}>List</button><button type="button" onClick={() => setPositions({})}>Reset layout</button></div></div>
    <p className="derived-state" role="status">Layout changes are derived display state only; canonical project records are unchanged.</p>
    <div className="field-layout"><div className="field-workspace">
      {mode === 'map' ? <div className="field-map" aria-label="Relation map"><p className="field-legend"><span className="dash" aria-hidden="true" /> Unsettled relation — classification has not been inferred</p><div className="relation-line" aria-hidden="true" /><button className="relation-hit" type="button" onClick={() => setSelected({ kind: 'relation', value: relation })} aria-label="Inspect unsettled relation">Unsettled</button>{nodes.map((node, index) => <button key={node.id} type="button" className={`object-node ${node.id === nodes[0].id ? 'is-current' : ''}`} style={{ transform: `translate(${(positions[node.id]?.x ?? 0) + index * 255}px, ${(positions[node.id]?.y ?? 0) + (index ? 150 : 25)}px)` }} onClick={() => openObject(node)} onPointerDown={(event) => startDrag(event, node)} onPointerMove={dragNode} onPointerUp={stopDrag}><span>{node.type}</span><strong>{node.title}</strong><small>{node.state}</small></button>)}</div> : <ul className="relation-list" aria-label="Field relation list">{nodes.map((node) => <li key={node.id}><button type="button" onClick={() => openObject(node)}><span>{node.type}</span><strong>{node.title}</strong><small>{node.state}</small><em>Inspect object</em></button></li>)}<li><button type="button" onClick={() => setSelected({ kind: 'relation', value: relation })}><span>Relation</span><strong>Unsettled relation</strong><small>{relation.participants.join(' ↔ ')}</small><em>Inspect relation</em></button></li></ul>}
    </div><aside className="field-inspector" aria-live="polite" aria-label="Field inspector">{selected.kind === 'object' ? <><p className="eyebrow">Object</p><h2>{selected.value.title}</h2><dl><dt>Type</dt><dd>{selected.value.type}</dd><dt>State</dt><dd>{selected.value.state}</dd></dl></> : <><p className="eyebrow">Relation</p><h2><span className="unsettled-label">Unsettled</span> relation</h2><dl><dt>Participants</dt><dd>{relation.participants.join(' ↔ ')}</dd><dt>Classification</dt><dd>Unsettled</dd><dt>Relation statement</dt><dd>{relation.statement}</dd><dt>Evidence for</dt><dd>{relation.evidence}</dd><dt>Uncertainty</dt><dd>{relation.uncertainty}</dd><dt>Use</dt><dd>{relation.use}</dd><dt>History</dt><dd>{relation.history}</dd></dl></>}</aside></div>
  </section>;
}
