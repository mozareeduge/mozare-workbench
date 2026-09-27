import { useCallback, useEffect, useRef, useState } from 'react';
import { Field } from './surfaces/Field';
import { Flow } from './surfaces/Flow';
import { Output } from './surfaces/Output';
import { Review } from './surfaces/Review';
import { AGENT_LABELS, MissionSheet } from './components/MissionSheet';
import { ThemeToggle } from './components/ThemeToggle';
import { CliActivityPanel, harnessLabel } from './components/CliActivityPanel';
import type { FlowCardDetail } from './surfaces/Flow';
import type { FlowCard } from '../core/projection/FlowProjection.js';
import type { AgentCapability, CliActivity, DiscoveredProject, ContinuitySummary, FocusProjection, LiveFlowOutcome, LiveReviewItem, View, WorkspaceProjection, WorkspaceSummary } from './liveTypes';
import type { ReviewDecisionInput } from './surfaces/Review';
import type { ArtifactFixture } from '../core/projection/OutputProjection.js';

/** Where a mission sheet was opened from; a continuation keeps the proposal's task lineage. */
type MissionIntent = { target: string; continueProposalId: string | null; note: string | null; context?: string | null };
const LIVE_POLL_MS = 4_000;

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
  </nav>;
}

function FirstUse({ busy, discovered, onAdd, onCreate, onOpen }: { busy: boolean; discovered: DiscoveredProject[]; onAdd: () => void; onCreate: () => void; onOpen: (project: DiscoveredProject) => void }) {
  const local = discovered.filter((project) => project.local).slice(0, 12);
  return <section className="empty-state" aria-labelledby="focus-heading">
    <p className="eyebrow">Focus</p>
    <h1 id="focus-heading">Start with a local project</h1>
    <p>Pick a project your agents already work in, choose any other folder, or create a new project. Opening a folder never changes it.</p>
    {local.length > 0 && <ul className="found-projects" aria-label="Projects found from your agents">{local.map((project) => <li key={project.id}><button type="button" disabled={busy} onClick={() => onOpen(project)}><strong dir="auto">{project.name}</strong><small dir="auto">{project.locationHint} · used by {project.sources.join(', ')}</small></button></li>)}</ul>}
    <div className="setup-actions"><button className="button button-primary" type="button" disabled={busy} onClick={onAdd}>Choose local folder</button><button className="button" type="button" disabled={busy} onClick={onCreate}>Create new project</button></div>
    <p className="quiet">No project is open yet. Nothing has been created or inferred.</p>
  </section>;
}

function Focus({ projection, continuity, activity, onWork, onReview }: { projection: FocusProjection; continuity: ContinuitySummary | null; activity: CliActivity | null; onWork: () => void; onReview: () => void }) {
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
        {continuity && <article className="card"><p className="card-label">Latest meaningful work</p><h2 dir="auto">{continuity.resultSummary}</h2><p>{continuity.harness} · task v{continuity.currentTaskVersion} · {continuity.status} · {continuity.evidenceState}</p><p><strong>Next:</strong> {continuity.nextAction}</p></article>}
        <CliActivityPanel activity={activity} />
      </section>
      <aside className="focus-secondary" aria-label="Project orientation">
        <article className="card needs-you"><div><p className="card-label">Needs you</p><h2>{projection.humanReviewNeed.count === 0 ? 'No review items' : `${projection.humanReviewNeed.count} item${projection.humanReviewNeed.count === 1 ? '' : 's'} await review`}</h2></div>{projection.humanReviewNeed.count > 0 && <button className="text-action" type="button" onClick={onReview}>Open review</button>}</article>
        <article className="card"><p className="card-label">Latest accepted decision</p><h2 dir="auto">{projection.latestAcceptedDecision?.name ?? 'No accepted decision in canonical records'}</h2>{projection.latestAcceptedDecision && <p><bdi className="bidi-isolate" dir="ltr">{projection.latestAcceptedDecision.id}</bdi></p>}</article>
        <article className="card"><p className="card-label">Latest output</p><h2 dir="auto">{projection.latestOutput?.name ?? 'No output in canonical records'}</h2>{projection.latestOutput && <p>{projection.latestOutput.kind} · {projection.latestOutput.verification_state}</p>}</article>
      </aside>
    </div>
  </>;
}

function SetupNeeded({ projection, activity, onWork }: { projection: WorkspaceProjection; activity: CliActivity | null; onWork: (() => void) | null }) {
  const invalid = projection.workspace.classification === 'invalid';
  return <section className="empty-state" aria-labelledby="focus-heading">
    <p className="eyebrow">Focus / <bdi dir="auto">{projection.workspace.displayName}</bdi></p>
    <h1 id="focus-heading">{invalid ? 'This project needs repair' : <bdi dir="auto">{projection.workspace.displayName}</bdi>}</h1>
    <p>{invalid ? projection.workspace.errorReceipt?.message : 'Registered read-only. Workbench shows the work your agent CLIs record here and runs new missions on a copy; it has not invented questions, decisions or outputs.'}</p>
    {!invalid && <CliActivityPanel activity={activity} />}
    {projection.orientation && <article className="card orientation-card"><p className="card-label">Safe orientation</p><p>{projection.orientation.entryCount} visible top-level entries</p>{projection.orientation.entries.length > 0 && <ul>{projection.orientation.entries.map((entry) => <li key={entry}><bdi dir="auto">{entry}</bdi></li>)}</ul>}</article>}
    <p className="quiet">Registration did not write any files into this folder.</p>
    {onWork && <div className="setup-actions"><button id="work-on-this" className="button button-primary" type="button" onClick={onWork}>Start a mission</button><p className="quiet">An agent works on a copy of this folder; nothing changes here until you accept its result in Review.</p></div>}
  </section>;
}

/**
 * Open MAWS work items from every thread in the project (active and parked) as Flow outcomes,
 * each attributed to the harness that last took it. Done items stay in the activity panel, not
 * in Accepted, because CLI completion is not your decision in Review.
 */
function mawsOutcomes(activity: CliActivity | null): LiveFlowOutcome[] {
  return (activity?.threads ?? []).flatMap((thread) => thread.items.flatMap((item): LiveFlowOutcome[] => {
    const who = item.claimedBy ?? item.createdBy ?? thread.lastHarness;
    const base = { id: `maws-${thread.id}-${item.id}`, title: `${item.id} — ${item.title}`, owner: `MAWS · ${harnessLabel(who)}${thread.active ? '' : ' · parked'}` };
    if (item.status === 'queued') return [{ ...base, runState: 'not_started' }];
    if (item.status === 'active') return [{ ...base, runState: 'in_progress' }];
    if (item.status === 'blocked' || item.status === 'failed') return [{ ...base, runState: 'in_progress', blockedBy: { reason: thread.blockers[0] ?? `Item ${item.status} in MAWS.`, routeLabel: 'Continue with an agent', routeId: base.id } }];
    return [];
  }));
}

type MissionDraftState = { target: string; outcome: string; context: string; acceptance: string[]; agent: string | null };

type CreateDraft = { token: string; name: string; kind: string; currentObjective: string };

export function App() {
  const [activeView, setActiveView] = useState<View>('FOCUS');
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [projection, setProjection] = useState<WorkspaceProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateDraft | null>(null);
  const [missionIntent, setMissionIntent] = useState<MissionIntent | null>(null);
  const [missionNotice, setMissionNotice] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentCapability[] | null>(null);
  const [reviewItems, setReviewItems] = useState<LiveReviewItem[]>([]);
  const [flowOutcomes, setFlowOutcomes] = useState<LiveFlowOutcome[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactFixture[]>([]);
  const [activity, setActivity] = useState<CliActivity | null>(null);
  const [discovered, setDiscovered] = useState<DiscoveredProject[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const requestSerial = useRef(0);
  const liveSerial = useRef(0);

  /** Review and Flow records for the active workspace; stale responses from a previous workspace are dropped. */
  const loadLive = useCallback(async (workspaceId: string) => {
    const serial = ++liveSerial.current;
    try {
      const [review, flow, output, cli] = await Promise.all([
        api<{ items: LiveReviewItem[] }>(`/api/workspaces/${encodeURIComponent(workspaceId)}/review`),
        api<{ outcomes: LiveFlowOutcome[] }>(`/api/workspaces/${encodeURIComponent(workspaceId)}/flow`),
        api<{ artifacts: ArtifactFixture[] }>(`/api/workspaces/${encodeURIComponent(workspaceId)}/artifacts`),
        api<CliActivity>(`/api/workspaces/${encodeURIComponent(workspaceId)}/activity`).catch(() => null),
      ]);
      if (serial === liveSerial.current) { setReviewItems(review.items); setFlowOutcomes(flow.outcomes); setArtifacts(output.artifacts); setActivity(cli); }
    } catch {
      if (serial === liveSerial.current) { setReviewItems([]); setFlowOutcomes([]); setArtifacts([]); setActivity(null); }
    }
  }, []);

  const loadProjection = useCallback(async (workspaceId: string) => {
    const serial = ++requestSerial.current;
    setLoading(true);
    setError(null);
    try {
      const next = await api<WorkspaceProjection>(`/api/workspaces/${encodeURIComponent(workspaceId)}/projection`);
      if (serial === requestSerial.current) { setProjection(next); void loadLive(workspaceId); }
    } catch (cause) {
      if (serial === requestSerial.current) {
        setProjection(null);
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    } finally {
      if (serial === requestSerial.current) setLoading(false);
    }
  }, [loadLive]);

  /** Projects your agent CLIs already work in; loaded in the background so the app never waits on it. */
  const loadDiscovery = useCallback(async (refresh = false) => {
    try { setDiscovered((await api<{ projects: DiscoveredProject[] }>(`/api/discovery${refresh ? '?refresh=1' : ''}`)).projects); } catch { setDiscovered([]); }
  }, []);

  const loadWorkspaces = useCallback(async (refreshDiscovery = false) => {
    setLoading(true);
    setError(null);
    void loadDiscovery(refreshDiscovery);
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
  }, [loadProjection, loadDiscovery]);

  useEffect(() => { void loadWorkspaces(); return () => { requestSerial.current += 1; }; }, [loadWorkspaces]);

  const pick = async () => {
    setNotice('A folder window has opened. Choose a folder there — if you do not see it, check your taskbar.');
    try { return await api<{ selectionToken: string }>('/api/system/pick-folder', { method: 'POST' }); } finally { setNotice(null); }
  };
  /** Adds a project found from your agents (or clones a GitHub-only one after you confirm) and opens it. */
  const addDiscovered = async (project: DiscoveredProject) => {
    if (project.workspaceId) { await switchWorkspace(project.workspaceId); return; }
    if (!project.local && !window.confirm(`Download ${project.cloudRepo} from GitHub into Documents\\Workbench Projects\\${project.name} and open it?`)) return;
    setBusy(true); setError(null);
    setNotice(project.local ? null : `Downloading ${project.cloudRepo} from GitHub…`);
    try {
      await api('/api/discovery/add', { method: 'POST', body: JSON.stringify({ id: project.id }) });
      await loadWorkspaces();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); setNotice(null); }
  };
  const onSwitcherChange = (value: string) => {
    const [kind, id] = value.split(':');
    const project = discovered.find((candidate) => candidate.id === id);
    if (kind === 'found' && project) void addDiscovered(project);
    else void switchWorkspace(value);
  };
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
    liveSerial.current += 1;
    setProjection(null);
    setReviewItems([]);
    setFlowOutcomes([]);
    setArtifacts([]);
    setActivity(null);
    setMissionIntent(null);
    setMissionNotice(null);
    setLoading(true);
    try {
      await api(`/api/workspaces/${encodeURIComponent(id)}/activate`, { method: 'POST' });
      setWorkspaces((current) => current.map((workspace) => ({ ...workspace, active: workspace.id === id })));
      await loadProjection(id);
    } catch (cause) { setLoading(false); setError(cause instanceof Error ? cause.message : String(cause)); }
  };

  const focus = projection?.focus ?? null;
  const workspaceId = projection?.workspace.id ?? null;
  const reviewCount = focus?.humanReviewNeed.count ?? 0;
  const closeMission = () => { setMissionIntent(null); window.requestAnimationFrame(() => document.getElementById('work-on-this')?.focus()); };

  const openMission = (intent: MissionIntent) => {
    setMissionNotice(null);
    setMissionIntent(intent);
    setAgents(null);
    void api<{ agents: AgentCapability[] }>(`/api/workspaces/${encodeURIComponent(workspaceId ?? '')}/missions/capabilities`)
      .then((result) => setAgents(result.agents))
      .catch(() => setAgents([]));
  };

  const draftKey = (target: string) => `mwb-draft:${workspaceId ?? ''}:${target}`;
  const readDraft = (target: string): MissionDraftState | null => {
    try { const raw = window.localStorage.getItem(draftKey(target)); return raw ? JSON.parse(raw) as MissionDraftState : null; } catch { return null; }
  };
  const startMission = async (mission: { target: string; outcome: string; context: string; acceptance: string[]; agent: AgentCapability['id']; model?: string; effort?: string }) => {
    if (!workspaceId || !missionIntent) return;
    await api(`/api/workspaces/${encodeURIComponent(workspaceId)}/missions`, {
      method: 'POST',
      body: JSON.stringify({ harness: mission.agent, target: mission.target, outcome: mission.outcome, context: mission.context, acceptance: mission.acceptance, model: mission.model, effort: mission.effort, continueProposalId: missionIntent.continueProposalId }),
    });
    try { window.localStorage.removeItem(draftKey(missionIntent.target)); } catch { /* storage unavailable */ }
    setMissionIntent(null);
    setMissionNotice(`Mission started with ${AGENT_LABELS[mission.agent]}. It works on a copy of the project; its result will appear in Review for your decision.`);
    void loadLive(workspaceId);
  };

  /** Flow card details: MAWS items show their thread, attribution and evidence; Workbench missions link to Review. */
  const describeCard = (card: FlowCard): FlowCardDetail => {
    for (const thread of activity?.threads ?? []) {
      const item = thread.items.find((candidate) => card.id === `maws-${thread.id}-${candidate.id}`);
      if (!item) continue;
      return {
        text: item.outcome || null,
        facts: [
          ['MAWS thread', `${thread.title}${thread.active ? '' : ' (parked)'}`],
          ['Status', item.status],
          ['Created by', harnessLabel(item.createdBy)],
          ['Claimed by', item.claimedBy ? harnessLabel(item.claimedBy) : 'not claimed yet'],
          ...(item.evidence.length > 0 ? [['Evidence', item.evidence.join(' · ')] as [string, string]] : []),
        ],
        actions: [{ label: 'Start a mission for this', run: () => openMission({ target: `${item.id} — ${item.title}`, continueProposalId: null, note: `From MAWS thread “${thread.title}”. You can also keep working on it directly in your CLI.`, context: item.outcome }) }],
      };
    }
    const proposals = reviewItems.filter((item) => item.taskId === card.id).sort((a, b) => b.taskVersion - a.taskVersion);
    const latest = proposals[0];
    return {
      text: latest?.effect.whatChanged ?? null,
      facts: latest ? [['Agent', harnessLabel(latest.harness)], ['Task version', String(latest.taskVersion)], ['Decision', (latest.decisionState ?? 'under_review').replace(/_/g, ' ')]] : [['Status', card.lane]],
      actions: [
        ...(latest ? [{ label: 'Open in Review', run: () => setActiveView('REVIEW') }] : []),
        { label: latest ? 'Continue with an agent' : 'Start a mission for this', run: () => openMission({ target: card.title, continueProposalId: latest?.id ?? null, note: latest ? `Continues task ${card.id} as version ${latest.taskVersion + 1}.` : null }) },
      ],
    };
  };

  const decide = async (item: LiveReviewItem, decision: ReviewDecisionInput): Promise<string> => {
    if (!workspaceId) throw new Error('No active project.');
    const result = await api<{ decision: { state: string; written: string[]; movedToResidue: string[]; mawsRecorded: boolean } }>(
      `/api/workspaces/${encodeURIComponent(workspaceId)}/review/${encodeURIComponent(item.id)}/decision`,
      { method: 'POST', body: JSON.stringify(decision) },
    );
    await loadProjection(workspaceId);
    const { written, movedToResidue } = result.decision;
    switch (decision.state) {
      case 'accepted': return `"${item.title}" accepted — ${written.length} file${written.length === 1 ? '' : 's'} written to the project${movedToResidue.length > 0 ? `, ${movedToResidue.length} moved to Workbench residue` : ''}. ${result.decision.mawsRecorded ? 'The result was recorded in the project MAWS.' : 'The result could not be recorded in the project MAWS; the accepted files remain saved.'}`;
      case 'revision_requested': return 'Revision requested — the proposal stays attached to the same proposal/mission lineage; prior evidence is preserved.';
      case 'rejected': return `"${item.title}" rejected. The record is retained for reference; canonical state is unchanged.`;
      default: return `"${item.title}" preserved as residue — retained for reference with no active authority.`;
    }
  };

  // While an agent is running, keep Flow and Review current without a manual refresh.
  const running = flowOutcomes.some((outcome) => outcome.runState === 'in_progress' && !outcome.blockedBy);
  useEffect(() => {
    if (!running || !workspaceId) return undefined;
    const timer = window.setInterval(() => { void loadProjection(workspaceId); }, LIVE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [running, workspaceId, loadProjection]);

  return <div className="app-shell">
    <ShellNav active={activeView} reviewCount={reviewCount} onSelect={setActiveView} />
    <div className="shell-body">
      <header className="context-bar">
        <div className="project-context"><span className="project-dot" aria-hidden="true" /><span><bdi dir="auto">{focus?.projectName ?? projection?.workspace.displayName ?? 'No active project'}</bdi></span>{projection && <><span className="context-separator">/</span><span className="muted">{projection.workspace.classification === 'ready' ? 'Workbench project' : projection.workspace.classification === 'invalid' ? 'needs repair' : 'CLI project · read-only'}</span></>}</div>
        <div className="workspace-controls">
          <label className="sr-only" htmlFor="workspace-switcher">Active project</label>
          <select id="workspace-switcher" value={projection?.workspace.id ?? ''} disabled={busy} onChange={(event) => onSwitcherChange(event.target.value)}>
            <option value="" disabled>{workspaces.length === 0 ? 'Choose a project' : 'Select project'}</option>
            {workspaces.length > 0 && <optgroup label="Opened in Workbench">{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.displayName}</option>)}</optgroup>}
            {discovered.some((project) => project.local && !project.workspaceId) && <optgroup label="Found from your agents (Claude Code, Codex, Hermes, MAWS)">{discovered.filter((project) => project.local && !project.workspaceId).map((project) => <option key={project.id} value={`found:${project.id}`}>{project.name} — {project.locationHint} · {project.sources.join(', ')}</option>)}</optgroup>}
            {discovered.some((project) => !project.local) && <optgroup label="On GitHub, not on this computer (downloads after you confirm)">{discovered.filter((project) => !project.local).map((project) => <option key={project.id} value={`found:${project.id}`}>{project.name} — {project.cloudRepo}</option>)}</optgroup>}
          </select>
          <button type="button" disabled={busy} onClick={() => void addProject()} title="Open any folder on this computer as a project">Add folder…</button>
          <button type="button" disabled={busy} onClick={() => void beginCreate()} title="Create a new empty project folder">New project…</button>
        </div>
        <div className="context-actions"><button type="button" className="refresh-button" disabled={loading} onClick={() => void loadWorkspaces(true)} title="Reload this project and look again for projects your agents use">Refresh</button><ThemeToggle /></div>
      </header>
      {notice && <div className="system-notice" role="status">{notice}</div>}
      {missionNotice && activeView !== 'FOCUS' && <div className="system-notice" role="status"><span>{missionNotice}</span> <button type="button" className="text-action" onClick={() => setMissionNotice(null)}>Dismiss</button></div>}
      {error && <div className="system-error" role="alert"><span>{error}</span><button type="button" onClick={() => void loadWorkspaces()}>Try again</button></div>}
      {createDraft && <div className="create-overlay"><form className="create-project" role="dialog" aria-modal="true" aria-labelledby="create-heading" onSubmit={createProject}><h2 id="create-heading">Create a project</h2><p>A new non-conflicting child folder will be created in the location you selected.</p><label>Name<input required autoFocus value={createDraft.name} onChange={(event) => setCreateDraft({ ...createDraft, name: event.target.value })} /></label><label>Kind<input required value={createDraft.kind} onChange={(event) => setCreateDraft({ ...createDraft, kind: event.target.value })} /></label><label>Current objective<textarea required value={createDraft.currentObjective} onChange={(event) => setCreateDraft({ ...createDraft, currentObjective: event.target.value })} /></label><div className="setup-actions"><button type="button" onClick={() => setCreateDraft(null)}>Cancel</button><button className="button-primary" type="submit" disabled={busy}>Create project</button></div></form></div>}
      <main className="surface" id="main-surface" tabIndex={-1}>
        {loading && !projection ? <section className="empty-state" aria-live="polite"><p className="eyebrow">Workbench</p><h1>Loading project reality…</h1></section>
          : workspaces.length === 0 ? <FirstUse busy={busy} discovered={discovered} onAdd={() => void addProject()} onCreate={() => void beginCreate()} onOpen={(project) => void addDiscovered(project)} />
            : !projection ? <section className="empty-state"><h1>Project unavailable</h1><p>Workbench could not load the selected project. Refresh or select another registered project.</p></section>
              : activeView === 'FOCUS' && !missionIntent && !missionNotice && projection.workspace.classification !== 'ready' ? <SetupNeeded projection={projection} activity={activity} onWork={projection.workspace.classification === 'needs_onboarding' ? () => openMission({ target: projection.workspace.displayName, continueProposalId: null, note: null }) : null} />
                : missionIntent ? <section aria-label="Mission composition"><p className="eyebrow">Mission</p><MissionSheet key={`${missionIntent.continueProposalId ?? ''}${missionIntent.target}`} target={missionIntent.target} objective={missionIntent.context ?? focus?.currentObjective ?? ''} draft={readDraft(missionIntent.target)} agents={agents} continuation={missionIntent.note} onClose={closeMission} onStart={startMission} onDraft={(draft) => { try { window.localStorage.setItem(draftKey(missionIntent.target), JSON.stringify(draft)); setMissionNotice('Mission saved as draft on this computer — nothing started, no model called. Opening the same work again restores it.'); } catch { setMissionNotice('This browser blocked saving the draft; nothing was started.'); } setMissionIntent(null); }} /></section>
                  : activeView === 'FOCUS' && missionNotice ? <section aria-label="Mission composition"><p className="eyebrow">Mission</p><p className="quiet" role="status">{missionNotice}</p><div className="setup-actions"><button className="button" type="button" onClick={() => setMissionNotice(null)}>Back to Focus</button><button className="button" type="button" onClick={() => { setMissionNotice(null); setActiveView('FLOW'); }}>Open Flow</button></div></section>
                    : activeView === 'FOCUS' && focus ? <Focus projection={focus} continuity={projection.continuity} activity={activity} onWork={() => openMission({ target: focus.currentQuestion?.name ?? focus.currentObjective, continueProposalId: null, note: null })} onReview={() => setActiveView('REVIEW')} />
                      : activeView === 'FIELD' ? <Field field={projection.field} canonicalHash={focus?.canonicalHash ?? ''} projectId={focus?.projectId ?? projection.workspace.id} />
                        : activeView === 'FLOW' ? <Flow describe={describeCard} outcomes={[...flowOutcomes, ...mawsOutcomes(activity)]} continuity={projection.continuity} onRoute={(card) => { const latest = reviewItems.filter((item) => item.taskId === card.id).sort((a, b) => b.taskVersion - a.taskVersion)[0]; openMission({ target: card.title, continueProposalId: latest?.id ?? null, note: latest ? `Continues task ${card.id} as version ${latest.taskVersion + 1}.` : null }); }} />
                          : activeView === 'REVIEW' ? <Review items={reviewItems} continuity={projection.continuity} onDecide={decide} onContinue={(item) => openMission({ target: item.target, continueProposalId: item.id, note: `Continues task ${item.taskId} as version ${item.taskVersion + 1}${item.revisionNote ? ` with your revision note: “${item.revisionNote}”` : ''}. You can pick a different agent under Advanced.` })} />
                            : activeView === 'OUTPUT' ? <Output artifacts={artifacts} />
                              : <SetupNeeded projection={projection} activity={activity} onWork={null} />}
      </main>
    </div>
  </div>;
}
