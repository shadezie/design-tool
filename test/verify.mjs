/**
 * End-to-end checks against a real Chromium with the extension loaded.
 *
 *   node test/verify.mjs
 *
 * Screenshots land in test/out/ for eyeballing. The important assertion is the
 * approach test: v1 shipped a card that dodged the cursor, and scripted clicks
 * did not catch it because they teleport the mouse. Everything here moves the
 * way a hand does.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(HERE, '..');
const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });

const failures = [];
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures.push(name);
}

const ctx = await chromium.launchPersistentContext('', {
  headless: true,
  channel: 'chromium',
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});

const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent('serviceworker', { timeout: 15000 }));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));

await page.goto('file://' + path.join(HERE, 'fixture.html'));
await page.waitForTimeout(500);

const arm = () =>
  sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return chrome.tabs.sendMessage(tab.id, { type: 'designtool:toggle', armed: true });
  });

const { width: VW } = page.viewportSize();

/** Move like a hand: many small steps, not a teleport. */
async function glide(to, steps = 25) {
  await page.mouse.move(to.x, to.y, { steps });
  await page.waitForTimeout(250);
}

await arm();
check('arms', await page.evaluate(() => !!document.getElementById('designtool-root')));

// ---- hero tiles ----------------------------------------------------------
await glide({ x: 200, y: 79 }); // the h1
await page.screenshot({ path: `${OUT}/tiles-text.png` });
await glide({ x: 640, y: 240 }); // the flex container
await page.screenshot({ path: `${OUT}/tiles-container.png` });
const pic = await page.locator('#pic').boundingBox();
await glide({ x: pic.x + 40, y: pic.y + 30 });
await page.screenshot({ path: `${OUT}/tiles-image.png` });

// ---- the approach test ---------------------------------------------------
// Lock an element on the left, so the card docks to the right.
const c1 = await page.locator('#c1').boundingBox();
await glide({ x: c1.x + 40, y: c1.y + 40 });
await page.mouse.click(c1.x + 40, c1.y + 40);
await page.waitForTimeout(300);

// Reach for the unit toggle in the docked card, slowly.
const target = { x: VW - 70, y: 36 };
await glide(target, 30);

// Probe single pixels. Two 1x1 screenshots of the same colour encode to
// identical bytes, so equality against a known page-background pixel says
// whether the card is at that spot, with no image decoding needed.
const probe = (x, y) => page.screenshot({ clip: { x, y, width: 1, height: 1 } });
const pageGround = await probe(VW - 500, 420);
check('card is still docked right after the approach', !pageGround.equals(await probe(VW - 160, 30)));
check('card did not flee to the left', pageGround.equals(await probe(30, 30)));

// ---- interact with the card ----------------------------------------------
const beforeClick = await page.screenshot({ clip: { x: VW - 320, y: 0, width: 320, height: 400 } });
await page.mouse.click(target.x, target.y);
await page.waitForTimeout(350);
const afterClick = await page.screenshot({ clip: { x: VW - 320, y: 0, width: 320, height: 400 } });
check('unit toggle responds to a click', !beforeClick.equals(afterClick));
await page.screenshot({ path: `${OUT}/units-switched.png` });

// U cycles units without reaching for the card at all.
const beforeKey = await page.screenshot({ clip: { x: VW - 320, y: 0, width: 320, height: 400 } });
await page.keyboard.press('u');
await page.waitForTimeout(300);
const afterKey = await page.screenshot({ clip: { x: VW - 320, y: 0, width: 320, height: 400 } });
check('U cycles units', !beforeKey.equals(afterKey));

// ---- measurement ---------------------------------------------------------
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
await page.keyboard.press('u'); // back to px for a readable screenshot
await page.keyboard.press('u');
await page.waitForTimeout(200);
const c2 = await page.locator('#c2').boundingBox();
await glide({ x: c1.x + 40, y: c1.y + 40 });
await page.mouse.click(c1.x + 40, c1.y + 40);
await glide({ x: c2.x + 40, y: c2.y + 40 });
await page.screenshot({ path: `${OUT}/gap.png` });

// ---- the page stays inert while armed ------------------------------------
const link = await page.locator('#link').boundingBox();
await glide({ x: link.x + 40, y: link.y + 8 });
await page.mouse.click(link.x + 40, link.y + 8);
await page.waitForTimeout(500);
check('link does not navigate while armed', page.url().endsWith('fixture.html'), page.url().split('/').pop());

// ---- teardown ------------------------------------------------------------
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
check(
  'overlay fully removed after Esc Esc',
  await page.evaluate(() => !document.getElementById('designtool-root'))
);

check('no console errors', errors.length === 0, errors.join(' | '));

await ctx.close();
console.log(failures.length ? `\n${failures.length} FAILED` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
