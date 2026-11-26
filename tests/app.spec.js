// Smoke tests for the main flows, run against demo mode on a phone viewport.
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.g*/**', r => r.abort()); // offline-friendly
  await page.goto('/');
  await expect(page.locator('.card').first()).toBeVisible();
});

test('shows the three filter tiles with counts and lead cards', async ({ page }) => {
  const tiles = page.locator('.tile');
  await expect(tiles).toHaveCount(3);
  await expect(tiles.nth(0)).toContainText('Today’s leads');
  await expect(tiles.nth(1)).toContainText('Not connected');
  await expect(tiles.nth(2)).toContainText('Interested');
  await expect(page.locator('.card .ph').first()).toHaveText(/^\+91 \d{5} \d{5}$/);
});

test('Not connected tile only lists New / No answer leads', async ({ page }) => {
  await page.locator('.tile').nth(1).click();
  await expect(page.locator('#lt')).toHaveText('Not connected');
  const statuses = await page.locator('.card select').evaluateAll(els => els.map(e => e.value));
  expect(statuses.length).toBeGreaterThan(0);
  for (const s of statuses) expect(['New', 'No answer']).toContain(s);
});

test('status dropdown saves instantly', async ({ page }) => {
  const sel = page.locator('.card select').first();
  await sel.selectOption('Visit booked');
  await expect(page.locator('#toast')).toContainText('Visit booked');
});

test('after a call, the popup asks how it went and saves', async ({ page }) => {
  await page.locator('.tile').nth(1).click();
  const first = page.locator('.card').first();
  const name = await first.locator('.nm').innerText();
  // Don't actually dial: headless Chrome opens a blocking "open phone app?" prompt for tel: links.
  // The app's own click handler still runs, exactly like on a phone.
  await page.evaluate(() => document.addEventListener('click', e => { if (e.target.closest('a[href^="tel:"]')) e.preventDefault(); }, true));
  await first.locator('.call').click();
  await expect(page.locator('#sheet')).toContainText('How did the call go?', { timeout: 5000 });
  await page.locator('[data-s="Interested"]').click();
  await page.locator('#note').fill('Wants 2BHK, visiting Saturday');
  await page.locator('#save').click();
  await expect(page.locator('#toast')).toHaveText('Saved');
  await page.locator('.tile').nth(2).click();
  const card = page.locator('.card', { hasText: name });
  await expect(card).toContainText('1 call');
  await expect(card).toContainText('Wants 2BHK');
});

test('WhatsApp opens wa.me with a prefilled Ibna message', async ({ page }) => {
  const href = await page.locator('[data-wa]').first().getAttribute('href');
  expect(href).toMatch(/^https:\/\/wa\.me\/91\d{10}\?text=/);
  expect(decodeURIComponent(href)).toContain('Ibna apartments');
});

test('lead detail opens and closes', async ({ page }) => {
  await page.locator('.det').first().click();
  await expect(page.locator('#page')).toHaveClass(/on/);
  await expect(page.locator('#pageIn')).toContainText('Lead details');
  await page.locator('[data-back]').click();
  await expect(page.locator('#page')).not.toHaveClass(/on/);
});

test('follow-ups and stats tabs render', async ({ page }) => {
  await page.locator('[data-v="vFollow"]').click();
  await expect(page.locator('#flist')).toContainText('Overdue');
  await page.locator('[data-v="vStats"]').click();
  await expect(page.locator('#stats')).toContainText('Reached');
});
