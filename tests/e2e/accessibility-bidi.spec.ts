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
