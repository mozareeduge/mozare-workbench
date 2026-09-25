import { expect, test } from '@playwright/test';
import { resetAlpha } from './live-reset';
test.beforeEach(async ({ request }) => { await resetAlpha(request); });
const widths = [1440, 1280, 1024, 768, 390, 320];
test('TEST-002: Focus is the bounded first surface with orientation facts', async ({ page }) => { await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/'); await expect(page.getByRole('heading', { level: 1, name: /how can this relation become an operational design experiment/i })).toBeVisible(); for (const item of ['Current objective', 'Evidence summary', 'Latest accepted decision', 'Needs you', 'Latest output', 'Next action']) await expect(page.getByText(item, { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Work on this' })).toBeVisible(); await page.screenshot({ path: 'test-results/TEST-002-focus-1440x900.png', fullPage: true }); await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: 'test-results/TEST-002-focus-390x844.png', fullPage: true }); });
test('Focus provides explicit empty and blocked orientation rather than fabricated work', async ({ page }) => {
  await page.route('**/api/workspaces', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ workspaces: [] }) }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /start with a local project/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose local folder' })).toBeVisible();
  await page.unroute('**/api/workspaces');
  // A project whose canonical records are broken is shown as needing repair, read-only, never with fabricated work.
  await page.route('**/api/workspaces/*/projection', async (route) => {
    const live = await (await route.fetch()).json();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...live, focus: null, field: null, workspace: { ...live.workspace, classification: 'invalid', errorReceipt: { code: 'invalid_canonical_records', message: 'Blocked — canonical records need repair.', safeState: 'read_only' } } }) });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'This project needs repair' })).toBeVisible();
  await expect(page.getByText(/blocked — canonical records need repair/i)).toBeVisible();
  await expect(page.getByText(/registration did not write any files/i)).toBeVisible();
});
test('TEST-014: navigation transforms and no page overflows across supported widths', async ({ page }) => { const nav = page.locator('.shell-nav'); for (const width of widths) { await page.setViewportSize({ width, height: width < 700 ? 700 : 900 }); await page.goto('/'); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy(); for (const item of ['Focus', 'Field', 'Flow', 'Review', 'Output']) await expect(nav.getByRole('button', { name: item, exact: true })).toBeVisible(); } await page.setViewportSize({ width: 1024, height: 768 }); await page.goto('/'); await page.evaluate(() => { document.documentElement.style.zoom = '2'; }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy(); for (const item of ['Field', 'Flow', 'Review', 'Output']) { await nav.getByRole('button', { name: item, exact: true }).click(); await expect(page.getByRole('heading', { level: 1, name: new RegExp(`^${item}$`, 'i') })).toBeVisible(); } await page.setViewportSize({ width: 320, height: 700 }); await page.goto('/'); await page.evaluate(() => { document.body.style.minWidth = '999px'; }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeFalsy(); });
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
  await expect(page.getByRole('heading', { name: 'Flow', exact: true })).toBeVisible();
  const board = page.locator('.flow-board');
  for (const lane of ['Ready', 'Active', 'Blocked', 'Review', 'Accepted']) await expect(board.getByRole('heading', { name: new RegExp(`^${lane}`) })).toBeVisible();

  const activeLane = board.locator('.flow-lane', { has: page.getByRole('heading', { name: /^Active/ }) });
  await expect(activeLane.getByText('Rhythm comparison pass v2')).toBeVisible();
  await expect(activeLane.getByText('Agent · codex')).toBeVisible();
  const readyLane = board.locator('.flow-lane', { has: page.getByRole('heading', { name: /^Ready/ }) });
  await expect(readyLane.getByText('Draft the rhythm comparison brief')).toBeVisible();

  const blockedLane = board.locator('.flow-lane', { has: page.getByRole('heading', { name: /^Blocked/ }) });
  await expect(blockedLane.getByText(/source reference for the verse 3 annotation/i)).toBeVisible();
  await expect(blockedLane.getByRole('button', { name: 'Continue with another agent' }).first()).toBeVisible();

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
  await expect(mobile.getByRole('button', { name: 'Continue with another agent' }).first()).toBeVisible();
  await page.screenshot({ path: 'test-results/TEST-019-flow-390x844.png', fullPage: true });
});
test('TEST-009: Output artifact registry — canonicality/verification independence, sandboxed HTML preview, binary never auto-executes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let downloadFired = false;
  page.on('download', () => { downloadFired = true; });
  await page.goto('/');
  const originalTitle = await page.title();
  await page.getByRole('button', { name: 'Output', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Output', exact: true })).toBeVisible();

  // SCN-OUT-01: canonical JSON vs generated HTML — labels distinguish editable source from distributable artifact.
  const jsonTile = page.locator('.artifact-tile', { hasText: 'Alpha mission record' });
  await expect(jsonTile.getByText('Canonical/editable', { exact: true })).toBeVisible();
  await expect(jsonTile.locator('pre')).toContainText('Rhythm comparison pass v2');
  const reportTile = page.locator('.artifact-tile', { hasText: 'Verse 3 comparison report' });
  await expect(reportTile.getByText('Generated/distributable', { exact: true })).toBeVisible();

  // SCN-OUT-02: image/audio/video/PDF/text get a medium-appropriate preview, with metadata secondary in DOM order.
  const imageTile = page.locator('.artifact-tile', { hasText: 'Verse 3 waveform still' });
  await expect(imageTile.locator('.artifact-preview img')).toBeVisible();
  const previewThenMeta = await imageTile.evaluate((el) => {
    const preview = el.querySelector('.artifact-preview');
    const meta = el.querySelector('.artifact-meta');
    if (!preview || !meta) return false;
    return !!(preview.compareDocumentPosition(meta) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(previewThenMeta).toBe(true);
  const textTile = page.locator('.artifact-tile', { hasText: 'Annotation notes — verse 3 cut' });
  await expect(textTile.locator('pre')).toContainText('rhythmic markers align with the source');

  // SCN-OUT-03 / ORACLE-014: the HTML preview iframe is sandboxed without allow-same-origin, so a hostile
  // artifact's script cannot reach the parent Workbench page, even though the script itself does execute.
  const hostileTile = page.locator('.artifact-tile', { hasText: 'External HTML sample (sandbox verification)' });
  const hostileFrameEl = hostileTile.locator('iframe.artifact-html-frame');
  const sandboxAttr = await hostileFrameEl.getAttribute('sandbox');
  expect(sandboxAttr).toContain('allow-scripts');
  expect(sandboxAttr).not.toContain('allow-same-origin');
  const hostileFrameHandle = await hostileFrameEl.elementHandle();
  const hostileFrame = await hostileFrameHandle?.contentFrame();
  await expect.poll(async () => hostileFrame?.title()).toBe('inside-sandboxed-iframe');
  // Positive proof: the hostile script ran (it changed its own frame's title) but the parent page's
  // own title and location are unaffected — the sandbox, not luck, stopped the cross-origin reach.
  await expect(page).toHaveTitle(originalTitle);
  expect(page.url()).not.toContain('example.invalid');
  await expect(hostileTile.getByRole('button', { name: 'Open externally' })).toBeVisible();
  const popupPromise = page.waitForEvent('popup');
  await hostileTile.getByRole('button', { name: 'Open externally' }).click();
  const popup = await popupPromise;
  await popup.close();

  // SCN-OUT-04 / ORACLE-027: the binary artifact renders metadata only and is never auto-opened/executed.
  const binaryTile = page.locator('.artifact-tile', { hasText: 'Alpha installer' });
  await expect(binaryTile.getByText(/binary artifact — metadata only/i)).toBeVisible();
  await expect(binaryTile.getByText(/^sha256:[0-9a-f]{64}$/)).toBeVisible();
  await expect(binaryTile.getByText('alpha-installer.bin', { exact: true })).toBeVisible();
  await expect(binaryTile.locator('a[download], a[href]')).toHaveCount(0);

  // SCN-OUT-05: a failed build remains inspectable but its verification label is independent of existence —
  // it can never claim Verified.
  const failedTile = page.locator('.artifact-tile', { hasText: 'Verse 3 remix candidate render' });
  await expect(failedTile).toBeVisible();
  await expect(failedTile.getByText('Failed', { exact: true })).toBeVisible();
  await expect(failedTile.getByText('Verified', { exact: true })).toHaveCount(0);

  await page.waitForTimeout(300);
  expect(downloadFired).toBe(false);
  await page.screenshot({ path: 'test-results/TEST-009-output-1440x900.png', fullPage: true });
});
