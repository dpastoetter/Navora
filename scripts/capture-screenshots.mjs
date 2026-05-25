#!/usr/bin/env node
/**
 * Capture README screenshots. Run: npm run preview & npm run screenshots
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'docs', 'screenshots');
const base = process.env.SCREENSHOT_BASE || 'http://localhost:4173';

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

async function shot(name, opts = {}) {
  const path = join(outDir, name);
  await page.screenshot({ path, ...opts });
  console.log('Wrote', path);
}

// Desktop
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await shot('home.png');

await page.click('[data-action="load-sample"][data-sample-index="0"]');
await page.waitForURL(/#plan/, { timeout: 10000 });
await page.waitForTimeout(1200);
await shot('builder.png', { fullPage: true });

await page.click('[data-action="go-view"]');
await page.waitForURL(/#view/, { timeout: 10000 });
await page.waitForTimeout(2000);
await shot('shareview.png', { fullPage: true });

// Mobile home
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await shot('home-mobile.png', { fullPage: true });

await browser.close();
console.log('Done.');
