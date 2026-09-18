/**
 * AdapterRegistry (TASK-P05-03, TEST-017, ORACLE-023, SCN-MIS-02/SCN-X-06).
 *
 * Registers agent adapters (Claude Code, Codex, Hermes) and reports truthful
 * availability. Missing vendors are a degraded state, never a failure: core
 * project continuity (canonical reading/review/manual workflows) does not
 * depend on any adapter, and unavailability is reported with probe reasons
 * and setup routes (affordance truth).
 *
 * Probe rules follow EXECUTION/AGENT_ADAPTER_BASELINES.md: availability is
 * observed via an injected probe function — never inferred from a version
 * string, and never hardcoded credentials.
 */

export type ProbeResult = {
  available: boolean;
  /** Observed probe detail: executable missing, version unresponsive, etc. */
  detail: string;
};

export type AdapterDescriptor = {
  id: string;
  label: string;
  probe: () => ProbeResult;
  /** Optional human setup hint appended to the default setup route. */
  setupHint?: string;
};

export type AdapterState = {
  id: string;
  label: string;
  available: boolean;
  reason: string | null;
  detail: string | null;
  setup_route: string | null;
};

export type AgentOption = {
  id: string;
  label: string;
  available: boolean;
  reason: string | null;
  setup_route: string | null;
};

export class AdapterRegistry {
  private readonly adapters: AdapterDescriptor[];

  constructor(adapters: AdapterDescriptor[] = []) {
    this.adapters = adapters;
  }

  /** Probe every adapter and return their truthful states. */
  states(): AdapterState[] {
    return this.adapters.map((adapter) => this.describe(adapter, adapter.probe()));
  }

  /** Truthful state for one adapter id; unknown ids are unavailable, not errors. */
  state(id: string): AdapterState {
    const adapter = this.adapters.find((a) => a.id === id);
    if (!adapter) {
      return {
        id,
        label: id,
        available: false,
        reason: `unknown adapter: ${id}`,
        detail: null,
        setup_route: 'Project settings → Agents',
      };
    }
    return this.describe(adapter, adapter.probe());
  }

  /**
   * ORACLE-023: core project continuity is adapter-independent. The registry
   * never gates canonical reading/review/manual workflows; with zero adapters
   * available, core flows remain usable and this reports true.
   */
  coreContinuity(): boolean {
    return true;
  }

  /**
   * Mission-sheet agent options (SCN-MIS-02): disabled options stay visible
   * with their probe reason and a setup route; the mission can remain a draft.
   */
  agentOptions(): AgentOption[] {
    return this.states().map((s) => ({
      id: s.id,
      label: s.label,
      available: s.available,
      reason: s.available ? null : s.reason,
      setup_route: s.available ? null : s.setup_route,
    }));
  }

  private describe(adapter: AdapterDescriptor, probe: ProbeResult): AdapterState {
    return {
      id: adapter.id,
      label: adapter.label,
      available: probe.available,
      reason: probe.available ? null : `unavailable: ${probe.detail}`,
      detail: probe.detail,
      setup_route: probe.available ? null : `Project settings → Agents${adapter.setupHint ? ` (${adapter.setupHint})` : ''}`,
    };
  }
}
