import { useEffect, useRef, useState } from 'react';
import { createRelationConnectProposal, type RelationConnectProposal } from '../../core/proposals/RelationProposal.js';
import type { FieldProjection, LiveObject, LiveRelation } from '../liveTypes';

type Selection = { kind: 'object'; value: LiveObject } | { kind: 'relation'; value: LiveRelation } | null;

export function Field({ field, canonicalHash, projectId }: { field: FieldProjection | null; canonicalHash: string; projectId: string }) {
  const nodes = field?.nodes ?? [];
  const relations = field?.relations ?? [];
  const [mode, setMode] = useState<'map' | 'list'>(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 759px)').matches ? 'list' : 'map');
  const [selected, setSelected] = useState<Selection>(field?.currentObject ? { kind: 'object', value: field.currentObject } : null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [connectSource, setConnectSource] = useState<LiveObject | null>(null);
  const [connectActive, setConnectActive] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<LiveObject | null>(null);
  const [descriptor, setDescriptor] = useState('');
  const [classification, setClassification] = useState('');
  const [proposals, setProposals] = useState<RelationConnectProposal[]>([]);
  const [receipt, setReceipt] = useState<string | null>(null);
  const drag = useRef<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    setSelected(field?.currentObject ? { kind: 'object', value: field.currentObject } : null);
    setPositions({}); setConnectSource(null); setConnectActive(false); setPendingTarget(null); setProposals([]); setReceipt(null);
  }, [field, projectId]);

  const nameFor = (id: string) => nodes.find((node) => node.id === id)?.name ?? id;
  const cancelConnect = () => { setConnectActive(false); setConnectSource(null); setPendingTarget(null); setDescriptor(''); setClassification(''); };
  const chooseNode = (node: LiveObject) => {
    if (!connectActive) { setSelected({ kind: 'object', value: node }); return; }
    if (!connectSource) { setConnectSource(node); return; }
    if (connectSource.id !== node.id) setPendingTarget(node);
  };
  const createProposal = (event: React.FormEvent) => {
    event.preventDefault();
    if (!connectSource || !pendingTarget) return;
    const proposal = createRelationConnectProposal({ projectId, participantIds: [connectSource.id, pendingTarget.id], descriptor, classification, baseCanonicalHash: canonicalHash });
    setProposals((current) => [...current, proposal]);
    setReceipt(`Relation proposal created between "${connectSource.name}" and "${pendingTarget.name}". It is pending review; no canonical relation was written.`);
    cancelConnect();
  };
  const startDrag = (event: React.PointerEvent<HTMLButtonElement>, node: LiveObject) => { drag.current = { id: node.id, x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); };
  const dragNode = (event: React.PointerEvent<HTMLButtonElement>) => { if (!drag.current) return; const item = drag.current; setPositions((current) => ({ ...current, [item.id]: { x: event.clientX - item.x, y: event.clientY - item.y } })); };

  return <section className="field-surface" aria-labelledby="field-heading" onKeyDown={(event) => { if (event.key === 'Escape') cancelConnect(); }}>
    <div className="field-heading"><div><p className="eyebrow">Project surface</p><h1 id="field-heading">Field</h1><p>Current inquiry and its bounded relation slice.</p></div><div className="field-controls" aria-label="Field view controls"><button className={mode === 'map' ? 'is-active' : ''} type="button" onClick={() => setMode('map')}>Map</button><button className={mode === 'list' ? 'is-active' : ''} type="button" onClick={() => setMode('list')}>List</button><button type="button" onClick={() => setPositions({})}>Reset layout</button><button className={connectActive ? 'is-active' : ''} type="button" disabled={nodes.length < 2} aria-pressed={connectActive} onClick={() => { if (connectActive) cancelConnect(); else { setConnectActive(true); setReceipt(null); } }}>{connectActive ? 'Cancel connect' : 'Connect'}</button></div></div>
    <p className="derived-state" role="status">Layout changes are derived display state only; canonical project records are unchanged.</p>
    {connectActive && <p className="connect-status" role="status">Connect mode: choose two objects to propose a relation. {connectSource ? `"${connectSource.name}" selected — choose a second object.` : 'Choose the first object.'} <button type="button" onClick={cancelConnect}>Cancel</button></p>}
    {receipt && <p className="connect-receipt" role="status">{receipt}</p>}
    {nodes.length === 0 ? <div className="surface-empty"><h2>No current field</h2><p>The active project has no focused object/relation slice. Workbench has not invented one.</p></div> : <div className="field-layout"><div className="field-workspace">
      {mode === 'map' ? <div className={connectActive ? 'field-map is-connecting' : 'field-map'} aria-label="Relation map">{relations.length === 0 && <p className="field-legend">No relations in the current bounded slice.</p>}{relations.map((relation) => <button key={relation.id} className="relation-hit" type="button" onClick={() => setSelected({ kind: 'relation', value: relation })} aria-label={`Inspect ${relation.classification_state} relation`}>{relation.relation_type ?? relation.classification_state}</button>)}{nodes.map((node, index) => <button key={node.id} type="button" className={`object-node ${field?.currentObject?.id === node.id ? 'is-current' : ''} ${connectSource?.id === node.id ? 'is-connect-source' : ''}`} style={{ transform: `translate(${(positions[node.id]?.x ?? 0) + (index % 3) * 220}px, ${(positions[node.id]?.y ?? 0) + Math.floor(index / 3) * 150 + 25}px)` }} onClick={() => chooseNode(node)} onPointerDown={connectActive ? undefined : (event) => startDrag(event, node)} onPointerMove={connectActive ? undefined : dragNode} onPointerUp={() => { drag.current = null; }}><span>{node.type}</span><strong dir="auto">{node.name}</strong><small>{node.lifecycle} · {node.evidence_state}</small></button>)}</div> : <ul className="relation-list" aria-label="Field relation list">{nodes.map((node) => <li key={node.id}><button type="button" className={connectSource?.id === node.id ? 'is-connect-source' : ''} onClick={() => chooseNode(node)}><span>{node.type}</span><strong dir="auto">{node.name}</strong><small>{node.lifecycle} · {node.evidence_state}</small><em>{connectActive ? 'Choose for connect' : 'Inspect object'}</em></button></li>)}{relations.map((relation) => <li key={relation.id}><button type="button" onClick={() => setSelected({ kind: 'relation', value: relation })}><span>Relation</span><strong>{relation.relation_type ?? relation.classification_state}</strong><small>{relation.participants.map(nameFor).join(' ↔ ')}</small><em>Inspect relation</em></button></li>)}</ul>}
      {proposals.length > 0 && <ul className="field-proposals" aria-label="Pending relation proposals">{proposals.map((proposal) => <li key={proposal.id}><span>Pending review</span><strong>{proposal.participantIds.map(nameFor).join(' ↔ ')}</strong>{proposal.descriptor && <small>{proposal.descriptor}</small>}</li>)}</ul>}
    </div><aside className="field-inspector" aria-live="polite" aria-label="Field inspector">{selected?.kind === 'object' ? <><p className="eyebrow">Object</p><h2 dir="auto">{selected.value.name}</h2><dl><dt>Type</dt><dd>{selected.value.type}</dd><dt>State</dt><dd>{selected.value.lifecycle}</dd><dt>Evidence</dt><dd>{selected.value.evidence_state}</dd><dt>Verification</dt><dd>{selected.value.verification_state}</dd></dl></> : selected?.kind === 'relation' ? <><p className="eyebrow">Relation</p><h2><span className="unsettled-label">{selected.value.classification_state}</span> relation</h2><dl><dt>Participants</dt><dd>{selected.value.participants.map(nameFor).join(' ↔ ')}</dd><dt>Classification</dt><dd>{selected.value.relation_type ?? 'Unsettled'}</dd><dt>Evidence</dt><dd>{selected.value.evidence_state}</dd><dt>Uncertainty</dt><dd>{selected.value.uncertainty ?? 'No uncertainty note recorded'}</dd><dt>Use</dt><dd>{selected.value.use_status}</dd><dt>Claimability</dt><dd>{selected.value.claimability}</dd></dl></> : <p>No object selected.</p>}</aside></div>}
    {pendingTarget && connectSource && <div className="connect-dialog-overlay"><div className="connect-dialog" role="dialog" aria-modal="true" aria-labelledby="connect-dialog-heading"><h2 id="connect-dialog-heading">Propose a relation</h2><p>Connect "{connectSource.name}" and "{pendingTarget.name}". This creates a pending proposal only.</p><form onSubmit={createProposal}><label htmlFor="connect-descriptor">Relation descriptor (optional)</label><input id="connect-descriptor" value={descriptor} onChange={(event) => setDescriptor(event.target.value)} autoFocus /><label htmlFor="connect-classification">Classification (optional)</label><input id="connect-classification" value={classification} onChange={(event) => setClassification(event.target.value)} /><div><button type="button" onClick={() => setPendingTarget(null)}>Cancel</button><button type="submit" className="button-primary">Create proposal</button></div></form></div></div>}
  </section>;
}
