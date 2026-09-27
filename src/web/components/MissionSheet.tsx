import { useState } from 'react';
import { buildMissionSheetPrefill, HISTORY_EXCLUSION_NOTE, type MissionDraft } from '../../core/context/missionPacket.js';
import type { AgentCapability } from '../liveTypes';

/**
 * MissionSheet (TASK-P05-01, TASK-P10-06, TEST-004, ORACLE-007).
 * Guided mission composition: four concise sections (Target/Outcome/Context/
 * Acceptance) + advanced disclosure (Agent). Prefilled from target/context —
 * never a blank prompt. Start requires at least one observable acceptance
 * criterion (inline error, edits preserved). Agents come from the live
 * capability probe; unavailable ones are disabled with a reason and setup
 * route, and the mission can remain a draft.
 */

export type { MissionDraft };

export type MissionSheetProps = {
  target: string;
  objective: string;
  /** A previously saved draft for this target; restores every field the owner typed. */
  draft?: MissionDraft | null;
  /** Live agent capabilities; null while the probe is still running. */
  agents: AgentCapability[] | null;
  /** Shown when this mission continues an existing task (revision or agent switch). */
  continuation?: string | null;
  onClose: () => void;
  /** Starts the mission; rejects with a reason to show inline (edits are kept). */
  onStart: (mission: MissionDraft & { agent: AgentCapability['id'] }) => Promise<void>;
  onDraft: (mission: MissionDraft) => void;
};

export const AGENT_LABELS: Record<AgentCapability['id'], string> = { claude: 'Claude Code', codex: 'Codex', hermes: 'Hermes' };
const SETUP_ROUTES: Record<AgentCapability['id'], string> = {
  claude: 'sign in with "claude auth login", then Refresh',
  codex: 'sign in with "codex login", then Refresh',
  hermes: 'run "hermes setup" to choose a model, then Refresh',
};

export function MissionSheet({ target, objective, draft, agents, continuation, onClose, onStart, onDraft }: MissionSheetProps) {
  const [prefill] = useState(() => draft ?? buildMissionSheetPrefill({ target, objective }));
  const [targetValue, setTargetValue] = useState(prefill.target);
  const [outcome, setOutcome] = useState(prefill.outcome);
  const [context, setContext] = useState(prefill.context);
  const [acceptance, setAcceptance] = useState<string[]>(prefill.acceptance);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [chosen, setChosen] = useState<AgentCapability['id'] | null>((draft?.agent as AgentCapability['id'] | undefined) ?? null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const available = (agents ?? []).filter((agent) => agent.level === 'available');
  const agent = chosen && available.some((candidate) => candidate.id === chosen) ? chosen : available[0]?.id ?? null;
  const hasCriterion = acceptance.some((c) => c.trim().length > 0);
  const canStart = hasCriterion && agent !== null && !starting;

  async function tryStart() {
    if (!canStart || !agent) return;
    setStarting(true);
    setStartError(null);
    try {
      await onStart({ target: targetValue, outcome, context, acceptance, agent });
    } catch (cause) {
      setStartError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setStarting(false);
    }
  }

  function saveDraft() {
    onDraft({ target: targetValue, outcome, context, acceptance, agent });
  }

  return (
    <div className="connect-dialog-overlay">
      <div
        className="connect-dialog mission-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-sheet-heading"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
        }}
      >
        <p className="card-label">Guided mission</p>
        <h2 id="mission-sheet-heading">Compose mission</h2>

        {/* SCN-RSP-05: the sheet body scrolls while the decision actions stay
            pinned as a fixed footer (compact/mobile shell, UI/layout-contracts.md). */}
        <div className="mission-body">
          {continuation && <p className="quiet" role="note">{continuation}</p>}
          <section aria-labelledby="mission-section-target">
            <h3 id="mission-section-target">Target</h3>
            <input aria-label="Target" autoFocus value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
          </section>

          <section aria-labelledby="mission-section-outcome">
            <h3 id="mission-section-outcome">Outcome</h3>
            <input aria-label="Outcome" value={outcome} placeholder="What should exist when this mission is done?" onChange={(e) => setOutcome(e.target.value)} />
          </section>

          <section aria-labelledby="mission-section-context">
            <h3 id="mission-section-context">Context</h3>
            <input aria-label="Context" value={context} onChange={(e) => setContext(e.target.value)} />
            <p className="quiet">{HISTORY_EXCLUSION_NOTE}</p>
          </section>

          <section aria-labelledby="mission-section-acceptance">
            <h3 id="mission-section-acceptance">Acceptance</h3>
            <input
              aria-label="Acceptance criterion 1"
              value={acceptance[0] ?? ''}
              placeholder="One observable criterion"
              onChange={(e) => {
                const next = [...acceptance];
                next[0] = e.target.value;
                setAcceptance(next);
              }}
            />
            {!hasCriterion && (
              <p className="quiet" role="note">
                Start needs at least one observable acceptance criterion — add one above; your edits are kept.
              </p>
            )}
          </section>

          <p className="quiet">
            {agents === null ? 'Checking which agents are available…'
              : agent ? `Runs with ${AGENT_LABELS[agent]} on a copy of the project. Nothing changes in the project until you accept the result in Review.`
                : 'No agent is available right now. You can save this mission as a draft.'}
          </p>

          <button type="button" className="text-action" onClick={() => setAdvancedOpen(true)}>
            Advanced
          </button>

          {advancedOpen && (
            <section aria-labelledby="mission-section-agent">
              <h3 id="mission-section-agent">Agent</h3>
              <select aria-label="Agent" value={agent ?? ''} onChange={(e) => setChosen((e.target.value || null) as AgentCapability['id'] | null)}>
                {agent === null && <option value="">No agent available</option>}
                {(agents ?? []).map((option) => (
                  <option key={option.id} value={option.id} disabled={option.level !== 'available'}>
                    {AGENT_LABELS[option.id]}
                  </option>
                ))}
              </select>
              {(agents ?? [])
                .filter((option) => option.level !== 'available')
                .map((option) => (
                  <p className="quiet" key={option.id}>
                    {AGENT_LABELS[option.id]} unavailable — {option.reason ?? option.level}. Setup: {SETUP_ROUTES[option.id]}
                  </p>
                ))}
            </section>
          )}

          {startError && <p className="quiet" role="alert">{startError}</p>}
        </div>

        <div className="mission-sheet-actions">
          <button type="button" className="button button-primary" disabled={!canStart} onClick={() => void tryStart()}>
            {starting ? 'Starting…' : 'Start mission'}
          </button>
          <button type="button" className="text-action" onClick={saveDraft}>
            Save as draft
          </button>
        </div>
      </div>
    </div>
  );
}
