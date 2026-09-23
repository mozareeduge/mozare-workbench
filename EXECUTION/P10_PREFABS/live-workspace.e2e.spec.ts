import { expect, test } from '@playwright/test';

/** READY_WITH_ADAPTATION: align endpoints/selectors with TASK-P10-01/02, while
 * preserving the required network-to-visible-UI proof. */
const realRoot = process.env.MWB_LIVE_WORKSPACE_ROOT;
const expectedMarker = process.env.MWB_LIVE_EXPECTED_MARKER;

test('GATE-LIVE: current real workspace reaches all visible surfaces', async ({ page, request }) => {
  test.skip(!realRoot || !expectedMarker, 'Current real root and observed marker are required');

  // Test-only direct-root input is allowed; the production UI must use a picker token.
  const registered = await request.post('/api/workspaces/register', {
    data: { root: realRoot, testOnly: true },
  });
  expect(registered.ok()).toBeTruthy();
  const payload = (await registered.json()) as { workspace: { id: string; classification: string } };
  expect(payload.workspace.id).toBeTruthy();
  expect(JSON.stringify(payload)).not.toContain(realRoot);

  const id = payload.workspace.id;
  expect((await request.post(`/api/workspaces/${id}/activate`)).ok()).toBeTruthy();
  const liveResponse = page.waitForResponse((response) =>
    response.url().includes(`/api/workspaces/${id}/projection`) && response.request().method() === 'GET');

  await page.goto('/');
  expect((await liveResponse).ok()).toBeTruthy();
  await expect(page.locator('body')).toContainText(expectedMarker!, { ignoreCase: true });
  await expect(page.locator('body')).not.toContainText('TAROKE RIMIXER');
  expect([null, 'dark']).toContain(await page.locator('html').getAttribute('data-theme'));

  for (const surface of ['Focus', 'Field', 'Flow', 'Review', 'Output']) {
    await page.getByRole('button', { name: surface, exact: true }).click();
    await expect(page.locator('main')).not.toContainText('TAROKE RIMIXER');
  }
});
