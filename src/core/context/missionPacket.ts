/**
 * Mission packet builder (TASK-P05-01, SCN-MIS-01/02, ORACLE-007).
 *
 * "Work on this" never opens a blank prompt: the sheet is prefilled from the
 * focus target and compiled context, and agent options carry truthful
 * availability (disabled + reason + setup route when unconfigured).
 *
 * This module is browser-safe (no node:fs / no yaml): the authoritative
 * server-side compile stays in ContextCompiler; here we build the prefill and
 * a deterministic packet preview for the sheet.
 */

export type MissionSheetPrefill = {
  /** Prefilled target: what this mission works on (editable). */
  target: string;
  /** Prefilled context summary: derived from the focus objective (editable). */
  context: string;
  /** Empty until the user states it (SCN-MIS-01: outcome/acceptance editable). */
  outcome: string;
  /** At least one observable criterion is required before Start (SCN-MIS-03). */
  acceptance: string[];
};

/** History is excluded by default; only bounded context enters the sheet (ORACLE-007). */
export const HISTORY_EXCLUSION_NOTE = 'Full history excluded by default — only the bounded context below is compiled.';

export function buildMissionSheetPrefill(input: { target: string; objective: string }): MissionSheetPrefill {
  return {
    target: input.target,
    context: input.objective,
    outcome: '',
    acceptance: [''],
  };
}

export type MissionDraft = {
  target: string;
  outcome: string;
  context: string;
  acceptance: string[];
  agent: string | null;
};

export type MissionPacketPreview = {
  id: string;
  mission_id: string;
  profile: string;
  budget: { target_tokens: number; hard_tokens: number; estimated_tokens: number; tier: string };
  objective: string;
  items: Array<{ ref: string; level: string; critical: boolean; text: string }>;
  expansion_handles: string[];
  metrics: { duplicate_count: number; duplicate_ratio: number };
};

/** Deterministic local estimate: ~4 chars/token, bounded, no node APIs. */
function estimateTokens(text: string): number {
  return Math.min(600, Math.ceil(text.length / 4));
}

export function buildMissionPacket(mission: MissionDraft): MissionPacketPreview {
  const objective = mission.outcome.trim() || mission.target;
  const text = mission.context.trim();
  return {
    id: `CTX-MISSION`,
    mission_id: `MIS-SHEET`,
    profile: 'maker',
    budget: {
      target_tokens: 1200,
      hard_tokens: 2600,
      estimated_tokens: estimateTokens(objective) + estimateTokens(text),
      tier: 'simple_mission',
    },
    objective,
    items: text
      ? [{ ref: 'obj:focus-target', level: 'L1', critical: true, text }]
      : [],
    expansion_handles: [],
    metrics: { duplicate_count: 0, duplicate_ratio: 0 },
  };
}

export type AgentOption = {
  id: string;
  label: string;
  available: boolean;
  /** Present when unavailable: the reason shown inline (affordance truth). */
  reason: string | null;
  /** Setup route offered next to the reason. */
  setup_route: string | null;
};

/**
 * Truthful agent availability for the sheet. The workbench demo project ships
 * with no configured providers, so the coding agent option is disabled with
 * its reason and setup route (SCN-MIS-02). When provider configuration lands,
 * this reads from the server routing config instead of a constant.
 */
export function agentOptions(): AgentOption[] {
  return [
    {
      id: 'coding-agent',
      label: 'Coding agent',
      available: false,
      reason: 'no configured provider for CODING_AGENT tier',
      setup_route: 'Project settings → Agents → configure a coding agent provider',
    },
  ];
}
