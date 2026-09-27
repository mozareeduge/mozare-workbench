import { expect, test, type Page } from '@playwright/test';
import { resetAlpha } from './live-reset';

/**
 * TEST-004 — Mission composition (ORACLE-007, SCN-MIS-01/02/03), on the live workspace.
 * Agent availability comes from the capability API; it is stubbed here so the browser test
 * never launches a real agent CLI (real runs are covered by the mission integration test).
 */
const QUESTION = 'How can this relation become an operational design experiment?';

async function stubAgents(page: Page, claude: 'available' | 'unavailable' = 'available') {
  await page.route('**/api/workspaces/*/missions/capabilities', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ agents: [
      { id: 'claude', level: claude, version: claude === 'available' ? '2.1.278' : null, reason: claude === 'available' ? null : 'not signed in' },
      { id: 'codex', level: 'available', version: '0.155.1', reason: null },
      { id: 'hermes', level: 'available', version: '0.20.6', reason: null },
    ] }),
  }));
}

async function openSheet(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Work on this' }).click();
  const sheet = page.getByRole('dialog', { name: 'Compose mission' });
  await expect(sheet).toBeVisible();
  return sheet;
}

test.beforeEach(async ({ request }) => { await resetAlpha(request); });

test('TEST-004: Work on this opens a guided mission sheet prefilled from target/context, not a blank prompt', async ({ page }) => {
  await stubAgents(page);
  const sheet = await openSheet(page);
  await expect(sheet.locator('textarea').first()).toHaveCount(0);
  for (const section of ['Target', 'Outcome', 'Context', 'Acceptance']) {
    await expect(sheet.getByRole('heading', { name: section, exact: true })).toBeVisible();
  }
  const advanced = sheet.getByRole('button', { name: 'Advanced' });
  await expect(sheet.getByRole('heading', { name: 'Agent', exact: true })).toHaveCount(0);
  await advanced.click();
  await expect(sheet.getByRole('heading', { name: 'Agent', exact: true })).toBeVisible();

  // SCN-MIS-01: prefilled from the live current question and objective.
  await expect(sheet.getByRole('textbox', { name: 'Target' })).toHaveValue(QUESTION);
  await expect(sheet.getByRole('textbox', { name: 'Context' })).toHaveValue(/testable design operation/i);
  await expect(sheet.getByText(/full history excluded by default/i)).toBeVisible();
  await expect(sheet.getByText(/on a copy of the project/i)).toBeVisible();
  await page.screenshot({ path: 'test-results/TEST-004-mission-sheet.png', fullPage: true });
});

test('SCN-MIS-03: empty acceptance criterion blocks Start inline without losing edits', async ({ page }) => {
  await stubAgents(page);
  const sheet = await openSheet(page);
  const start = sheet.getByRole('button', { name: 'Start mission' });
  await expect(start).toBeDisabled();
  await expect(sheet.getByText(/at least one observable acceptance criterion/i)).toBeVisible();
  await sheet.getByRole('textbox', { name: 'Outcome' }).fill('Comparison recorded with markers.');
  await sheet.getByRole('textbox', { name: /Acceptance criterion 1/i }).fill('Markers align on all retained cuts.');
  await expect(start).toBeEnabled();
  await expect(sheet.getByRole('textbox', { name: 'Outcome' })).toHaveValue(/Comparison recorded with markers\./);
});

test('SCN-MIS-02: unavailable agent is disabled with a reason and the mission can remain draft', async ({ page }) => {
  await stubAgents(page, 'unavailable');
  const sheet = await openSheet(page);
  await sheet.getByRole('button', { name: 'Advanced' }).click();
  const agentSelect = sheet.getByRole('combobox', { name: 'Agent' });
  await expect(agentSelect.locator('option', { hasText: 'Claude Code' })).toBeDisabled();
  await expect(sheet.getByText(/claude code unavailable — not signed in/i)).toBeVisible();
  await expect(sheet.getByText(/claude auth login/i)).toBeVisible();
  await expect(agentSelect).toHaveValue('codex');
  await sheet.getByRole('button', { name: 'Save as draft' }).click();
  await expect(page.getByText(/mission saved as draft/i)).toBeVisible();
});

test('Start sends the mission to the chosen agent and says the project stays unchanged until Review', async ({ page }) => {
  await stubAgents(page);
  let sent: Record<string, unknown> | null = null;
  await page.route('**/api/workspaces/*/missions', async (route) => {
    sent = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ mission: { runId: 'run-x', missionId: 'm', taskId: 't', taskVersion: 1, harness: 'hermes' } }) });
  });
  const sheet = await openSheet(page);
  await sheet.getByRole('button', { name: 'Advanced' }).click();
  await sheet.getByRole('combobox', { name: 'Agent' }).selectOption('hermes');
  await sheet.getByRole('textbox', { name: /Acceptance criterion 1/i }).fill('The question names one testable operation.');
  await sheet.getByRole('button', { name: 'Start mission' }).click();
  await expect(page.getByText(/mission started with hermes/i)).toBeVisible();
  await expect(page.getByText(/result will appear in review/i)).toBeVisible();
  expect(sent).toMatchObject({ harness: 'hermes', target: QUESTION, acceptance: ['The question names one testable operation.'], continueProposalId: null });
});

test('A registered folder without Workbench records can still receive a mission, read-only until Review', async ({ page }) => {
  await stubAgents(page);
  await page.route('**/api/workspaces/*/projection', async (route) => {
    const live = await (await route.fetch()).json();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...live, focus: null, field: null, orientation: { label: 'wiki', entryCount: 2, entries: ['00-system', 'README.md'] }, workspace: { ...live.workspace, displayName: 'wiki', classification: 'needs_onboarding' } }) });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'wiki' })).toBeVisible();
  await expect(page.getByText(/registered read-only/i)).toBeVisible();
  await page.getByRole('button', { name: 'Start a mission' }).click();
  const sheet = page.getByRole('dialog', { name: 'Compose mission' });
  await expect(sheet.getByRole('textbox', { name: 'Target' })).toHaveValue('wiki');
  await expect(sheet.getByText(/on a copy of the project/i)).toBeVisible();
});
