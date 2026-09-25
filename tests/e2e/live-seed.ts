import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { WorkLedger } from '../../src/core/continuity/WorkLedger.js';
import type { EvidenceFixture } from '../../src/core/projection/ReviewProjection.js';
import { combinedHash } from '../../src/server/missions/ProjectSnapshot.js';
import { ProposalStore, type StoredProposal } from '../../src/server/missions/ProposalStore.js';

/**
 * Test-only live records for the alpha E2E workspace: sandboxed-mission proposals, ledger runs
 * for every Flow lane, and a registered artifact set. They are written through the same stores
 * the running server reads, so the browser exercises production code paths, not fixtures in
 * render modules. Seeded decisions carry a fixed timestamp so specs can reset later decisions.
 */
export const SEED_DECISION_PREFIX = '2026-09-01T00-00-00';
const SEED_DECIDED_AT = '2026-09-01T00:00:00.000Z';
const PROJECT_ID = 'example-artistic-research';

type ProposalSeed = Pick<StoredProposal, 'title' | 'target' | 'risk' | 'highRiskPolicy' | 'createdAt' | 'effect' | 'impact' | 'architecture' | 'implementation'> & {
  key: string;
  evidence: EvidenceFixture[];
  stale?: boolean;
  systemView?: StoredProposal['systemView'];
};

const proposals: ProposalSeed[] = [
  {
    key: 'stale-apply', title: 'Transactional canonical apply for relation-connect proposals', target: 'relations/', risk: 'critical', highRiskPolicy: false, createdAt: '2026-09-14T10:00:00Z',
    effect: {
      requestedOutcome: 'Accepting a relation-connect proposal should either fully apply into canonical truth or leave the workspace exactly as it was.',
      whatChanged: 'A new relations/<id>.yaml is staged only once the workspace base is confirmed fresh.',
      whatRemainsUnresolved: 'Whether a second, independent reviewer should re-run the integration suite.',
    },
    evidence: [
      { name: 'TEST-007: stale proposal blocks accept', status: 'passed', command: 'npm run test:integration', evidence: 'Workbench run: 1 passed — directory listings byte-identical before/after.' },
      { name: 'TEST-008: transaction rollback restores prior hash', status: 'passed', command: 'npm run test:integration', evidence: 'Workbench run: 2 passed — staged file removed, hash restored.' },
    ],
    impact: { affectedTargets: ['relations/rel_new.yaml (added)'], blastRadius: 'narrow', note: 'Only ever adds a new relation record.' },
    architecture: { summary: 'A pure isProposalStale(...) predicate is shared between the apply path and the browser UI.', components: ['RelationProposal.ts', 'applyRelationConnectProposal.ts'], tradeoffs: ['Rollback is bounded to deleting what was just staged.'] },
    implementation: { files: ['relations/rel_new.yaml'], diffText: '--- a/src/core/proposals/applyRelationConnectProposal.ts\n+++ b/src/core/proposals/applyRelationConnectProposal.ts\n@@ -60,6 +60,14 @@\n+  if (isProposalStale(proposal, beforeHash)) {', logText: '$ npm run test:integration\nTest Files  2 passed (2)' },
  },
  {
    key: 'stale-descriptor', title: 'Rebase Field connect-proposal descriptor validation', target: 'objects/q_20260914_example01.md', risk: 'high', highRiskPolicy: false, createdAt: '2026-09-13T09:00:00Z', stale: true,
    effect: { requestedOutcome: 'Trim whitespace-only descriptors before they are stored.', whatChanged: 'Descriptors are normalized when the proposal is created.', whatRemainsUnresolved: 'Whether to trim proposals already in review.' },
    evidence: [{ name: 'relation-proposal.test.ts: descriptor trims to null on empty input', status: 'passed', command: 'npm run test:unit', evidence: 'Workbench run: 1 passed.' }],
    impact: { affectedTargets: ['objects/q_20260914_example01.md (modified)'], blastRadius: 'narrow', note: 'Input normalization only.' },
    architecture: { summary: 'Normalization happens once, at creation time.', components: ['RelationProposal.ts'], tradeoffs: ['In-flight proposals keep their original value.'] },
    implementation: { files: ['objects/q_20260914_example01.md'], diffText: '--- a/objects/q_20260914_example01.md\n+++ b/objects/q_20260914_example01.md\n@@ -1 +1 @@\n-old\n+new', logText: '$ npm run test:unit\nTests 6 passed (6)' },
  },
  {
    key: 'failed-log', title: 'Stream raw build log into Implementation disclosure', target: 'notes/log-view.md', risk: 'critical', highRiskPolicy: true, createdAt: '2026-09-15T11:00:00Z',
    effect: { requestedOutcome: 'Show the full raw build log without auto-expanding it on load.', whatChanged: 'The attempt opened the log automatically for large logs.', whatRemainsUnresolved: 'A collapsed-by-default viewer that still surfaces failures.' },
    evidence: [{ name: 'TEST-REV-log: 20k-line log stays collapsed on open', status: 'failed', command: 'npm run test:e2e', evidence: 'Workbench run: 1 failed — the log rendered open on initial load.' }],
    impact: { affectedTargets: ['notes/log-view.md (added)'], blastRadius: 'narrow', note: 'UI-only.' },
    architecture: { summary: 'The disclosure is a native details element.', components: ['Review.tsx'], tradeoffs: ['Auto-expanding breaks the never-auto-expand constraint.'] },
    implementation: { files: ['notes/log-view.md'], diffText: '--- a/notes/log-view.md\n+++ b/notes/log-view.md\n+open', logText: '$ npm run test:e2e\n1 failed, 0 passed' },
  },
  {
    key: 'claim-only', title: 'Add responsive breakpoint to Review evidence chips', target: 'notes/chips.md', risk: 'normal', highRiskPolicy: false, createdAt: '2026-09-12T08:00:00Z',
    effect: { requestedOutcome: 'Evidence chips reflow below 320px.', whatChanged: 'A CSS-only media query.', whatRemainsUnresolved: 'Whether queue cues need the same rule.' },
    evidence: [{ name: 'Agent note: chips reflow correctly at 320px', status: 'passed', command: null, evidence: null }],
    impact: { affectedTargets: ['notes/chips.md (added)'], blastRadius: 'narrow', note: 'CSS-only.' },
    architecture: { summary: 'One media query scoped to the evidence list.', components: ['review.css'], tradeoffs: ['Only an agent note supports it.'] },
    implementation: { files: ['notes/chips.md'], diffText: '--- a/notes/chips.md\n+++ b/notes/chips.md\n+@media', logText: 'No test runner log was attached.' },
  },
  {
    key: 'provenance', title: 'Confirm evidence provenance keeps agent claims out of Passed state', target: 'notes/provenance.md', risk: 'normal', highRiskPolicy: false, createdAt: '2026-09-16T12:00:00Z',
    effect: { requestedOutcome: 'An unobserved evidence entry never renders as Passed.', whatChanged: 'Provenance derives from observed evidence only.', whatRemainsUnresolved: 'Whether claims should be dismissible.' },
    evidence: [
      { name: 'TEST-006 positive path: observed pass renders Passed/Observed', status: 'passed', command: 'npm run test:integration', evidence: 'Workbench run: review-provenance.test.ts passed.' },
      { name: 'Agent claim: "full regression suite passed"', status: 'passed', command: null, evidence: null },
    ],
    impact: { affectedTargets: ['notes/provenance.md (added)'], blastRadius: 'narrow', note: 'Projection change only.' },
    architecture: { summary: 'Provenance is derived once, in toEvidenceRow().', components: ['ReviewProjection.ts'], tradeoffs: ['Presence of evidence is not an audit of it.'] },
    implementation: { files: ['notes/provenance.md'], diffText: '--- a/notes/provenance.md\n+++ b/notes/provenance.md\n+isObserved', logText: '$ npm run test:integration\nTests 5 passed (5)' },
    systemView: {
      intent: 'Keep every agent claim visibly separate from what Workbench itself observed, so a claim can never look like a pass.',
      behavior: 'An evidence row counts as observed only when Workbench recorded it; anything the agent reports is labelled Claimed.',
      architecture: ['ReviewProjection decides provenance once; the Review screen only renders it.'],
      implementation: ['toEvidenceRow() derives provenance from recorded evidence.'],
      verification: ['review-provenance.test.ts passed in a Workbench run.'],
      terms: [{ term: 'ReviewProjection', plain_system_meaning: 'The part of Workbench that decides how each proposal is summarized for your decision.', why_it_matters: 'It is the single place that decides whether evidence counts as observed.', exact_detail: 'toEvidenceRow(fixture) -> EvidenceRow' }],
    },
  },
];

function record(ledger: WorkLedger, fields: { runId: string; taskId: string; harness: 'codex' | 'claude' | 'hermes'; status: 'running' | 'parked' | 'completed'; summary: string; blockers?: string[] }) {
  ledger.append({
    runId: fields.runId, projectId: PROJECT_ID, missionId: `mission-${fields.taskId}`, taskId: fields.taskId, taskVersion: 1, supersedesRunId: null,
    harness: fields.harness, model: null, effort: null, capabilitySnapshotRef: '.mozare-run/capability.json', contextPackRef: '.mozare-run/context-pack.json',
    contextSnapshotRef: null, authorityRefs: ['AUTHORITY/08'], oracleRefs: ['ORACLE-007'], candidateBefore: null, candidateAfter: null,
    status: fields.status, resultSummary: fields.summary, changedRefs: [], evidenceRefs: [], decisions: [], blockers: fields.blockers ?? [],
    remaining: [], nextAction: 'Review the proposal.', handoffRef: null, operatorRole: 'agent', startedAt: '2026-09-20T08:00:00Z', endedAt: fields.status === 'running' ? null : '2026-09-20T08:10:00Z',
  });
}

export function seedAlpha(runtime: string, workspaceId: string, projectRoot: string, ledger: WorkLedger): void {
  const store = new ProposalStore(join(runtime, 'proposals'));
  const save = (seed: ProposalSeed, taskId: string, runId: string) => {
    const sandbox = join(runtime, 'missions', workspaceId, runId, 'sandbox');
    for (const file of seed.implementation.files) {
      mkdirSync(join(sandbox, file, '..'), { recursive: true });
      writeFileSync(join(sandbox, file), `Proposed content for ${seed.title}\n`, 'utf8');
    }
    const baseHashes = Object.fromEntries(seed.implementation.files.map((file) => [file, seed.stale ? 'hash-before-owner-edit' : null]));
    store.save({
      ...seed, id: `prp_${seed.key}`, workspaceId, runId, missionId: `mission-${taskId}`, taskId, taskVersion: 1, harness: 'codex', objective: seed.effect.requestedOutcome,
      projectId: PROJECT_ID, baseCanonicalHash: combinedHash(baseHashes), changes: seed.implementation.files.map((path) => ({ path, kind: seed.stale ? 'modified' : 'added' })),
      baseHashes, sandbox, systemView: seed.systemView ?? null,
    });
  };
  for (const seed of proposals) save(seed, `task-${seed.key}`, `run-seed-${seed.key}`);

  // Flow lanes: Ready (revision requested), Active (running), Blocked (parked), Review (awaiting decision), Accepted (owner accepted).
  const flow: Array<{ key: string; title: string; status: 'running' | 'parked' | 'completed'; decision?: 'accepted' | 'revision_requested'; blocker?: string }> = [
    { key: 'flow-ready', title: 'Draft the rhythm comparison brief', status: 'completed', decision: 'revision_requested' },
    { key: 'flow-active', title: 'Rhythm comparison pass v2', status: 'running' },
    { key: 'flow-blocked', title: 'Publish verse 3 remix candidate', status: 'parked', blocker: 'Source reference for the verse 3 annotation could not be resolved.' },
    { key: 'flow-review', title: 'Verse 3 listening cut render', status: 'completed' },
    { key: 'flow-accepted', title: 'Keep the vocal trace audible', status: 'completed', decision: 'accepted' },
  ];
  for (const item of flow) {
    const runId = `run-seed-${item.key}`;
    record(ledger, { runId, taskId: `task-${item.key}`, harness: 'codex', status: item.status, summary: item.title, blockers: item.blocker ? [item.blocker] : [] });
    if (item.status !== 'completed') continue;
    save({
      key: item.key, title: item.title, target: item.title, risk: 'normal', highRiskPolicy: false, createdAt: '2026-09-10T08:00:00Z',
      effect: { requestedOutcome: item.title, whatChanged: `${item.title} (1 added file).`, whatRemainsUnresolved: 'Nothing recorded.' },
      evidence: [{ name: 'The agent reported no verification for this run', status: 'not_run', command: null, evidence: null }],
      impact: { affectedTargets: [`notes/${item.key}.md (added)`], blastRadius: 'narrow', note: 'Nothing has been written to the project.' },
      architecture: { summary: 'Not described.', components: [], tradeoffs: [] },
      implementation: { files: [`notes/${item.key}.md`], diffText: `--- a/notes/${item.key}.md\n+++ b/notes/${item.key}.md\n+draft`, logText: 'Ran through codex in a sandbox copy.' },
    }, `task-${item.key}`, runId);
    if (item.decision) {
      const directory = join(runtime, 'proposals', workspaceId, `prp_${item.key}.decisions`);
      mkdirSync(directory, { recursive: true });
      writeFileSync(join(directory, `${SEED_DECISION_PREFIX}-000Z.json`), JSON.stringify({
        proposalId: `prp_${item.key}`, state: item.decision, rationale: null, revisionNote: item.decision === 'revision_requested' ? 'Tighten the brief.' : null,
        decidedAt: SEED_DECIDED_AT, applied: item.decision === 'accepted' ? { written: [`notes/${item.key}.md`], movedToResidue: [] } : null,
      }), 'utf8');
    }
  }

  // Registered artifacts: every medium, inside the project, plus the seed's out-of-project prototype ref.
  const artifacts = join(projectRoot, 'artifacts');
  const files: Record<string, string> = {
    'mission-record.json': '{\n  "id": "mission_alpha",\n  "title": "Rhythm comparison pass v2",\n  "status": "in_progress"\n}\n',
    'comparison-report.html': '<!doctype html><html><head><meta charset="utf-8"><title>Report</title></head><body><h1>Verse 3 comparison report</h1></body></html>',
    'waveform.svg': "<svg xmlns='http://www.w3.org/2000/svg' width='320' height='120'><rect width='320' height='120' fill='#dce8e4'/><path d='M0 60 L80 20 L160 100 L240 40 L320 60' stroke='#315f58' stroke-width='4' fill='none'/></svg>",
    'annotation-notes.txt': 'Verse 3 cut: rhythmic markers align with the source through bar 12; divergence begins at bar 13.\n',
    'external-sample.html': "<!doctype html><html><head><meta charset='utf-8'></head><body><p>Sandbox verification sample.</p><script>try { window.parent.document.title = 'HOSTILE-OVERWRITE'; } catch (e) {} try { window.top.location = 'https://example.invalid/'; } catch (e) {} document.title = 'inside-sandboxed-iframe';</script></body></html>",
    'alpha-installer.bin': 'MZ-binary-placeholder',
  };
  for (const [name, content] of Object.entries(files)) writeFileSync(join(artifacts, name), content, 'utf8');
  writeFileSync(join(artifacts, 'registry.yaml'), `artifacts:
  - { id: art_20260914_example01, name: Interaction reference prototype, kind: html, ref: ../../prototype/index.html, canonicality: generated, verification_state: partial }
  - { id: art_alpha_record, name: Alpha mission record, kind: json, ref: mission-record.json, canonicality: canonical, verification_state: verified }
  - { id: art_alpha_report, name: Verse 3 comparison report, kind: html, ref: comparison-report.html, canonicality: generated, verification_state: verified }
  - { id: art_alpha_waveform, name: Verse 3 waveform still, kind: image, ref: waveform.svg, canonicality: generated, verification_state: verified }
  - { id: art_alpha_notes, name: Annotation notes — verse 3 cut, kind: text, ref: annotation-notes.txt, canonicality: generated, verification_state: verified }
  - { id: art_alpha_external, name: External HTML sample (sandbox verification), kind: html, ref: external-sample.html, canonicality: external, verification_state: unverified }
  - { id: art_alpha_installer, name: Alpha installer, kind: binary, ref: alpha-installer.bin, canonicality: generated, verification_state: unverified }
  - { id: art_alpha_render, name: Verse 3 remix candidate render, kind: video, ref: missing-render.mp4, canonicality: generated, verification_state: failed }
`, 'utf8');
}
