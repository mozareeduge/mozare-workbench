import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProcessRunner, type ProcessResult } from '../../src/server/process/ProcessRunner.js';

class FakeGh extends ProcessRunner {
  override async run(command: string, args: string[], cwd: string): Promise<ProcessResult> {
    const repos = [
      { name: 'renamed-locally', nameWithOwner: 'owner/renamed-locally', updatedAt: '2026-09-01T00:00:00Z' },
      { name: 'cloud-only', nameWithOwner: 'owner/cloud-only', updatedAt: '2026-09-02T00:00:00Z' },
    ];
    return { command, args, cwd, exitCode: 0, stdout: JSON.stringify(repos), stderr: '' };
  }
}

describe('project discovery from agent CLI records', () => {
  const originalProfile = process.env.USERPROFILE;
  const originalHome = process.env.HOME;
  let home = '';
  afterEach(() => {
    process.env.USERPROFILE = originalProfile;
    process.env.HOME = originalHome;
    vi.resetModules();
    rmSync(home, { recursive: true, force: true });
  });

  it('finds projects from Claude Code, Codex and MAWS, matches GitHub by remote, and skips tool folders', async () => {
    home = mkdtempSync(join(tmpdir(), 'mwb-home-'));
    const project = (relative: string) => { const path = join(home, relative); mkdirSync(path, { recursive: true }); return path; };
    const claudeProject = project('Documents/art/poem-engine');
    mkdirSync(join(claudeProject, '.git'));
    writeFileSync(join(claudeProject, '.git', 'config'), '[remote "origin"]\n\turl = https://github.com/owner/renamed-locally.git\n', 'utf8');
    const nested = project('Documents/art/poem-engine/src/deep');
    const codexProject = project('Documents/research/thesis');
    const mawsProject = project('Documents/writing/novel');
    mkdirSync(join(mawsProject, '.maws'));
    writeFileSync(join(home, '.claude.json'), JSON.stringify({ projects: { [nested]: {}, [home]: {}, [join(home, 'Downloads')]: {} } }), 'utf8');
    mkdirSync(join(home, '.codex'));
    writeFileSync(join(home, '.codex', 'config.toml'), `[projects.'${codexProject}']\ntrust_level = "trusted"\n`, 'utf8');
    process.env.USERPROFILE = home;
    process.env.HOME = home;
    vi.resetModules();
    const { ProjectDiscovery } = await import('../../src/server/workspaces/ProjectDiscovery.js');

    const found = await new ProjectDiscovery(new FakeGh()).list(true);
    const names = found.map((item) => item.name).sort();
    // Nested working folder maps to its repository; home and Downloads are not projects (home has no MAWS).
    expect(names).toEqual(['cloud-only', 'novel', 'poem-engine', 'thesis']);
    expect(found.find((item) => item.name === 'poem-engine')).toMatchObject({ local: true, sources: ['claude', 'github'] });
    expect(found.find((item) => item.name === 'thesis')?.sources).toEqual(['codex']);
    expect(found.find((item) => item.name === 'novel')?.sources).toEqual(['maws']);
    expect(found.find((item) => item.name === 'cloud-only')).toMatchObject({ local: false, cloudRepo: 'owner/cloud-only' });
    expect(JSON.stringify(found)).not.toContain(home);
  });
});
