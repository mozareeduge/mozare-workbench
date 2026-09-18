import { expect, test } from '@playwright/test';

/**
 * TEST-004 — Mission composition (ORACLE-007, SCN-MIS-01/02/03).
 * RED phase: MissionSheet does not exist yet; these assertions define it.
 */
test('TEST-004: Work on this opens a guided mission sheet prefilled from target/context, not a blank prompt', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Work on this' }).click();

  // Guided composition, not an empty prompt textarea as primary interface.
  const sheet = page.getByRole('dialog', { name: 'Compose mission' });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('textarea').first()).toHaveCount(0);

  // Four concise sections + advanced disclosure.
  for (const section of ['Target', 'Outcome', 'Context', 'Acceptance']) {
    await expect(sheet.getByRole('heading', { name: section, exact: true })).toBeVisible();
  }
  const advanced = sheet.getByRole('button', { name: 'Advanced' });
  await expect(advanced).toBeVisible();
  await expect(sheet.getByRole('heading', { name: 'Agent', exact: true })).toHaveCount(0);
  await advanced.click();
  await expect(sheet.getByRole('heading', { name: 'Agent', exact: true })).toBeVisible();

  // SCN-MIS-01: prefilled from target/context, not blank.
  await expect(sheet.getByLabel('Target')).toHaveValue(/rhythmic readings/i);
  await expect(sheet.getByLabel(/Context/i)).toHaveValue(/listening and annotation pass/i);

  // Whole history excluded by default: the context summary says so, not a dump.
  await expect(sheet.getByText(/full history excluded by default/i)).toBeVisible();

  // Outcome/acceptance are editable.
  const outcome = sheet.getByLabel('Outcome');
  await outcome.fill('A side-by-side rhythm comparison with annotated markers.');
  const acceptance = sheet.getByLabel(/Acceptance criterion 1/i);
  await acceptance.fill('Every retained verse cut aligns with the annotated source markers.');

  await page.screenshot({ path: 'test-results/TEST-004-mission-sheet.png', fullPage: true });
});

test('SCN-MIS-03: empty acceptance criterion blocks Start inline without losing edits', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Work on this' }).click();
  const sheet = page.getByRole('dialog', { name: 'Compose mission' });
  await expect(sheet).toBeVisible();

  const start = sheet.getByRole('button', { name: 'Start mission' });
  await expect(start).toBeDisabled();
  await expect(sheet.getByText(/at least one observable acceptance criterion/i)).toBeVisible();

  // Edits made before the block are preserved when the criterion is filled.
  await sheet.getByLabel('Outcome').fill('Comparison recorded with markers.');
  await sheet.getByLabel(/Acceptance criterion 1/i).fill('Markers align on all retained cuts.');
  await expect(start).toBeEnabled();
  await expect(sheet.getByLabel('Outcome')).toHaveValue(/Comparison recorded with markers\./);
});

test('SCN-MIS-02: unavailable agent is disabled with a reason and the mission can remain draft', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Work on this' }).click();
  const sheet = page.getByRole('dialog', { name: 'Compose mission' });
  await sheet.getByRole('button', { name: 'Advanced' }).click();

  // No coding agent is configured in the demo project: the option is disabled
  // with its reason visible (affordance truth), not hidden.
  const agentSelect = sheet.getByLabel('Agent');
  await expect(agentSelect).toBeVisible();
  const codingOption = agentSelect.locator('option', { hasText: 'Coding agent' });
  await expect(codingOption).toBeDisabled();
  await expect(sheet.getByText(/coding agent unavailable/i)).toBeVisible();
  await expect(sheet.getByText(/no configured provider/i)).toBeVisible();

  // The mission can remain a draft instead of being forced to start.
  await expect(sheet.getByRole('button', { name: 'Save as draft' })).toBeEnabled();
  await sheet.getByRole('button', { name: 'Save as draft' }).click();
  await expect(page.getByText(/mission saved as draft/i)).toBeVisible();
});
