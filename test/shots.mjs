/**
 * Render card states against test/demo.html for review.
 *
 *   npm run shots     # writes test/shots/
 *
 * The e2e suite asserts behaviour; this just produces pictures, for when the
 * question is whether a layout reads well rather than whether it works.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { buildTestExtension } from './build-test-extension.mjs';

const HERE = '/home/user/design-tool/test';
const OUT = path.join(HERE, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const EXT = buildTestExtension();

const ctx = await chromium.launchPersistentContext('', {
  headless: true, channel: 'chromium', viewport: { width: 1280, height: 860 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent('serviceworker'));
const page = await ctx.newPage();
await page.goto('file://' + path.join(HERE, 'demo.html'));
await page.waitForTimeout(500);

await sw.evaluate(async () => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return chrome.tabs.sendMessage(tab.id, { type: 'designtool:toggle', armed: true });
});
await page.waitForTimeout(400);

const glide = async (x, y) => { await page.mouse.move(x, y, { steps: 20 }); await page.waitForTimeout(400); };
const at = async (sel, dx = 40, dy = 20) => {
  const n = page.locator(sel).first();
  await n.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const b = await n.boundingBox();
  return [b.x + dx, b.y + dy];
};
// card occupies the top-right
const card = { x: 1280 - 330 - 14 - 6, y: 8, width: 348, height: 780 };
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png`, clip: card });

// 1. tokens on a heading
await glide(...(await at('#hero-title', 120, 24)));
await shot('1-tokens-text');

// 2. tokens on a button (background + border + colour)
await glide(...(await at('#cta', 60, 22)));
await shot('2-tokens-button');

// 3. measurement between two cards
const [ax, ay] = await at('#card-a', 80, 6);
await glide(ax, ay);
await page.mouse.click(ax, ay);
await page.waitForTimeout(250);
await glide(...(await at('#card-b', 80, 6)));
await shot('3-measure-boxes');

// 4. measurement heading vs card (text spec vs box)
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
const [tx, ty] = await at('#hero-title', 120, 24);
await glide(tx, ty);
await page.mouse.click(tx, ty);
await page.waitForTimeout(250);
await glide(...(await at('#card-a', 80, 6)));
await shot('4-measure-text-vs-box');

// 5. media: an image
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
await glide(...(await at('#photo', 60, 50)));
await shot('5-media-image');

// 6. media: background video
await glide(...(await at('#bgvideo', 80, 50)));
await shot('6-media-video');

await ctx.close();
console.log('done');
