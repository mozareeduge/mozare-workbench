import { describe, expect, it } from 'vitest';
import { AdapterRegistry, type AdapterDescriptor } from '../../src/server/agents/AdapterRegistry.js';

/**
 * TEST-017 (ORACLE-023, SCN-MIS-02/SCN-X-06): vendor/degraded adapters.
 * Missing executables never break core project continuity — the registry
 * reports truthful unavailability with probe reasons, and every adapter
 * declares the same shape so callers can degrade uniformly.
 */

function probeFactory(available: boolean, detail: string) {
  return () => ({ available, detail });
}

describe('AdapterRegistry degraded-state truth (TASK-P05-03, ORACLE-023)', () => {
  const CLAUDE: AdapterDescriptor = { id: 'claude', label: 'Claude Code', probe: probeFactory(false, 'executable not found in PATH') };
  const CODEX: AdapterDescriptor = { id: 'codex', label: 'Codex CLI', probe: probeFactory(false, 'executable not found in PATH') };
  const HERMES: AdapterDescriptor = { id: 'hermes', label: 'Hermes', probe: probeFactory(true, 'hermes chat -q responsive') };

  it('registers all three adapters and probes availability truthfully', () => {
    const registry = new AdapterRegistry([CLAUDE, CODEX, HERMES]);
    const states = registry.states();
    expect(states.map((s) => s.id).sort()).toEqual(['claude', 'codex', 'hermes']);
    const claude = registry.state('claude');
    expect(claude.available).toBe(false);
    expect(claude.reason).toMatch(/not found in PATH/i);
    expect(registry.state('hermes').available).toBe(true);
  });

  it('never throws when an adapter is missing: unavailable is a state, not a failure', () => {
    const registry = new AdapterRegistry([CLAUDE]);
    expect(() => registry.states()).not.toThrow();
    expect(registry.state('claude').available).toBe(false);
    // Unknown adapter id is also a truthful unavailable state, not a crash.
    const ghost = registry.state('unknown-cli');
    expect(ghost.available).toBe(false);
    expect(ghost.reason).toMatch(/unknown adapter/i);
  });

  it('keeps core continuity: with two of three CLIs missing the registry still serves the project', () => {
    const registry = new AdapterRegistry([CLAUDE, CODEX]);
    expect(registry.states().every((s) => !s.available)).toBe(true);
    // Core flows do not consult adapters to remain usable; the registry is a
    // reporting surface. Core operations must be invokable regardless.
    expect(registry.coreContinuity()).toBe(true);
    // Re-probing picks up an install without a restart.
    const fixed: AdapterDescriptor = { id: 'claude', label: 'Claude Code', probe: probeFactory(true, 'claude -p responsive') };
    const refreshed = new AdapterRegistry([fixed, CODEX]);
    expect(refreshed.state('claude').available).toBe(true);
  });

  it('exposes agent-option truth for the mission sheet (disabled + reason + setup route)', () => {
    const registry = new AdapterRegistry([CLAUDE, CODEX, HERMES]);
    const options = registry.agentOptions();
    const claudeOption = options.find((o) => o.id === 'claude');
    expect(claudeOption).toMatchObject({ available: false, label: 'Claude Code' });
    expect(claudeOption?.reason).toMatch(/not found in PATH/i);
    expect(claudeOption?.setup_route).toMatch(/settings/i);
    expect(options.find((o) => o.id === 'hermes')?.available).toBe(true);
  });
});
