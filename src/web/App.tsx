import { useState } from 'react';
import { Field } from './surfaces/Field';
import { Flow } from './surfaces/Flow';
import { Output } from './surfaces/Output';
import { Review } from './surfaces/Review';
import { MissionSheet } from './components/MissionSheet';
import { SystemLadder, type LadderSection } from './components/SystemLadder';
import { ThemeToggle } from './components/ThemeToggle';

type View = 'FOCUS' | 'FIELD' | 'FLOW' | 'REVIEW' | 'OUTPUT';
type FocusState = 'ready' | 'blocked' | 'empty';
const views: Array<{ id: View; label: string }> = [{ id: 'FOCUS', label: 'Focus' }, { id: 'FIELD', label: 'Field' }, { id: 'FLOW', label: 'Flow' }, { id: 'REVIEW', label: 'Review' }, { id: 'OUTPUT', label: 'Output' }];

function ShellNav({ active, onSelect }: { active: View; onSelect: (view: View) => void }) {
  return <nav className="shell-nav" aria-label="Project views"><a className="brand" href="#focus" aria-label="Mozare Workbench home">MW</a><div className="nav-list">{views.map(({ id, label: text }) => <button key={id} type="button" aria-label={text} className={active === id ? 'nav-item is-active' : 'nav-item'} aria-current={active === id ? 'page' : undefined} onClick={() => onSelect(id)}><span aria-hidden="true" className="nav-mark">{text[0]}</span><span className="nav-label">{text}</span>{id === 'REVIEW' && <span className="nav-badge" aria-label="2 items need review">2</span>}</button>)}</div><button type="button" className="nav-settings" aria-label="Project settings">•••</button></nav>;
}

function Focus({ state, onWorkOnThis }: { state: FocusState; onWorkOnThis: () => void }) {
  if (state === 'empty') return <section className="empty-state" aria-labelledby="focus-heading"><p className="eyebrow">Focus</p><h1 id="focus-heading">Start with a local project</h1><p>Choose a local folder or import an existing project. Its ordinary files remain the canonical source of truth.</p><button className="button button-primary" type="button">Choose local folder</button><p className="quiet">No project is configured yet. Nothing has been created or inferred.</p></section>;
  const blocked = state === 'blocked';
  return <>
    <section className="focus-hero" aria-labelledby="focus-heading"><p className="eyebrow">Focus <span aria-hidden="true">/</span> TAROKE RIMIXER</p><h1 id="focus-heading">{blocked ? 'A repair is needed before the next mission' : 'How can the remix preserve the poem’s internal rhythm?'}</h1><div className={blocked ? 'state-line is-blocked' : 'state-line'}><span aria-hidden="true">{blocked ? '!' : '●'}</span><span>{blocked ? 'Blocked — canonical records need repair' : 'Active inquiry · Evidence is being gathered'}</span></div><p className="objective"><span>Current objective</span>Establish a reproducible listening and annotation pass for the current verse set.</p></section>
    <div className="focus-grid"><section className="focus-primary" aria-label="Current work"><article className="card next-action"><p className="card-label">{blocked ? 'Blocker' : 'Next action'}</p><h2>{blocked ? 'Repair the missing source reference' : 'Compare two rhythmic readings'}</h2><p>{blocked ? 'The source reference for the current question cannot be resolved. No mission can safely start until it is restored.' : 'Listen to the current cut beside the annotated source and identify what carries through.'}</p><button id="work-on-this" className="button button-primary" type="button" onClick={onWorkOnThis}>{blocked ? 'Open repair route' : 'Work on this'}</button></article><article className="card evidence-card"><p className="card-label">Evidence summary</p><p>3 source notes inspected · 1 rhythmic relation remains provisional</p><button className="text-action" type="button">Inspect evidence</button></article></section><aside className="focus-secondary" aria-label="Project orientation"><article className="card needs-you"><div><p className="card-label">Needs you</p><h2>2 items await review</h2></div><button className="text-action" type="button">Open review</button></article><article className="card"><p className="card-label">Latest accepted decision</p><h2>Keep the vocal trace audible</h2><p>Accepted yesterday · DEC-014</p><p className="bidi-sample" data-testid="bidi-sample" lang="fa" dir="rtl">تصمیم پذیرفته شد: <bdi className="bidi-isolate" dir="ltr">DEC-014 / src/web/App.tsx</bdi></p></article><article className="card"><p className="card-label">Latest output</p><h2>Verse 3 listening cut</h2><p>Candidate audio · verification pending</p></article></aside></div>
  </>;
}

const DEMO_LADDER_SECTIONS: LadderSection[] = [
  {
    title: 'Intent',
    lines: ['Route each operation to the cheapest capable tier:', 'deterministic work never calls a model.'],
  },
  {
    title: 'Behavior',
    lines: [
      'ModelRouter resolves a requested role to a tier and provider.',
      'Deterministic roles resolve with zero model tokens.',
      'Independent QA never reuses the implementing provider.',
    ],
  },
  {
    title: 'Architecture',
    lines: ['ModelRoutingPolicy loads tiers from the routing contract.', 'ModelRouter decides; TokenTelemetry records metrics.'],
  },
  {
    title: 'Implementation',
    lines: ['Four modules under src/core/context; HTTP surface in app.ts.'],
  },
  {
    title: 'Verification',
    lines: ['Unit + integration suites green on the candidate.'],
    log: Array.from({ length: 20000 }, (_, i) => `step diagnostic line ${i}: fixture output for laziness check`),
  },
];

const DEMO_TERMS = [
  {
    term: 'ModelRouter',
    plain_system_meaning: 'The component that decides which capability tier handles a requested operation and which configured provider runs it.',
    why_it_matters: 'Deterministic work must never burn model tokens; heavy work must escalate; QA must stay independent.',
    exact_detail: 'resolve(role, task) -> RouteDecision',
  },
];

function DemoHandoffView() {
  return (
    <section aria-label="Completed handoff">
      <p className="eyebrow">Handoff</p>
      <SystemLadder sections={DEMO_LADDER_SECTIONS} terms={DEMO_TERMS} />
    </section>
  );
}

export function App() { const input = new URLSearchParams(window.location.search).get('state'); const [focusState] = useState<FocusState>(input === 'blocked' || input === 'empty' ? input : 'ready'); const [active, setActive] = useState<View>('FOCUS'); const [missionSheetOpen, setMissionSheetOpen] = useState(false); const [missionNotice, setMissionNotice] = useState<string | null>(null); const closeMission = () => { setMissionSheetOpen(false); window.requestAnimationFrame(() => document.getElementById('work-on-this')?.focus()); }; return <div className="app-shell"><ShellNav active={active} onSelect={setActive} /><div className="shell-body"><header className="context-bar"><div className="project-context"><span className="project-dot" aria-hidden="true" /><span>TAROKE RIMIXER</span><span className="context-separator">/</span><span className="muted">Artistic research</span></div><button type="button" className="command-button" aria-label="Search project">Search <kbd>Ctrl K</kbd></button><div className="context-actions"><ThemeToggle /></div></header><main className="surface" id="focus">{active === 'FOCUS' && input === 'demo-handoff' ? <DemoHandoffView /> : active === 'FOCUS' && (missionSheetOpen || missionNotice) ? <section aria-label="Mission composition"><p className="eyebrow">Mission</p>{missionNotice && <p className="quiet">{missionNotice}</p>}{missionSheetOpen && <MissionSheet target="Compare two rhythmic readings" objective="Establish a reproducible listening and annotation pass for the current verse set." onClose={closeMission} onStart={(mission, packet) => { setMissionSheetOpen(false); setMissionNotice(`Mission started from packet ${packet.id} (${packet.budget.estimated_tokens} tokens) — deterministic compile, no model called. Target: ${mission.target}`); }} onDraft={() => setMissionNotice('Mission saved as draft — nothing started, no model called.')} />}</section> : active === 'FOCUS' ? <Focus state={focusState} onWorkOnThis={() => setMissionSheetOpen(true)} /> : active === 'FIELD' ? <Field /> : active === 'FLOW' ? <Flow /> : active === 'OUTPUT' ? <Output /> : <Review />}</main></div></div>; }
