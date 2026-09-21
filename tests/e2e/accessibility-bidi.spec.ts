import { expect, test } from '@playwright/test';

test('TEST-015: Escape closes the mission sheet and restores its trigger focus', async ({ page }) => {
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

test('TEST-016: mixed Persian content keeps technical identifiers isolated LTR at mobile zoom', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  const sample = page.getByTestId('bidi-sample');
  await expect(sample).toBeVisible();
  await expect(sample).toHaveAttribute('dir', 'rtl');
  const identifier = sample.getByText('DEC-014 / src/web/App.tsx', { exact: true });
  await expect(identifier).toHaveCSS('direction', 'ltr');
  await expect(identifier).toHaveCSS('unicode-bidi', 'isolate');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
