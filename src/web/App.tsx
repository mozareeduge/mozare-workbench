import { useCallback, useEffect, useRef, useState } from 'react';
import { Field } from './surfaces/Field';
import { Flow } from './surfaces/Flow';
import { Output } from './surfaces/Output';
import { Review } from './surfaces/Review';
import { MissionSheet } from './components/MissionSheet';
import { ThemeToggle } from './components/ThemeToggle';
import type { FocusProjection, View, WorkspaceProjection, WorkspaceSummary } from './liveTypes';

const views: Array<{ id: View; label: string }> = [
  { id: 'FOCUS', label: 'Focus' },
  { id: 'FIELD', label: 'Field' },
  { id: 'FLOW', label: 'Flow' },
  { id: 'REVIEW', label: 'Review' },
  { id: 'OUTPUT', label: 'Output' },
];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json', ...init.headers } : init?.headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string; error?: string };
    throw new Error(body.message ?? body.error ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function ShellNav({ active, reviewCount, onSelect }: { active: View; reviewCount: number; onSelect: (view: View) => void }) {
  return <nav className="shell-nav" aria-label="Project views">
    <a className="brand" href="#main-surface" aria-label="Mozare Workbench home">MW</a>
    <div className="nav-list">{views.map(({ id, label }) => <button key={id} type="button" aria-label={label} className={active === id ? 'nav-item is-active' : 'nav-item'} aria-current={active === id ? 'page' : undefined} onClick={() => onSelect(id)}><span aria-hidden="true" className="nav-mark">{label[0]}</span><span className="nav-label">{label}</span>{id === 'REVIEW' && reviewCount > 0 && <span className="nav-badge" aria-label={`${reviewCount} items need review`}>{reviewCount}</span>}</button>)}</div>
    <button type="button" className="nav-settings" aria-label="Project settings">•••</button>
  </nav>;
}

function FirstUse({ busy, onAdd, onCreate }: { busy: boolean; onAdd: () => void; onCreate: () => void }) {
  return <section className="empty-state" aria-labelledby="focus-heading">
    <p className="eyebrow">Focus</p>
    <h1 id="focus-heading">Start with a local project</h1>
    <p>Choose an existing folder to inspect without changing it, or create a new Workbench project in a location you control.</p>
    <div className="setup-actions"><button className="button button-primary" type="button" disabled={busy} onClick={onAdd}>Choose local folder</button><button className="button" type="button" disabled={busy} onClick={onCreate}>Create new project</button></div>
    <p className="quiet">No project is configured yet. Nothing has been created or inferred.</p>
  </section>;
}

function Focus({ projection, onWork, onReview }: { projection: FocusProjection; onWork: () => void; onReview: () => void }) {
  const question = projection.currentQuestion;
  return <>
    <section className="focus-hero" aria-labelledby="focus-heading">
      <p className="eyebrow">Focus <span aria-hidden="true">/</span> <bdi dir="auto">{projection.projectName}</bdi></p>
      <h1 id="focus-heading" dir="auto">{question?.name ?? projection.currentObjective}</h1>
      <div className="state-line"><span aria-hidden="true">●</span><span>{question ? `${question.lifecycle} inquiry · ${question.evidenceState} evidence` : 'Active project · no question selected'}</span></div>
      <p className="objective"><span>Current objective</span><bdi dir="auto">{projection.currentObjective}</bdi></p>
    </section>
    <div className="focus-grid">
      <section className="focus-primary" aria-label="Current work">
        <article className="card next-action"><p className="card-label">Next action</p><h2 dir="auto">{projection.nextAction.label}</h2><p>{question ? 'Open a bounded mission for the current canonical question.' : 'Define the first question when you are ready; Workbench has not invented one.'}</p>{question && <button id="work-on-this" className="button button-primary" type="button" onClick={onWork}>Work on this</button>}</article>
        <article className="card evidence-card"><p className="card-label">Evidence summary</p><p>{question ? `${question.evidenceState} evidence for the current question` : 'No focused evidence yet'}</p></article>
      </section>
      <aside className="focus-secondary" aria-label="Project orientation">
        <article className="card needs-you"><div><p className="card-label">Needs you</p><h2>{projection.humanReviewNeed.count === 0 ? 'No review items' : `${projection.humanReviewNeed.count} item${projection.humanReviewNeed.count === 1 ? '' : 's'} await review`}</h2></div>{projection.humanReviewNeed.count > 0 && <button className="text-action" type="button" onClick={onReview}>Open review</button>}</article>
        <article className="card"><p className="card-label">Latest accepted decision</p><h2 dir="auto">{projection.latestAcceptedDecision?.name ?? 'No accepted decision in canonical records'}</h2>{projection.latestAcceptedDecision && <p><bdi className="bidi-isolate" dir="ltr">{projection.latestAcceptedDecision.id}</bdi></p>}</article>
        <article className="card"><p className="card-label">Latest output</p><h2 dir="auto">{projection.latestOutput?.name ?? 'No output in canonical records'}</h2>{projection.latestOutput && <p>{projection.latestOutput.kind} · {projection.latestOutput.verification_state}</p>}</article>
      </aside>
    </div>
  </>;
}

function SetupNeeded({ projection }: { projection: WorkspaceProjection }) {
  const invalid = projection.workspace.classification === 'invalid';
  return <section className="empty-state" aria-labelledby="focus-heading">
    <p className="eyebrow">Focus / <bdi dir="auto">{projection.workspace.displayName}</bdi></p>
    <h1 id="focus-heading">{invalid ? 'This project needs repair' : 'This folder needs Workbench setup'}</h1>
    <p>{invalid ? projection.workspace.errorReceipt?.message : 'The folder is registered read-only. No canonical questions, relations, decisions, reviews, or outputs have been inferred.'}</p>
    {projection.orientation && <article className="card orientation-card"><p className="card-label">Safe orientation</p><p>{projection.orientation.entryCount} visible top-level entries</p>{projection.orientation.entries.length > 0 && <ul>{projection.orientation.entries.map((entry) => <li key={entry}><bdi dir="auto">{entry}</bdi></li>)}</ul>}</article>}
    <p className="quiet">Registration did not write any files into this folder.</p>
  </section>;
}

type CreateDraft = { token: string; name: string; kind: string; currentObjective: string };

export function App() {
  const [activeView, setActiveView] = useState<View>('FOCUS');
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [projection, setProjection] = useState<WorkspaceProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateDraft | null>(null);
  const [missionSheetOpen, setMissionSheetOpen] = useState(false);
  const [missionNotice, setMissionNotice] = useState<string | null>(null);
  const requestSerial = useRef(0);

  const loadProjection = useCallback(async (workspaceId: string) => {
    const serial = ++requestSerial.current;
    setLoading(true);
    setError(null);
    try {
      const next = await api<WorkspaceProjection>(`/api/workspaces/${encodeURIComponent(workspaceId)}/projection`);
      if (serial === requestSerial.current) setProjection(next);
    } catch (cause) {
      if (serial === requestSerial.current) {
        setProjection(null);
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    } finally {
      if (serial === requestSerial.current) setLoading(false);
    }
  }, []);

  const loadWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api<{ workspaces: WorkspaceSummary[] }>('/api/workspaces');
      setWorkspaces(result.workspaces);
      const active = result.workspaces.find((workspace) => workspace.active) ?? result.workspaces[0];
      if (active) await loadProjection(active.id);
      else { setProjection(null); setLoading(false); }
    } catch (cause) {
      setProjection(null);
      setLoading(false);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [loadProjection]);

  useEffect(() => { void loadWorkspaces(); return () => { requestSerial.current += 1; }; }, [loadWorkspaces]);

  const pick = async () => api<{ selectionToken: string }>('/api/system/pick-folder', { method: 'POST' });
  const addProject = async () => {
    setBusy(true); setError(null);
    try {
      const selected = await pick();
      const result = await api<{ workspace: WorkspaceSummary }>('/api/workspaces/register', { method: 'POST', body: JSON.stringify({ selectionToken: selected.selectionToken }) });
      await api(`/api/workspaces/${encodeURIComponent(result.workspace.id)}/activate`, { method: 'POST' });
      await loadWorkspaces();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };
  const beginCreate = async () => {
    setBusy(true); setError(null);
    try {
      const selected = await pick();
      setCreateDraft({ token: selected.selectionToken, name: '', kind: 'project', currentObjective: '' });
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };
  const createProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!createDraft) return;
    setBusy(true); setError(null);
    try {
      await api('/api/workspaces/create', { method: 'POST', body: JSON.stringify({ parentSelectionToken: createDraft.token, name: createDraft.name, kind: createDraft.kind, currentObjective: createDraft.currentObjective }) });
      setCreateDraft(null);
      await loadWorkspaces();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };
  const switchWorkspace = async (id: string) => {
    requestSerial.current += 1;
    setProjection(null);
    setMissionSheetOpen(false);
    setMissionNotice(null);
    setLoading(true);
    try {
      await api(`/api/workspaces/${encodeURIComponent(id)}/activate`, { method: 'POST' });
      setWorkspaces((current) => current.map((workspace) => ({ ...workspace, active: workspace.id === id })));
      await loadProjection(id);
    } catch (cause) { setLoading(false); setError(cause instanceof Error ? cause.message : String(cause)); }
  };

  const focus = projection?.focus ?? null;
  const reviewCount = focus?.humanReviewNeed.count ?? 0;
  const closeMission = () => { setMissionSheetOpen(false); window.requestAnimationFrame(() => document.getElementById('work-on-this')?.focus()); };

  return <div className="app-shell">
    <ShellNav active={activeView} reviewCount={reviewCount} onSelect={setActiveView} />
    <div className="shell-body">
      <header className="context-bar">
        <div className="project-context"><span className="project-dot" aria-hidden="true" /><span><bdi dir="auto">{focus?.projectName ?? projection?.workspace.displayName ?? 'No active project'}</bdi></span>{projection && <><span className="context-separator">/</span><span className="muted">{projection.workspace.classification}</span></>}</div>
        <div className="workspace-controls">
          <label className="sr-only" htmlFor="workspace-switcher">Active project</label>
          <select id="workspace-switcher" value={projection?.workspace.id ?? ''} disabled={busy || workspaces.length === 0} onChange={(event) => void switchWorkspace(event.target.value)}><option value="" disabled>Select project</option>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.displayName}</option>)}</select>
          <button type="button" disabled={busy} onClick={() => void addProject()}>Add</button>
          <button type="button" disabled={busy} onClick={() => void beginCreate()}>Create</button>
        </div>
        <div className="context-actions"><button type="button" className="refresh-button" disabled={loading} onClick={() => void loadWorkspaces()}>Refresh</button><ThemeToggle /></div>
      </header>
      {error && <div className="system-error" role="alert"><span>{error}</span><button type="button" onClick={() => void loadWorkspaces()}>Try again</button></div>}
      {createDraft && <div className="create-overlay"><form className="create-project" role="dialog" aria-modal="true" aria-labelledby="create-heading" onSubmit={createProject}><h2 id="create-heading">Create a project</h2><p>A new non-conflicting child folder will be created in the location you selected.</p><label>Name<input required autoFocus value={createDraft.name} onChange={(event) => setCreateDraft({ ...createDraft, name: event.target.value })} /></label><label>Kind<input required value={createDraft.kind} onChange={(event) => setCreateDraft({ ...createDraft, kind: event.target.value })} /></label><label>Current objective<textarea required value={createDraft.currentObjective} onChange={(event) => setCreateDraft({ ...createDraft, currentObjective: event.target.value })} /></label><div className="setup-actions"><button type="button" onClick={() => setCreateDraft(null)}>Cancel</button><button className="button-primary" type="submit" disabled={busy}>Create project</button></div></form></div>}
      <main className="surface" id="main-surface" tabIndex={-1}>
        {loading && !projection ? <section className="empty-state" aria-live="polite"><p className="eyebrow">Workbench</p><h1>Loading project reality…</h1></section>
          : workspaces.length === 0 ? <FirstUse busy={busy} onAdd={() => void addProject()} onCreate={() => void beginCreate()} />
            : !projection ? <section className="empty-state"><h1>Project unavailable</h1><p>Workbench could not load the selected project. Refresh or select another registered project.</p></section>
              : activeView === 'FOCUS' && projection.workspace.classification !== 'ready' ? <SetupNeeded projection={projection} />
                : activeView === 'FOCUS' && missionSheetOpen && focus?.currentQuestion ? <section aria-label="Mission composition"><p className="eyebrow">Mission</p><MissionSheet target={focus.currentQuestion.name} objective={focus.currentObjective} onClose={closeMission} onStart={(mission, packet) => { setMissionSheetOpen(false); setMissionNotice(`Mission started from packet ${packet.id} (${packet.budget.estimated_tokens} tokens) — deterministic compile, no model called. Target: ${mission.target}`); }} onDraft={() => { setMissionSheetOpen(false); setMissionNotice('Mission saved as draft — nothing started, no model called.'); }} /></section>
                  : activeView === 'FOCUS' && missionNotice ? <section aria-label="Mission composition"><p className="eyebrow">Mission</p><p className="quiet">{missionNotice}</p><button className="button" type="button" onClick={() => setMissionNotice(null)}>Back to Focus</button></section>
                    : activeView === 'FOCUS' && focus ? <Focus projection={focus} onWork={() => setMissionSheetOpen(true)} onReview={() => setActiveView('REVIEW')} />
                      : activeView === 'FIELD' ? <Field field={projection.field} canonicalHash={focus?.canonicalHash ?? ''} projectId={focus?.projectId ?? projection.workspace.id} />
                        : activeView === 'FLOW' ? <Flow />
                          : activeView === 'REVIEW' ? <Review />
                            : activeView === 'OUTPUT' ? <Output artifacts={projection.artifacts} />
                              : <SetupNeeded projection={projection} />}
      </main>
    </div>
  </div>;
}
