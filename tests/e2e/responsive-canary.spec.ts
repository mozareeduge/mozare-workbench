import { expect, test } from '@playwright/test';

/**
 * TEST-000 sanity pattern for TASK-P08-01 · TEST-014:
 * prove the reflow assertions can fail. A disposable fixed-width canary is
 * injected, the overflow assertion must turn RED against it, and removing the
 * canary must restore the PASS state. This file is a harness guard: it stays
 * green on a healthy tree while demonstrating that the reflow check detects
 * injected fixed-width regressions.
 */
test('canary: a fixed-width injection turns the reflow assertion RED, restoring turns it green', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  const overflowPx = () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  expect(await overflowPx(), 'clean page must satisfy the reflow assertion').toBeLessThanOrEqual(0);

  // Disposable fixed-width canary (TEST-000 pattern): must make the reflow check fail.
  await page.evaluate(() => {
    document.body.style.minWidth = '999px';
  });
  expect(await overflowPx(), 'fixed-width canary must be detected — proves the test can fail').toBeGreaterThan(0);

  // Restore: the same assertion must pass again.
  await page.evaluate(() => {
    document.body.style.minWidth = '';
  });
  expect(await overflowPx(), 'after restore the page must satisfy the reflow assertion again').toBeLessThanOrEqual(0);
});
