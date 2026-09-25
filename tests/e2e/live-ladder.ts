import { expect, type Page } from '@playwright/test';

/** Opens the seeded live proposal whose handoff carries a system view, and returns its ladder. */
export async function openProvenanceLadder(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await page.getByRole('button', { name: /Confirm evidence provenance keeps agent claims/ }).click();
  const ladder = page.getByRole('region', { name: 'System view' });
  await expect(ladder).toBeVisible();
  return ladder;
}

