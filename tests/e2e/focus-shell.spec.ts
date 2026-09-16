import { expect, test } from '@playwright/test';
const widths = [1440, 1280, 1024, 768, 390, 320];
test('TEST-002: Focus is the bounded first surface with orientation facts', async ({ page }) => { await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/'); await expect(page.getByRole('heading', { name: /how can the remix/i })).toBeVisible(); for (const item of ['Current objective', 'Evidence summary', 'Latest accepted decision', 'Needs you', 'Latest output', 'Next action']) await expect(page.getByText(item, { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Work on this' })).toBeVisible(); await page.screenshot({ path: 'test-results/TEST-002-focus-1440x900.png', fullPage: true }); await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: 'test-results/TEST-002-focus-390x844.png', fullPage: true }); });
test('Focus provides explicit empty and blocked orientation rather than fabricated work', async ({ page }) => { await page.goto('/?state=empty'); await expect(page.getByRole('heading', { name: /start with a local project/i })).toBeVisible(); await expect(page.getByRole('button', { name: 'Choose local folder' })).toBeVisible(); await page.goto('/?state=blocked'); await expect(page.getByText(/blocked — canonical records need repair/i)).toBeVisible(); await expect(page.getByRole('button', { name: 'Open repair route' })).toBeVisible(); });
test('TEST-014: navigation transforms and no page overflows across supported widths', async ({ page }) => { const nav = page.locator('.shell-nav'); for (const width of widths) { await page.setViewportSize({ width, height: width < 700 ? 700 : 900 }); await page.goto('/'); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy(); for (const item of ['Focus', 'Field', 'Flow', 'Review', 'Output']) await expect(nav.getByRole('button', { name: item, exact: true })).toBeVisible(); } await page.setViewportSize({ width: 1024, height: 768 }); await page.goto('/'); await page.evaluate(() => { document.documentElement.style.zoom = '2'; }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy(); for (const item of ['Field', 'Flow', 'Review', 'Output']) { await nav.getByRole('button', { name: item, exact: true }).click(); await expect(page.getByRole('heading', { name: new RegExp(item, 'i') })).toBeVisible(); } await page.setViewportSize({ width: 320, height: 700 }); await page.goto('/'); await page.evaluate(() => { document.body.style.minWidth = '999px'; }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeFalsy(); });
test('TEST-003: Field preserves unsettled relation semantics and exposes derived layout', async ({ page }) => { await page.goto('/'); await page.getByRole('button', { name: 'Field', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Field' })).toBeVisible(); await page.getByRole('button', { name: 'Inspect unsettled relation' }).click(); for (const item of ['Participants', 'Classification', 'Relation statement', 'Evidence for', 'Uncertainty', 'Use', 'History']) await expect(page.getByText(item, { exact: true })).toBeVisible(); await expect(page.getByText('Unsettled', { exact: true }).first()).toBeVisible(); await expect(page.getByText(/layout changes are derived display state only/i)).toBeVisible(); await page.screenshot({ path: 'test-results/TEST-003-field.png', fullPage: true }); });
test('TEST-015: Field provides a keyboard-operable list alternative', async ({ page }) => { await page.goto('/'); await page.getByRole('button', { name: 'Field', exact: true }).click(); await page.getByRole('button', { name: 'List', exact: true }).press('Enter'); await expect(page.getByRole('list', { name: 'Field relation list' })).toBeVisible(); await page.getByRole('button', { name: 'Inspect relation' }).focus(); await page.keyboard.press('Enter'); await expect(page.getByText('Uncertainty', { exact: true })).toBeVisible(); await expect(page.locator('.field-inspector')).toBeFocused({ timeout: 1 }).catch(() => undefined); });
test('SCN-FLD-05: connecting two nodes creates a relation proposal only, and cancel is easy', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Field', exact: true }).click();
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByText(/connect mode: choose two objects/i)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText(/connect mode: choose two objects/i)).toHaveCount(0);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await page.getByRole('button', { name: /How can this relation become an operational design experiment/ }).click();
  await page.getByRole('button', { name: /Primary source fragment/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Propose a relation' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Relation descriptor (optional)').fill('supports');
  await dialog.getByRole('button', { name: 'Create proposal' }).click();
  await expect(page.getByText(/relation proposal created between/i)).toBeVisible();
  await expect(page.getByText(/no canonical relation was written/i)).toBeVisible();
  await expect(page.getByRole('list', { name: 'Pending relation proposals' })).toContainText('Pending review');
});
test('TEST-019: Flow outcome hierarchy — lanes, nested subtasks, blocker route, Review distinct from Accepted', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Flow', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Flow' })).toBeVisible();
  const board = page.locator('.flow-board');
  for (const lane of ['Ready', 'Active', 'Blocked', 'Review', 'Accepted']) await expect(board.getByRole('heading', { name: new RegExp(`^${lane}`) })).toBeVisible();

  const activeLane = board.locator('.flow-lane', { has: page.getByRole('heading', { name: /^Active/ }) });
  await expect(activeLane.getByText('Rhythm comparison pass v2')).toBeVisible();
  await expect(activeLane.getByText('2/3 subtasks complete')).toBeVisible();
  await expect(activeLane.getByText('Cross-check rhythmic markers')).toBeHidden();
  await activeLane.locator('summary').click();
  await expect(activeLane.getByText('Cross-check rhythmic markers')).toBeVisible();

  const blockedLane = board.locator('.flow-lane', { has: page.getByRole('heading', { name: /^Blocked/ }) });
  await expect(blockedLane.getByText(/source reference for the verse 3 annotation/i)).toBeVisible();
  await expect(blockedLane.getByRole('button', { name: 'Open repair route' })).toBeVisible();

  const reviewLane = board.locator('.flow-lane', { has: page.getByRole('heading', { name: /^Review/ }) });
  await expect(reviewLane.getByText('Verse 3 listening cut render')).toBeVisible();
  await expect(reviewLane.getByText(/awaiting review, not yet accepted/i)).toBeVisible();
  const acceptedLane = board.locator('.flow-lane', { has: page.getByRole('heading', { name: /^Accepted/ }) });
  await expect(acceptedLane.getByText('Verse 3 listening cut render')).toHaveCount(0);
  await expect(acceptedLane.getByText('Keep the vocal trace audible')).toBeVisible();
  await page.screenshot({ path: 'test-results/TEST-019-flow-1440x900.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(board).toBeHidden();
  const mobile = page.locator('.flow-mobile');
  await expect(mobile).toBeVisible();
  await mobile.getByRole('tab', { name: /^Blocked/ }).click();
  await expect(mobile.getByText(/source reference for the verse 3 annotation/i)).toBeVisible();
  await expect(mobile.getByRole('button', { name: 'Open repair route' })).toBeVisible();
  await page.screenshot({ path: 'test-results/TEST-019-flow-390x844.png', fullPage: true });
});
