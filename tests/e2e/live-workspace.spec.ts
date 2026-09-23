import { expect, test } from '@playwright/test';

test('TEST-023: five surfaces use the running active-workspace API and switching removes stale identity', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const projectionResponse = page.waitForResponse((response) => /\/api\/workspaces\/ws_[a-f0-9]+\/projection$/.test(response.url()) && response.status() === 200);
  await page.goto('/');
  const observed = await projectionResponse;
  expect((await observed.json()).focus.projectName).toBe('Alpha Live Project');

  await expect(page.getByText('Alpha Live Project', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How can this relation become an operational design experiment?', exact: true })).toBeVisible();
  await expect(page.getByText('Turn a theoretical relation into a testable design operation without flattening its uncertainty.')).toBeVisible();

  await page.getByRole('button', { name: 'Field', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Field' })).toBeVisible();
  await expect(page.getByText('Primary source fragment', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Flow', exact: true }).click();
  await expect(page.getByText(/No outcome\/run records are available/i)).toBeVisible();

  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No items need review' })).toBeVisible();

  await page.getByRole('button', { name: 'Output', exact: true }).click();
  await expect(page.getByText('Interaction reference prototype', { exact: true })).toBeVisible();
  await expect(page.getByText('partial', { exact: true })).toBeVisible();

  const switchedResponse = page.waitForResponse((response) => /\/api\/workspaces\/ws_[a-f0-9]+\/projection$/.test(response.url()) && response.status() === 200);
  await page.getByLabel('Active project').selectOption({ label: 'beta-live-project' });
  expect((await (await switchedResponse).json()).focus.projectName).toBe('پروژه Beta Live Project ۲');
  await expect(page.getByText('پروژه Beta Live Project ۲', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Alpha Live Project', { exact: true })).toHaveCount(0);

  const visibleText = await page.locator('body').innerText();
  expect(visibleText).not.toContain('TAROKE RIMIXER');
  expect(visibleText).not.toContain('demo-fixture-base-hash');
  await page.screenshot({ path: 'test-results/TEST-023-live-switch.png', fullPage: true });
});

test('TEST-023: mobile shell keeps all five live surfaces reachable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  await page.getByLabel('Active project').selectOption({ label: 'alpha-live-project' });
  await expect(page.getByText('Alpha Live Project', { exact: true }).first()).toBeVisible();
  for (const view of ['Focus', 'Field', 'Flow', 'Review', 'Output']) {
    await page.getByRole('button', { name: view, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${view} must reflow at 320px`).toBe(true);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  const overflow = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('body *')]
    .filter((element) => { const box = element.getBoundingClientRect(); return box.right > window.innerWidth + 1 || box.left < -1; })
    .slice(0, 12)
    .map((element) => ({ tag: element.tagName, className: element.className, width: element.getBoundingClientRect().width, right: element.getBoundingClientRect().right })));
  expect(overflow, 'live Output must reflow at 200% zoom').toEqual([]);
});

test('SCN-ORI-02: an empty registry renders setup and never a fake project', async ({ page }) => {
  await page.route('**/api/workspaces', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ workspaces: [] }) }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Start with a local project' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose local folder' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create new project' })).toBeVisible();
  await expect(page.getByText(/Nothing has been created or inferred/i)).toBeVisible();
  expect(await page.locator('body').innerText()).not.toContain('TAROKE RIMIXER');
});
