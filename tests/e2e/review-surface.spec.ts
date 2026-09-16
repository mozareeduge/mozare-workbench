import { expect, test } from '@playwright/test';

async function openReview(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
}

/** Scoped to the decision bar's action group, so "Reject" never matches a queue item whose decision badge now reads "Rejected · retained" (which contains "Reject" as a substring). */
function decisionActions(page: import('@playwright/test').Page) {
  return page.locator('.review-decision-actions');
}

test('SCN-REV-01: review queue is finite and sorted critical/stale first, then newest', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openReview(page);
  const titles = await page.locator('.review-queue-item strong').allTextContents();
  expect(titles).toEqual([
    'Stream raw build log into Implementation disclosure',
    'Transactional canonical apply for relation-connect proposals',
    'Rebase Field connect-proposal descriptor validation',
    'Confirm evidence provenance keeps agent claims out of Passed state',
    'Add responsive breakpoint to Review evidence chips',
  ]);
  // ReviewQueueItem contract: no proposal prose excerpt in the queue row, only title/target/risk/freshness/verification cues.
  await expect(page.locator('.review-queue-item', { hasText: 'Transactional canonical apply' })).not.toContainText('Requested outcome');
  await page.screenshot({ path: 'test-results/TEST-006-review-queue-1440x900.png', fullPage: true });
});

test('ORACLE-009 / SCN-REV-02: technical review opens at effect, before architecture/diff/log, which stay collapsed', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openReview(page);
  const detail = page.locator('.review-detail');
  await expect(detail.getByRole('heading', { name: 'Transactional canonical apply for relation-connect proposals' })).toBeVisible();

  // Effect region is present with its three required labels (SCN-REV-02).
  await expect(detail.getByText('Requested outcome', { exact: true })).toBeVisible();
  await expect(detail.getByText('What changed', { exact: true })).toBeVisible();
  await expect(detail.getByText('What remains unresolved', { exact: true })).toBeVisible();

  // Architecture/Implementation are collapsed by default — the raw diff/log are not visible on open.
  await expect(page.locator('.review-diff-viewer')).toBeHidden();
  await expect(page.locator('.review-log-viewer')).toBeHidden();
  const implementationOpen = await page.locator('.review-implementation').getAttribute('open');
  expect(implementationOpen).toBeNull();

  // Positive proof of ordering: Effect content appears before Implementation's diff content in DOM order.
  const fullText = (await detail.textContent()) ?? '';
  const effectIndex = fullText.indexOf('Requested outcome');
  const diffIndex = fullText.indexOf('--- a/src/core/proposals/applyRelationConnectProposal.ts');
  expect(effectIndex).toBeGreaterThanOrEqual(0);
  expect(diffIndex).toBeGreaterThan(effectIndex);

  // The decision bar is always present, regardless of disclosure state.
  await expect(page.getByRole('group', { name: 'Review decision' })).toBeVisible();
});

test('SCN-REV-04 / SCN-REV-05: expanding architecture and implementation keeps decision controls visible; monospace is confined to Implementation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openReview(page);
  await page.locator('.review-architecture summary').click();
  await expect(page.getByText('A pure isProposalStale')).toBeVisible();
  await expect(decisionActions(page).getByRole('button', { name: 'Accept', exact: true })).toBeVisible();

  await page.locator('.review-implementation summary').click();
  await expect(page.locator('.review-diff-viewer')).toBeVisible();
  await expect(page.locator('.review-diff-viewer')).toContainText('--- a/src/core/proposals/applyRelationConnectProposal.ts');
  await expect(page.locator('.review-log-viewer')).toContainText('npm run test:integration');
  await expect(decisionActions(page).getByRole('button', { name: 'Accept', exact: true })).toBeVisible();
  await expect(decisionActions(page).getByRole('button', { name: 'Reject', exact: true })).toBeVisible();
});

test('SCN-REV-03 / ORACLE-010: observed evidence is distinguishable from an agent claim, and the claim never renders Passed', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openReview(page);
  await page.getByRole('button', { name: /Confirm evidence provenance keeps agent claims/ }).click();

  const observedRow = page.locator('.review-evidence-row.is-observed', { hasText: 'TEST-006 positive path' });
  await expect(observedRow).toBeVisible();
  await expect(observedRow.getByText('Observed', { exact: true })).toBeVisible();
  await expect(observedRow.getByText('Passed', { exact: true })).toBeVisible();

  const claimRow = page.locator('.review-evidence-row.is-agent_claim', { hasText: 'Agent claim: "full regression suite passed"' });
  await expect(claimRow).toBeVisible();
  await expect(claimRow.getByText('Agent claim', { exact: true })).toBeVisible();
  await expect(claimRow.getByText('Claimed', { exact: true })).toBeVisible();
  await expect(claimRow.getByText('Passed', { exact: true })).toHaveCount(0);

  // Overall verification is still Verified, driven by the genuinely observed pass.
  await expect(page.locator('.review-verification-summary')).toHaveText('Verified');
});

test('SCN-X-02: failed verification makes a decision possible but the Verified label impossible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openReview(page);
  await page.getByRole('button', { name: /Stream raw build log into Implementation disclosure/ }).click();

  await expect(page.locator('.review-verification-summary')).toHaveText('Failed verification');
  // Scope to this specific queue item's cue (the class is shared by all five queue rows) and
  // assert it never reads "Verified", even though this item's decision is still reachable.
  const queueCue = page.locator('.review-queue-item', { hasText: 'Stream raw build log into Implementation disclosure' }).locator('.review-verification-badge');
  await expect(queueCue).not.toHaveText('Verified');
  await expect(queueCue).toHaveText('Failed verification');

  const acceptButton = decisionActions(page).getByRole('button', { name: 'Accept', exact: true });
  await expect(acceptButton).toBeDisabled();
  await expect(page.locator('.review-accept-reason')).toContainText(/policy/i);

  // A decision is still possible: Reject/Preserve/Request revision remain enabled.
  await expect(decisionActions(page).getByRole('button', { name: 'Reject', exact: true })).toBeEnabled();
  await expect(decisionActions(page).getByRole('button', { name: 'Preserve', exact: true })).toBeEnabled();
  await expect(decisionActions(page).getByRole('button', { name: 'Request revision', exact: true })).toBeEnabled();
});

test('SCN-REV-07 / SCN-X-01: a stale base disables Accept with an explicit drift explanation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openReview(page);
  await page.getByRole('button', { name: /Rebase Field connect-proposal descriptor validation/ }).click();
  await expect(page.locator('.review-freshness-badge.is-stale').first()).toBeVisible();
  await expect(decisionActions(page).getByRole('button', { name: 'Accept', exact: true })).toBeDisabled();
  await expect(page.locator('.review-accept-reason')).toContainText(/re-evaluate or rebase/i);
});

test('SCN-REV-08: requesting a revision preserves prior evidence and keeps the proposal on the same lineage', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openReview(page);
  await page.getByRole('button', { name: /Transactional canonical apply for relation-connect proposals/ }).click();
  await decisionActions(page).getByRole('button', { name: 'Request revision', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Request revision' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Revision note').fill('Please also cover the case where the staged file already exists.');
  await dialog.getByRole('button', { name: 'Send revision request' }).click();

  await expect(page.locator('.review-receipt')).toContainText(/revision requested/i);
  await expect(page.locator('.review-receipt')).toContainText(/prior evidence is preserved/i);
  await expect(page.locator('.review-decision-badge', { hasText: 'Revision requested' }).first()).toBeVisible();
  // Prior evidence is still present after the decision.
  await expect(page.locator('.review-evidence-row', { hasText: 'TEST-007: stale proposal blocks accept' })).toBeVisible();
});

test('SCN-REV-09: rejecting retains the record, requires a rationale only under high-risk policy, and never uses destructive wording', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openReview(page);

  // Non-high-risk item: rationale is optional.
  await page.getByRole('button', { name: /Add responsive breakpoint to Review evidence chips/ }).click();
  await decisionActions(page).getByRole('button', { name: 'Reject', exact: true }).click();
  const optionalDialog = page.getByRole('dialog', { name: 'Reject' });
  await expect(optionalDialog).toBeVisible();
  await expect(optionalDialog.getByText('Rationale (optional)')).toBeVisible();
  await optionalDialog.getByRole('button', { name: 'Confirm reject' }).click();
  await expect(page.locator('.review-receipt')).toContainText(/rejected\. the record is retained for reference; canonical state is unchanged/i);
  await expect(page.locator('.review-decision-badge', { hasText: 'Rejected · retained' }).first()).toBeVisible();
  // The item is retained in the queue, not removed.
  await expect(page.locator('.review-queue-item strong', { hasText: 'Add responsive breakpoint to Review evidence chips' })).toBeVisible();
  const bodyText = (await page.locator('body').innerText()).toLowerCase();
  expect(bodyText).not.toMatch(/\bdelete\b|\bdiscard\b|\bremove permanently\b/);

  // High-risk item: rationale is required — submitting empty leaves the dialog open (native required validation).
  await page.getByRole('button', { name: /Stream raw build log into Implementation disclosure/ }).click();
  await decisionActions(page).getByRole('button', { name: 'Reject', exact: true }).click();
  const requiredDialog = page.getByRole('dialog', { name: 'Reject' });
  await expect(requiredDialog).toBeVisible();
  await expect(requiredDialog.getByText(/rationale \(required by high-risk review policy\)/i)).toBeVisible();
  await requiredDialog.getByRole('button', { name: 'Confirm reject' }).click();
  await expect(requiredDialog).toBeVisible();
  await requiredDialog.getByLabel(/rationale/i).fill('Log auto-expanded on load, violating SCN-TEC-05.');
  await requiredDialog.getByRole('button', { name: 'Confirm reject' }).click();
  await expect(requiredDialog).toBeHidden();
  await expect(page.getByText(/rationale: log auto-expanded on load/i)).toBeVisible();
});

test('SCN-REV-10: preserving creates an explicit residue with no active authority', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openReview(page);
  await page.getByRole('button', { name: /Confirm evidence provenance keeps agent claims/ }).click();
  await decisionActions(page).getByRole('button', { name: 'Preserve', exact: true }).click();
  await expect(page.locator('.review-receipt')).toContainText(/preserved as residue — retained for reference with no active authority/i);
  await expect(page.locator('.review-decision-badge', { hasText: 'Residue · no active authority' }).first()).toBeVisible();
});

test('SCN-REV-01 / SCN-X-10: mobile shows a queue→detail route stack, and the sticky decision bar reflects a stale base', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openReview(page);

  const layout = page.locator('.review-layout');
  await expect(layout).not.toHaveClass(/is-mobile-detail-open/);
  await expect(page.locator('.review-detail-pane')).toBeHidden();
  await expect(page.locator('.review-queue-pane')).toBeVisible();

  await page.getByRole('button', { name: /Rebase Field connect-proposal descriptor validation/ }).click();
  await expect(layout).toHaveClass(/is-mobile-detail-open/);
  await expect(page.locator('.review-queue-pane')).toBeHidden();
  await expect(page.locator('.review-detail-pane')).toBeVisible();

  // Sticky decision bar is reachable on mobile and reflects the stale base with a reason.
  await expect(page.getByRole('group', { name: 'Review decision' })).toBeVisible();
  await expect(decisionActions(page).getByRole('button', { name: 'Accept', exact: true })).toBeDisabled();
  await expect(page.locator('.review-accept-reason')).toContainText(/re-evaluate or rebase/i);

  await page.getByRole('button', { name: '← Back to queue' }).click();
  await expect(layout).not.toHaveClass(/is-mobile-detail-open/);
  await expect(page.locator('.review-queue-pane')).toBeVisible();
  await page.screenshot({ path: 'test-results/TEST-006-review-mobile-390x844.png', fullPage: true });
});
