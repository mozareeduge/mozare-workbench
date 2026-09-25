import { expect, test } from '@playwright/test';
import { openProvenanceLadder } from './live-ladder';
import { resetAlpha } from './live-reset';

/**
 * TEST-011 — Technical translation (ORACLE-016/026, SCN-TEC-01/02/05), on a live proposal:
 * the agent's handoff system view is shown behavior-first in Review, terms are explained,
 * and the run log stays collapsed and lazy.
 */
test.beforeEach(async ({ request }) => { await resetAlpha(request); });

test('TEST-011: technical output shows system behavior first, terms explained, log lazy', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const ladder = await openProvenanceLadder(page);

  const headings = await ladder.getByRole('heading').allTextContents();
  expect(headings[0]).toMatch(/intent/i);
  expect(headings[1]).toMatch(/behavior/i);
  for (const later of ['Implementation', 'Verification']) {
    expect(headings).toContainEqual(expect.stringMatching(new RegExp(later, 'i')));
  }
  const intentText = (await ladder.getByTestId('ladder-intent').textContent()) ?? '';
  for (const line of intentText.split('\n')) expect(line.length).toBeLessThanOrEqual(70);

  const term = ladder.getByRole('button', { name: /ReviewProjection/i }).first();
  await expect(term).toBeVisible();
  await term.click();
  await expect(page.getByRole('dialog', { name: /ReviewProjection/i })).toBeVisible();
  await expect(page.getByText(/decides how each proposal is summarized/i)).toBeVisible();
  await expect(page.getByText(/why it matters/i)).toBeVisible();

  const logDisclosure = ladder.getByRole('button', { name: /verification log/i });
  await expect(logDisclosure).toBeVisible();
  const logRegion = ladder.getByTestId('ladder-log');
  await expect(logRegion).toHaveCount(0);
  await logDisclosure.click();
  await expect(logRegion).toHaveCount(1);
  await expect(logRegion).toContainText('Tests 5 passed');
  await page.screenshot({ path: 'test-results/TEST-011-system-ladder.png', fullPage: true });
});
