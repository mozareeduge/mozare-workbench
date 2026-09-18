import { expect, test } from '@playwright/test';

/**
 * TEST-011 — Technical translation (ORACLE-016/026, SCN-TEC-01/02/05).
 * RED phase: SystemLadder/TechnicalTerm components do not exist yet.
 */
test('TEST-011: technical output shows system behavior first, terms explained, log lazy', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?state=demo-handoff');
  const ladder = page.getByRole('region', { name: 'System view' });
  await expect(ladder).toBeVisible();

  // SCN-TEC-01: Intent/Behavior come first; implementation detail is disclosed later.
  const headings = await ladder.getByRole('heading').allTextContents();
  expect(headings[0]).toMatch(/intent/i);
  expect(headings[1]).toMatch(/behavior/i);
  for (const later of ['Implementation', 'Verification']) {
    expect(headings).toContainEqual(expect.stringMatching(new RegExp(later, 'i')));
  }
  // Summary line width bound (≤70 chars per line of the intent summary).
  const intentText = (await ladder.getByTestId('ladder-intent').textContent()) ?? '';
  for (const line of intentText.split('\n')) expect(line.length).toBeLessThanOrEqual(70);

  // SCN-TEC-02: a technical term renders as a glossary chip with plain meaning.
  const term = ladder.getByRole('button', { name: /ModelRouter/i }).first();
  await expect(term).toBeVisible();
  await term.click();
  await expect(page.getByRole('dialog', { name: /ModelRouter/i })).toBeVisible();
  await expect(page.getByText(/decides which capability tier handles/i)).toBeVisible();
  await expect(page.getByText(/why it matters/i)).toBeVisible();

  // SCN-TEC-05 / ORACLE-026: the 20k-line log stays collapsed, never streamed.
  const logDisclosure = ladder.getByRole('button', { name: /verification log/i });
  await expect(logDisclosure).toBeVisible();
  const logRegion = ladder.getByTestId('ladder-log');
  // Collapsed = truly lazy: no log content exists in the DOM until expanded.
  await expect(logRegion).toHaveCount(0);
  await logDisclosure.click();
  await expect(logRegion).toHaveCount(1);
  await expect(logRegion.getByText(/step diagnostic line/).first()).toBeVisible();
  // Main workspace stayed responsive throughout (no giant pre-rendered wall).
  await page.screenshot({ path: 'test-results/TEST-011-system-ladder.png', fullPage: true });
});
