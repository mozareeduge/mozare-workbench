import type { CliActivity } from '../liveTypes';

const KNOWN_LABELS: Record<string, string> = { claude: 'Claude Code', codex: 'Codex', hermes: 'Hermes', opencode: 'openCode', cursor: 'Cursor', gemini: 'Gemini' };
export const harnessLabel = (name: string | null | undefined) => (name ? KNOWN_LABELS[name] ?? name : 'unrecorded harness');
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'unknown time');

/**
 * Work done directly in Codex, Claude Code or Hermes, read from the project's own MAWS thread
 * and git history. Shown for every project, whether or not it has Workbench records.
 */
export function CliActivityPanel({ activity }: { activity: CliActivity | null }) {
  if (!activity) return null;
  const { maws, git } = activity;
  if (!maws && !git) {
    return <article className="card cli-activity"><p className="card-label">Work in your agent CLIs</p><p>This project has no MAWS thread and no git history, so there is no CLI work to show yet.</p></article>;
  }
  const counts = maws ? (['active', 'queued', 'blocked', 'done'] as const).map((status) => `${maws.items.filter((item) => item.status === status || (status === 'blocked' && item.status === 'failed')).length} ${status}`).join(' · ') : '';
  return <article className="card cli-activity" aria-label="Work in your agent CLIs">
    <p className="card-label">Work in your agent CLIs</p>
    {maws && <>
      <h2 dir="auto">{maws.title || 'Current MAWS thread'}</h2>
      <p className="quiet">MAWS thread · {maws.status}{maws.phase ? ` · ${maws.phase}` : ''} · last worked in {harnessLabel(maws.lastHarness)} · {when(maws.updatedAt)}</p>
      {maws.objective && <p dir="auto">{maws.objective}</p>}
      <p><strong>Now:</strong> {maws.activeItem ? <bdi dir="auto">{maws.activeItem.id} — {maws.activeItem.title}</bdi> : 'No item is active.'}</p>
      <p><strong>Work items:</strong> {counts}</p>
      {maws.blockers.length > 0 && <p><strong>Blocked by:</strong> <span dir="auto">{maws.blockers.join(' · ')}</span></p>}
      {maws.recentEvents.length > 0 && <details><summary>Recent activity ({maws.recentEvents.length})</summary><ul className="cli-activity-list">{maws.recentEvents.map((event, index) => <li key={`${event.at}-${index}`}><span className="cli-harness">{harnessLabel(event.harness)}</span> {when(event.at)} · {event.kind} <span dir="auto">{event.text}</span></li>)}</ul></details>}
    </>}
    {(activity.threads ?? []).filter((thread) => !thread.active && thread.status !== 'completed' && thread.items.some((item) => item.status !== 'done')).length > 0 && <details><summary>Parked phases ({(activity.threads ?? []).filter((thread) => !thread.active && thread.status !== 'completed' && thread.items.some((item) => item.status !== 'done')).length})</summary>
      <ul className="cli-activity-list">{(activity.threads ?? []).filter((thread) => !thread.active && thread.status !== 'completed' && thread.items.some((item) => item.status !== 'done')).map((thread) => <li key={thread.id}><span className="cli-harness">{harnessLabel(thread.lastHarness)}</span> {when(thread.updatedAt)} · <span dir="auto">{thread.title}</span> · {thread.items.filter((item) => item.status !== 'done').length} open item(s)</li>)}</ul>
    </details>}
    {git && <details open={!maws}><summary>Recent commits on <bdi dir="ltr">{git.branch}</bdi>{git.uncommittedFiles > 0 ? ` · ${git.uncommittedFiles} uncommitted file${git.uncommittedFiles === 1 ? '' : 's'}` : ''}</summary>
      <ul className="cli-activity-list">{git.commits.map((commit) => <li key={commit.sha}><span className="cli-harness">{commit.harness ? harnessLabel(commit.harness) : commit.author}</span> <bdi dir="ltr">{commit.sha}</bdi> {when(commit.at)} · <span dir="auto">{commit.subject}</span></li>)}</ul>
    </details>}
  </article>;
}
