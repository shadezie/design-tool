/**
 * Render panel states against test/demo.html for review.
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
// The panel is docked to the right edge at full height.
const panel = { x: 1280 - 360 - 12, y: 0, width: 372, height: 860 };
const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, clip: panel });
  await page.screenshot({ path: `${OUT}/${name}-page.png` });
};

/** Click a panel control. The shadow root is closed, so go through the isolated world. */
const pressPanel = (selector) =>
  sw.evaluate(async (selector) => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'ISOLATED',
      args: [selector],
      func: (selector) => window.__designtool.overlay.panel.querySelector(selector)?.click(),
    });
  }, selector);

/** Lock A, then hold the modifier over B, which is what shows a measurement. */
async function measure(selA, selB) {
  const [ax, ay] = await at(selA, 80, 6);
  await glide(ax, ay);
  await page.mouse.click(ax, ay);
  await page.waitForTimeout(250);
  await page.keyboard.down('Control');
  await glide(...(await at(selB, 80, 6)));
}
async function release() {
  await page.keyboard.up('Control');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}

// 0. first frame, before anything is hovered
await shot('0-first-run');

// 1. tokens on a heading
await glide(...(await at('#hero-title', 120, 24)));
await shot('1-tokens-text');

// 2. tokens on a button (background + border + colour)
await glide(...(await at('#cta', 60, 22)));
await shot('2-tokens-button');

// 3. measurement between two cards
await measure('#card-a', '#card-b');
await shot('3-measure-boxes');
await release();

// 4. measurement heading vs card (text spec vs box)
await measure('#hero-title', '#card-a');
await shot('4-measure-text-vs-box');
await release();

// 5. media: an image
await glide(...(await at('#photo', 60, 50)));
await shot('5-media-image');

// 6. media: background video
await glide(...(await at('#bgvideo', 80, 50)));
await shot('6-media-video');

// Light theme, then re-shoot the key states.
await pressPanel('.theme');
await page.waitForTimeout(400);

await glide(...(await at('#hero-title', 120, 24)));
await shot('7-light-tokens');

await measure('#card-a', '#card-b');
await shot('8-light-measure');
await release();

await ctx.close();
console.log('done');
