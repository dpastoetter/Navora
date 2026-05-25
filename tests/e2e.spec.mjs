import { test, expect } from '@playwright/test';
import LZString from 'lz-string';

test.describe('Navora E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('navora-draft-v1'));
  });

  test('home loads with hero and samples', async ({ page }) => {
    await expect(page.locator('.home-logo')).toHaveText('Navora');
    await expect(page.locator('.sample-card')).toHaveCount(3);
    await expect(page.locator('[name=destination]')).toBeVisible();
  });

  test('destination search starts a trip in builder', async ({ page }) => {
    await page.fill('[name=destination]', 'Paris, France');
    await page.click('button[type=submit]');
    await expect(page).toHaveURL(/#plan/);
    await expect(page.locator('.builder')).toBeVisible();
    await expect(page.locator('.trip-title-input')).toHaveValue(/Paris/);
  });

  test('sample trip opens builder with activities', async ({ page }) => {
    await page.click('[data-action=load-sample][data-sample-index="0"]');
    await expect(page).toHaveURL(/#plan/);
    await expect(page.locator('.activity-card')).toHaveCount(3);
    await expect(page.locator('.activity-photo, .photo-placeholder').first()).toBeVisible();
  });

  test('shareview shows timeline and hero', async ({ page }) => {
    await page.click('[data-action=load-sample][data-sample-index="0"]');
    await page.locator('.builder-sidebar [data-action=go-view]').click();
    await expect(page).toHaveURL(/#view/);
    await expect(page.locator('.shareview')).toBeVisible();
    await expect(page.locator('.share-hero-content h1')).toContainText(/Tokyo/i);
    await expect(page.locator('.timeline-item').first()).toBeVisible({ timeout: 15000 });
  });

  test('theme toggle switches data-theme', async ({ page }) => {
    await page.click('[data-action=load-sample][data-sample-index="1"]');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.locator('.builder-sidebar [data-action=toggle-theme]').click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('add activity and undo', async ({ page }) => {
    await page.click('[data-action=load-sample][data-sample-index="2"]');
    const before = await page.locator('.activity-card').count();
    await page.locator('[data-action=add-activity]').first().click();
    await expect(page.locator('.activity-card')).toHaveCount(before + 1);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('[data-action=delete-activity]').first().click();
    await expect(page.locator('.activity-card')).toHaveCount(before);
    await page.locator('[data-action=undo]').click();
    await expect(page.locator('.activity-card')).toHaveCount(before + 1);
  });

  test('delete activity can be cancelled', async ({ page }) => {
    await page.click('[data-action=load-sample][data-sample-index="2"]');
    const before = await page.locator('.activity-card').count();
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('[data-action=delete-activity]').first().click();
    await expect(page.locator('.activity-card')).toHaveCount(before);
  });

  test('shortcuts modal opens with ?', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.locator('#modal-root .modal')).toBeVisible();
    await expect(page.locator('#modal-title')).toContainText(/keyboard shortcuts/i);
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-root')).toBeHidden();
  });

  test('day template applies to active day', async ({ page }) => {
    await page.click('[data-action=plan-blank]');
    await page.selectOption('[data-action=apply-template]', 'food');
    await expect(page.locator('.activity-card')).toHaveCount(3);
    await expect(page.locator('.pill-food')).toHaveCount(3);
  });

  test('copy share link includes view hash and d param', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.click('[data-action=load-sample][data-sample-index="0"]');
    await page.locator('.builder-sidebar [data-action=copy-share]').click();
    await expect(page.locator('#toast')).toContainText(/copied/i, { timeout: 5000 });
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toMatch(/#view/);
    expect(clip).toMatch(/[?&]d=/);
  });

  test('encoded URL hydrates shareview on fresh load', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.click('[data-action=load-sample][data-sample-index="0"]');
    await page.locator('.builder-sidebar [data-action=copy-share]').click();
    await page.waitForTimeout(500);
    const url = await page.evaluate(() => navigator.clipboard.readText());
    await page.goto('/');
    await page.evaluate(u => { window.location.href = u; }, url);
    await expect(page).toHaveURL(/#view/);
    await expect(page.locator('.share-hero-content h1')).toContainText(/Tokyo/i, { timeout: 10000 });
  });

  test('export JSON downloads trip file', async ({ page }) => {
    await page.click('[data-action=load-sample][data-sample-index="0"]');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.builder-sidebar [data-action=export-json]').click()
    ]);
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });

  test('shareview toolbar has export and print actions', async ({ page }) => {
    await page.click('[data-action=load-sample][data-sample-index="0"]');
    await page.locator('.builder-sidebar [data-action=go-view]').click();
    await expect(page.locator('[data-action=export-card]')).toBeVisible();
    await expect(page.locator('[data-action=export-ics]')).toBeVisible();
    await expect(page.locator('[data-action=print-view]')).toBeVisible();
  });

  test('mobile tabs switch panels', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('[data-action=load-sample][data-sample-index="0"]');
    await page.click('[data-action=mobile-tab][data-tab=map]');
    await expect(page.locator('#map-leaflet-mobile')).toBeVisible();
    await page.click('[data-action=mobile-tab][data-tab=share]');
    await expect(page.locator('.share-preview')).toBeVisible();
  });

  test('keyboard shortcut switches days', async ({ page }) => {
    await page.click('[data-action=load-sample][data-sample-index="0"]');
    await page.keyboard.press('2');
    await expect(page.locator('.day-item.active span')).toContainText('Day 2');
  });

  test('plan your own returns to home', async ({ page }) => {
    await page.click('[data-action=load-sample][data-sample-index="0"]');
    await page.locator('.builder-sidebar [data-action=go-view]').click();
    await page.click('[data-action=plan-own]');
    await expect(page.locator('.home')).toBeVisible();
  });
});

test.describe('Unit checks', () => {
  test('LZ roundtrip preserves trip', () => {
    const trip = {
      title: 'Test',
      destination: 'X',
      days: [{ id: '1', label: 'Day 1', date: '', blocks: { morning: [], afternoon: [], evening: [] } }]
    };
    const payload = JSON.stringify({ t: trip, th: 'dark' });
    const enc = LZString.compressToEncodedURIComponent(payload);
    const dec = JSON.parse(LZString.decompressFromEncodedURIComponent(enc));
    expect(dec.t.title).toBe('Test');
  });
});
