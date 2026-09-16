import { useRef, useState } from 'react';
import { createRelationConnectProposal, isProposalStale, type RelationConnectProposal } from '../../core/proposals/RelationProposal.js';

/**
 * Field stays fixture/demo data in Phase 1 (DEC-031a — real WorkspaceEngine
 * wiring is TASK-P09-02's job). This constant stands in for "the canonical hash
 * of the workspace Field's demo objects were proposed against" so the connect
 * flow can exercise the same optimistic-concurrency shape (createRelationConnectProposal
 * + isProposalStale) that the real transactional apply
 * (src/core/proposals/applyRelationConnectProposal.ts) uses against a real
 * canonical workspace. It never changes here, so the demo's Accept action is
 * always fresh — the stale/disabled rendering path exists and is driven by the
 * same shared predicate, it just isn't reachable from this static demo data.
 */
const DEMO_BASE_CANONICAL_HASH = 'demo-fixture-base-hash-v1';

type Node = { id: string; type: string; title: string; state: string };
const nodes: Node[] = [
  { id: 'q_20260914_example01', type: 'Question', title: 'How can this relation become an operational design experiment?', state: 'Current · candidate evidence' },
  { id: 'src_20260914_example01', type: 'Source', title: 'Primary source fragment', state: 'Verified evidence' },
];
const relation = { id: 'rel_20260914_example01', participants: ['How can this relation become an operational design experiment?', 'Primary source fragment'], classification: 'Unsettled', statement: 'No relation type has been accepted.', evidence: 'Primary source fragment', uncertainty: 'The source is relevant, but the exact design implication remains unsettled.', use: 'Exploratory · design research', history: 'No recorded history events' };

type ConnectState = { active: boolean; source: Node | null };
type PendingConnection = { source: Node; target: Node };

export function Field() {
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [selected, setSelected] = useState<{ kind: 'object'; value: Node } | { kind: 'relation'; value: typeof relation }>({ kind: 'object', value: nodes[0] });
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const drag = useRef<{ id: string; x: number; y: number } | null>(null);
  const [connect, setConnect] = useState<ConnectState>({ active: false, source: null });
  const [pending, setPending] = useState<PendingConnection | null>(null);
  const [descriptor, setDescriptor] = useState('');
  const [classification, setClassification] = useState('');
  const [proposals, setProposals] = useState<RelationConnectProposal[]>([]);
  const [acceptedProposalIds, setAcceptedProposalIds] = useState<string[]>([]);
  const [receipt, setReceipt] = useState<string | null>(null);

  const openObject = (node: Node) => setSelected({ kind: 'object', value: node });
  const startDrag = (event: React.PointerEvent<HTMLButtonElement>, node: Node) => { drag.current = { id: node.id, x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); };
  const dragNode = (event: React.PointerEvent<HTMLButtonElement>) => { if (!drag.current) return; const item = drag.current; setPositions((old) => ({ ...old, [item.id]: { x: event.clientX - item.x, y: event.clientY - item.y } })); };
  const stopDrag = () => { drag.current = null; };

  const toggleConnect = () => { setConnect((current) => (current.active ? { active: false, source: null } : { active: true, source: null })); setReceipt(null); };
  const cancelConnect = () => { setConnect({ active: false, source: null }); setPending(null); setDescriptor(''); setClassification(''); };
  const clickNode = (node: Node) => {
    if (!connect.active) { openObject(node); return; }
    if (!connect.source) { setConnect({ active: true, source: node }); return; }
    if (connect.source.id === node.id) return;
    setPending({ source: connect.source, target: node });
  };
  const confirmConnect = (event: React.FormEvent) => {
    event.preventDefault();
    if (!pending) return;
    const proposal = createRelationConnectProposal({ projectId: 'workspace', participantIds: [pending.source.id, pending.target.id], descriptor, classification, baseCanonicalHash: DEMO_BASE_CANONICAL_HASH });
    setProposals((old) => [...old, proposal]);
    setReceipt(`Relation proposal created between "${pending.source.title}" and "${pending.target.title}". It is pending review; no canonical relation was written.`);
    setPending(null); setDescriptor(''); setClassification(''); setConnect({ active: false, source: null });
  };
  const acceptProposal = (proposal: RelationConnectProposal) => {
    if (isProposalStale(proposal, DEMO_BASE_CANONICAL_HASH)) return; // Accept stays disabled while stale; nothing to apply
    setAcceptedProposalIds((old) => (old.includes(proposal.id) ? old : [...old, proposal.id]));
    setReceipt(`Relation proposal between "${nodes.find((node) => node.id === proposal.participantIds[0])?.title}" and "${nodes.find((node) => node.id === proposal.participantIds[1])?.title}" was accepted.`);
  };
  const onSurfaceKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    if (pending) { setPending(null); return; }
    if (connect.active) cancelConnect();
  };

  return <section className="field-surface" aria-labelledby="field-heading" onKeyDown={onSurfaceKeyDown}>
    <div className="field-heading"><div><p className="eyebrow">Project surface</p><h1 id="field-heading">Field</h1><p>Current inquiry and its bounded relation slice.</p></div><div className="field-controls" aria-label="Field view controls"><button className={mode === 'map' ? 'is-active' : ''} type="button" onClick={() => setMode('map')}>Map</button><button className={mode === 'list' ? 'is-active' : ''} type="button" onClick={() => setMode('list')}>List</button><button type="button" onClick={() => setPositions({})}>Reset layout</button><button className={connect.active ? 'is-active' : ''} type="button" aria-pressed={connect.active} onClick={toggleConnect}>{connect.active ? 'Cancel connect' : 'Connect'}</button></div></div>
    <p className="derived-state" role="status">Layout changes are derived display state only; canonical project records are unchanged.</p>
    {connect.active && <p className="connect-status" role="status">Connect mode: choose two objects to propose a relation. {connect.source ? `"${connect.source.title}" selected — choose a second object.` : 'Choose the first object.'} <button type="button" onClick={cancelConnect}>Cancel</button></p>}
    {receipt && <p className="connect-receipt" role="status">{receipt}</p>}
    <div className="field-layout"><div className="field-workspace">
      {mode === 'map' ? <div className={connect.active ? 'field-map is-connecting' : 'field-map'} aria-label="Relation map"><p className="field-legend"><span className="dash" aria-hidden="true" /> Unsettled relation — classification has not been inferred</p><div className="relation-line" aria-hidden="true" /><button className="relation-hit" type="button" onClick={() => setSelected({ kind: 'relation', value: relation })} aria-label="Inspect unsettled relation">Unsettled</button>{nodes.map((node, index) => <button key={node.id} type="button" className={`object-node ${node.id === nodes[0].id ? 'is-current' : ''} ${connect.source?.id === node.id ? 'is-connect-source' : ''}`} style={{ transform: `translate(${(positions[node.id]?.x ?? 0) + index * 255}px, ${(positions[node.id]?.y ?? 0) + (index ? 150 : 25)}px)` }} onClick={() => clickNode(node)} onPointerDown={connect.active ? undefined : (event) => startDrag(event, node)} onPointerMove={connect.active ? undefined : dragNode} onPointerUp={connect.active ? undefined : stopDrag}><span>{node.type}</span><strong>{node.title}</strong><small>{node.state}</small></button>)}</div> : <ul className="relation-list" aria-label="Field relation list">{nodes.map((node) => <li key={node.id}><button type="button" className={connect.source?.id === node.id ? 'is-connect-source' : ''} onClick={() => clickNode(node)}><span>{node.type}</span><strong>{node.title}</strong><small>{node.state}</small><em>{connect.active ? 'Choose for connect' : 'Inspect object'}</em></button></li>)}<li><button type="button" onClick={() => setSelected({ kind: 'relation', value: relation })}><span>Relation</span><strong>Unsettled relation</strong><small>{relation.participants.join(' ↔ ')}</small><em>Inspect relation</em></button></li></ul>}
      {proposals.length > 0 && <ul className="field-proposals" aria-label="Pending relation proposals">{proposals.map((proposal) => {
        const accepted = acceptedProposalIds.includes(proposal.id);
        const stale = isProposalStale(proposal, DEMO_BASE_CANONICAL_HASH);
        return <li key={proposal.id}>
          <span>{accepted ? 'Accepted' : 'Pending review'}</span>
          <strong>{nodes.find((node) => node.id === proposal.participantIds[0])?.title} ↔ {nodes.find((node) => node.id === proposal.participantIds[1])?.title}</strong>
          {proposal.descriptor && <small>{proposal.descriptor}</small>}
          {!accepted && <div className="proposal-actions">
            <button type="button" className="button-primary" disabled={stale} onClick={() => acceptProposal(proposal)}>Accept</button>
            {stale && <p className="proposal-stale-warning" role="status">This proposal's base canonical state changed since it was created (expected base {proposal.baseCanonicalHash}, current base {DEMO_BASE_CANONICAL_HASH}). Re-evaluate or rebase before accepting.</p>}
          </div>}
        </li>;
      })}</ul>}
    </div><aside className="field-inspector" aria-live="polite" aria-label="Field inspector">{selected.kind === 'object' ? <><p className="eyebrow">Object</p><h2>{selected.value.title}</h2><dl><dt>Type</dt><dd>{selected.value.type}</dd><dt>State</dt><dd>{selected.value.state}</dd></dl></> : <><p className="eyebrow">Relation</p><h2><span className="unsettled-label">Unsettled</span> relation</h2><dl><dt>Participants</dt><dd>{relation.participants.join(' ↔ ')}</dd><dt>Classification</dt><dd>Unsettled</dd><dt>Relation statement</dt><dd>{relation.statement}</dd><dt>Evidence for</dt><dd>{relation.evidence}</dd><dt>Uncertainty</dt><dd>{relation.uncertainty}</dd><dt>Use</dt><dd>{relation.use}</dd><dt>History</dt><dd>{relation.history}</dd></dl></>}</aside></div>
    {pending && <div className="connect-dialog-overlay"><div className="connect-dialog" role="dialog" aria-modal="true" aria-labelledby="connect-dialog-heading" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); setPending(null); } }}>
      <h2 id="connect-dialog-heading">Propose a relation</h2>
      <p>Connect "{pending.source.title}" and "{pending.target.title}". This creates a relation proposal for review; it does not write a canonical relation.</p>
      <form onSubmit={confirmConnect}>
        <label htmlFor="connect-descriptor">Relation descriptor (optional)</label>
        <input id="connect-descriptor" type="text" value={descriptor} onChange={(event) => setDescriptor(event.target.value)} autoFocus />
        <label htmlFor="connect-classification">Classification (optional)</label>
        <input id="connect-classification" type="text" value={classification} onChange={(event) => setClassification(event.target.value)} />
        <div className="connect-dialog-actions"><button type="button" onClick={() => setPending(null)}>Cancel</button><button type="submit" className="button-primary">Create proposal</button></div>
      </form>
    </div></div>}
  </section>;
}
