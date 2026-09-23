import { expect, test } from '@playwright/test';

test('TEST-015: Escape closes the live mission sheet and restores trigger focus', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Work on this' });
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'Compose mission' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Compose mission' })).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('TEST-015: reduced motion suppresses interface animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const duration = await page.getByRole('button', { name: 'Work on this' }).evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(duration).toBe('0.001s');
});

test('TEST-016: live Persian/English identity uses automatic direction and technical references stay LTR', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  await page.getByLabel('Active project').selectOption({ label: 'beta-live-project' });
  const mixedIdentity = page.getByText('پروژه Beta Live Project ۲', { exact: true }).first();
  await expect(mixedIdentity).toBeVisible();
  await expect(mixedIdentity).toHaveAttribute('dir', 'auto');
  await page.getByRole('button', { name: 'Output', exact: true }).click();
  const reference = page.getByText('../../prototype/index.html', { exact: true });
  await expect(reference).toHaveAttribute('dir', 'ltr');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('DARK-01: dark is default and light opt-in persists after reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const toggle = page.getByRole('button', { name: 'Switch to light theme' });
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
