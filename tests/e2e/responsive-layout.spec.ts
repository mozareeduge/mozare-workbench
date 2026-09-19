import { expect, test, type Page } from '@playwright/test';

/**
 * TASK-P08-01 · TEST-014 — responsive navigation/layout hardening.
 * Binds: QA/CLAUDE_QA_CONTRACT.md TEST-014; SCN-RSP-01..05, SCN-X-03;
 * ORACLE-020, ORACLE-021, ORACLE-022, ORACLE-025; UI/layout-contracts.md;
 * AUTHORITY/03_DESIGN_UIUX_BLUEPRINTS.md "Responsive layout contract".
 *
 * Breakpoint contract (authority):
 *   width >= 1180        wide    persistent 72px rail + max-width workspace  (SCN-RSP-03)
 *   760 <= width < 1180  compact 56px icon-only rail                          (SCN-RSP-02)
 *   width < 760          mobile  62px bottom nav bar, all five views exposed  (SCN-RSP-01)
 *   320px or 200% zoom   reflow  no horizontal overflow, actions reachable    (SCN-RSP-04)
 *   landscape phone      sheet   sheet body scrolls, actions reachable        (SCN-RSP-05)
 *
 * Required matrix (TEST-014): 1440x900, 1280x800, 768x1024, 320x720, 390x844
 * plus band-edge probes 1152 (compact upper edge) and 740 (mobile upper edge).
 */

const VIEW_BUTTONS = ['Focus', 'Field', 'Flow', 'Output', 'Review'] as const;

async function expectReflow(page: Page, label: string): Promise<void> {
  const ok = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(ok, `page must reflow without horizontal overflow (${label})`).toBe(true);
}

async function expectAllViewsReachable(page: Page): Promise<void> {
  for (const name of VIEW_BUTTONS) {
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  }
}

test.describe('TEST-014 wide band (>= 1180)', () => {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
  ]) {
    test(`persistent 72px rail + max-width workspace at ${size.width}x${size.height} (SCN-RSP-03)`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto('/');
      const nav = page.locator('.shell-nav');
      await expect(nav).toBeVisible();
      const box = await nav.boundingBox();
      expect(box, 'wide navigation rail must be laid out').not.toBeNull();
      expect(box!.width, `wide rail must be the 72px contract at ${size.width}px`).toBeCloseTo(72, 0);
      const maxWidth = await page.locator('main.surface').evaluate((el) => getComputedStyle(el).maxWidth);
      expect(parseFloat(maxWidth), 'workspace must keep a bounded max-width (not none) on wide').toBeGreaterThan(800);
      await expectAllViewsReachable(page);
    });
  }
});

test.describe('TEST-014 compact band (760 <= width < 1180)', () => {
  for (const size of [
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1152, height: 800 },
  ]) {
    test(`56px icon-only rail at ${size.width}x${size.height} (SCN-RSP-02)`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto('/');
      const nav = page.locator('.shell-nav');
      await expect(nav).toBeVisible();
      const box = await nav.boundingBox();
      expect(box, 'compact rail must be laid out').not.toBeNull();
      expect(box!.width, `compact rail must be the 56px contract at ${size.width}px`).toBeCloseTo(56, 0);
      await expectAllViewsReachable(page);
    });
  }
});

test.describe('TEST-014 mobile band (width < 760)', () => {
  for (const size of [
    { width: 740, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    test(`bottom nav bar exposes all five views at ${size.width}x${size.height} (SCN-RSP-01)`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto('/');
      const nav = page.locator('.shell-nav');
      await expect(nav).toBeVisible();
      const box = await nav.boundingBox();
      expect(box, 'mobile nav must be laid out').not.toBeNull();
      expect(box!.height, `mobile nav must be the 62px bottom-bar contract at ${size.width}px`).toBeCloseTo(62, 0);
      const position = await nav.evaluate((el) => getComputedStyle(el).position);
      expect(position, 'mobile nav must be a fixed bottom bar').toBe('fixed');
      expect(box!.y + box!.height, 'mobile nav must sit flush with the viewport bottom').toBeCloseTo(size.height, 0);
      await expectAllViewsReachable(page);
    });
  }
});

test.describe('TEST-014 320px reflow (SCN-RSP-04)', () => {
  test('surface keeps >= 16px gutters at 320px (layout contract: mobile surface padding)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/');
    const gutter = await page.locator('main.surface').evaluate((el) => {
      const style = getComputedStyle(el);
      return Math.min(parseFloat(style.paddingLeft) || 0, parseFloat(style.paddingRight) || 0);
    });
    expect(gutter, 'mobile surface gutters must be >= 16px (contract: 16px)').toBeGreaterThanOrEqual(16);
  });

  test('all five views reflow at 320px; primary decision actions reachable (SCN-RSP-04)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/');
    for (const name of VIEW_BUTTONS) {
      await page.getByRole('button', { name, exact: true }).click();
      await expectReflow(page, `320px ${name} view`);
    }
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    await page.locator('.review-queue-item').first().click();
    const decisionBar = page.locator('.review-decision-bar');
    await expect(decisionBar, 'primary decision actions must be reachable at 320px').toBeVisible();
    await expect(decisionBar.getByRole('button', { name: 'Accept' })).toBeVisible();
    await expectReflow(page, '320px review decision bar');
  });

  test('Field defaults to bounded list at 320px; graph reachable deliberately (SCN-X-03)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Field', exact: true }).click();
    const controls = page.locator('.field-controls');
    const listButton = controls.getByRole('button', { name: 'List', exact: true });
    const mapButton = controls.getByRole('button', { name: 'Map', exact: true });
    await expect(listButton).toBeVisible();
    await expect(mapButton).toBeVisible();
    await expect(listButton, 'mobile Field must open list-first (SCN-X-03)').toHaveClass(/is-active/);
    await mapButton.click();
    await expect(mapButton, 'map must stay reachable as a deliberate toggle').toHaveClass(/is-active/);
    await expectReflow(page, '320px field map after deliberate toggle');
  });

  test('landscape phone: mission sheet body scrolls, decision actions reachable (SCN-RSP-05)', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 390 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Work on this' }).click();
    const sheet = page.getByRole('dialog', { name: 'Compose mission' });
    await expect(sheet).toBeVisible();
    const start = sheet.getByRole('button', { name: 'Start mission' });
    await expect(start).toBeVisible();
    const box = await start.boundingBox();
    expect(box, 'sheet decision action must be laid out').not.toBeNull();
    expect(
      box!.y + box!.height,
      'sheet footer decision action must stay inside the landscape viewport (SCN-RSP-05)',
    ).toBeLessThanOrEqual(390);
    await expectReflow(page, '700x390 mission sheet');
  });
});

test.describe('TEST-014 200% zoom reflow (SCN-RSP-04)', () => {
  test('zoom 2x keeps every view within its viewport without truncation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    for (const name of VIEW_BUTTONS) {
      // Clicks happen at natural zoom; the reflow assertion runs under 2x zoom
      // (SCN-RSP-04 "or 200% zoom" — asserted per view).
      await page.getByRole('button', { name, exact: true }).click();
      await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
      await expectReflow(page, `200% zoom ${name} view`);
      await page.evaluate(() => { document.documentElement.style.zoom = ''; });
    }
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    // DOM-level click: the zoom toggling above leaves Playwright's hit-target
    // check racing app-shell; the React handler path is identical either way.
    await page.evaluate(() => { (document.querySelector('.review-queue-item') as HTMLElement | null)?.click(); });
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    await expect(page.locator('.review-decision-bar').getByRole('button', { name: 'Accept' })).toBeVisible();
    await expectReflow(page, '200% zoom review decision');
    await page.evaluate(() => { document.documentElement.style.zoom = ''; });
  });
});
