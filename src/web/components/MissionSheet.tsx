import { useState } from 'react';
import {
  agentOptions,
  buildMissionPacket,
  buildMissionSheetPrefill,
  HISTORY_EXCLUSION_NOTE,
  type AgentOption,
  type MissionDraft,
  type MissionPacketPreview,
} from '../../core/context/missionPacket.js';

/**
 * MissionSheet (TASK-P05-01, TEST-004, ORACLE-007).
 * Guided mission composition: four concise sections (Target/Outcome/Context/
 * Acceptance) + advanced disclosure (Agent). Prefilled from target/context —
 * never a blank prompt. Start requires at least one observable acceptance
 * criterion (inline error, edits preserved). Unavailable agent options are
 * disabled with a reason and a setup route; the mission can remain a draft.
 */

export type { MissionDraft };

export type MissionSheetProps = {
  target: string;
  objective: string;
  /** Receives the deterministic packet preview built from the sheet state. */
  onStart: (mission: MissionDraft, packet: MissionPacketPreview) => void;
  onDraft: (mission: MissionDraft) => void;
};

const DETERMINISTIC_CONTEXT = 'Deterministic compile: routed to NONE, zero model tokens.';

export function MissionSheet({ target, objective, onStart, onDraft }: MissionSheetProps) {
  const [prefill] = useState(() => buildMissionSheetPrefill({ target, objective }));
  const [targetValue, setTargetValue] = useState(prefill.target);
  const [outcome, setOutcome] = useState(prefill.outcome);
  const [context, setContext] = useState(prefill.context);
  const [acceptance, setAcceptance] = useState<string[]>(prefill.acceptance);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [agent, setAgent] = useState<string | null>(null);
  const [packetPreview, setPacketPreview] = useState<MissionPacketPreview | null>(null);

  const options: AgentOption[] = agentOptions();
  const hasCriterion = acceptance.some((c) => c.trim().length > 0);
  const canStart = hasCriterion;

  function tryStart() {
    if (!canStart) return;
    const mission: MissionDraft = { target: targetValue, outcome, context, acceptance, agent };
    const packet = buildMissionPacket(mission);
    setPacketPreview(packet);
    onStart(mission, packet);
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
          if (event.key === 'Escape') event.stopPropagation();
        }}
      >
        <p className="card-label">Guided mission</p>
        <h2 id="mission-sheet-heading">Compose mission</h2>

        {/* SCN-RSP-05: the sheet body scrolls while the decision actions stay
            pinned as a fixed footer (compact/mobile shell, UI/layout-contracts.md). */}
        <div className="mission-body">
          <section aria-labelledby="mission-section-target">
          <h3>Target</h3>
          <input
            aria-label="Target"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
          />
        </section>

        <section aria-labelledby="mission-section-outcome">
          <h3>Outcome</h3>
          <input
            aria-label="Outcome"
            value={outcome}
            placeholder="What should exist when this mission is done?"
            onChange={(e) => setOutcome(e.target.value)}
          />
        </section>

        <section aria-labelledby="mission-section-context">
          <h3>Context</h3>
          <input
            aria-label="Context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
          <p className="quiet">{HISTORY_EXCLUSION_NOTE}</p>
        </section>

        <section aria-labelledby="mission-section-acceptance">
          <h3>Acceptance</h3>
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

          <button type="button" className="text-action" onClick={() => setAdvancedOpen(true)}>
            Advanced
          </button>

        {advancedOpen && (
          <section aria-labelledby="mission-section-agent">
            <h3>Agent</h3>
            <select
              aria-label="Agent"
              value={agent ?? ''}
              onChange={(e) => setAgent(e.target.value || null)}
            >
              <option value="">Choose an agent</option>
              {options.map((option) => (
                <option key={option.id} value={option.available ? option.id : ''} disabled={!option.available}>
                  {option.label}
                </option>
              ))}
            </select>
            {options
              .filter((option) => !option.available)
              .map((option) => (
                <p className="quiet" key={option.id}>
                  {option.label} unavailable — {option.reason}. Setup: {option.setup_route}
                </p>
              ))}
          </section>
        )}

        {packetPreview && <p className="quiet">{DETERMINISTIC_CONTEXT} Packet {packetPreview.id} compiled ({packetPreview.budget.estimated_tokens} tokens).</p>}
        </div>

        <div className="mission-sheet-actions">
          <button type="button" className="button button-primary" disabled={!canStart} onClick={tryStart}>
            Start mission
          </button>
          <button type="button" className="text-action" onClick={saveDraft}>
            Save as draft
          </button>
        </div>
      </div>
    </div>
  );
}
