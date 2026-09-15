import { expect, test } from '@playwright/test';

test('opens the local Focus scaffold in Chromium', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Mozare Workbench/i);
  await expect(page.getByRole('heading', { name: 'Mozare Workbench' })).toBeVisible();
  await expect(page.getByText('Focus is preparing for your project.')).toBeVisible();
});
