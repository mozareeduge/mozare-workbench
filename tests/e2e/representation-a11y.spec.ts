import { expect, test } from '@playwright/test';

/**
 * TEST-GUI-04 — Accessibility/responsive (TASK-P05-05, SCN-GUI-06).
 * Keyboard-only, widths, large-text/zoom and reduced motion: critical
 * information and actions remain reachable on the semantic surfaces.
 */
const widths = [1440, 1024, 390, 320];

test('TEST-GUI-04: semantic components stay keyboard-reachable across supported widths', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?state=demo-handoff');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    // Critical information reachable: ladder sections visible.
    await expect(page.getByRole('heading', { name: 'Intent' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Verification' })).toBeVisible();
    // Keyboard-only: term chip opens its popover, Close returns.
    const chip = page.getByRole('button', { name: 'ModelRouter' }).first();
    await chip.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: /Term: ModelRouter/i });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
  }
});

test('TEST-GUI-04: reduced motion keeps critical information visible and the log expandable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?state=demo-handoff');
  await expect(page.getByRole('heading', { name: 'Intent' })).toBeVisible();
  await page.getByRole('button', { name: /Verification log/i }).click();
  await expect(page.getByTestId('ladder-log')).toBeVisible();
  await expect(page.getByTestId('ladder-log')).toContainText('step diagnostic line');
});

test('TEST-GUI-04: large-text/zoom keeps the mission sheet primary action reachable', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  await page.getByRole('button', { name: 'Work on this' }).click();
  const sheet = page.getByRole('dialog', { name: 'Compose mission' });
  const start = sheet.getByRole('button', { name: 'Start mission' });
  await expect(start).toBeVisible();
  // Truthful state at zoom: Start disabled while acceptance is empty.
  await expect(start).toBeDisabled();
  await expect(sheet.getByText(/at least one observable acceptance criterion/i)).toBeVisible();
});
