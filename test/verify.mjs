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
import { buildTestExtension } from './build-test-extension.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// The shipped manifest asks only for activeTab, which needs a real toolbar
// click. Playwright cannot click browser chrome, so drive a patched copy.
const EXT = buildTestExtension();
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

/**
 * Read the card's text.
 *
 * The overlay lives in a closed shadow root, so page.evaluate cannot reach it
 * and every other check here probes pixels instead. executeScript with
 * world: 'ISOLATED' lands in the same world as the content script, which is
 * the one place `window.__designtool` exists. No test-only hook in the
 * shipped code, and the closed root stays closed to the page.
 */
const cardText = () =>
  sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'ISOLATED',
      func: () => window.__designtool?.overlay?.card?.textContent || '',
    });
    return res.result;
  });

/**
 * Scroll an element into view, then hand back a viewport point inside it.
 * boundingBox() is viewport-relative, so a box below the fold names
 * coordinates the mouse can never reach.
 */
async function reach(selector, dx = 40, dy = 20) {
  const node = page.locator(selector).first();
  await node.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const box = await node.boundingBox();
  return { x: box.x + dx, y: box.y + dy, box };
}

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

// ---- picking past overlays -----------------------------------------------
// Sites cover whole cards with a click target. An invisible one (opacity 0)
// must never win a hover; a painted one must be reachable past with the
// modifier. Assert on the highlight itself: if the cover is picked, the whole
// tile is tinted, and a pixel well below the heading changes.

const probe = (x, y) => page.screenshot({ clip: { x, y, width: 1, height: 1 } });
const park = () => glide({ x: 200, y: 79 }); // the h1, far from the tiles

async function tileProbe(id) {
  const box = await page.locator(id).boundingBox();
  return { box, at: { x: box.x + 20, y: box.y + box.height - 20 } };
}

const plain = await tileProbe('#tile-plain');
const scrim = await tileProbe('#tile-scrim');

await park();
const plainBase = await probe(plain.at.x, plain.at.y);
const scrimBase = await probe(scrim.at.x, scrim.at.y);

const hPlain = await page.locator('#h-plain').boundingBox();
await glide({ x: hPlain.x + 60, y: hPlain.y + 12 });
check(
  'an opacity-0 overlay never wins the hover',
  plainBase.equals(await probe(plain.at.x, plain.at.y))
);

const hScrim = await page.locator('#h-scrim').boundingBox();
await glide({ x: hScrim.x + 60, y: hScrim.y + 12 });
check(
  'a painted scrim is picked by default',
  !scrimBase.equals(await probe(scrim.at.x, scrim.at.y))
);

await page.keyboard.down('Control');
await page.mouse.move(hScrim.x + 61, hScrim.y + 12);
await page.waitForTimeout(300);
check(
  'the modifier reaches the deepest layer under the cursor',
  scrimBase.equals(await probe(scrim.at.x, scrim.at.y))
);
await page.screenshot({ path: `${OUT}/deep-select.png` });
await page.keyboard.up('Control');
await page.waitForTimeout(200);

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
// Empty canvas below the content, so this stays page background as the
// fixture grows.
const pageGround = await probe(30, 706);
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

// ---- theme, drag, resize -------------------------------------------------
// Every check here compares against the card's own header colour rather than
// the page, because a locked element tints the page and would poison the probe.
await page.keyboard.press('Escape'); // clear any A/B lock
await page.waitForTimeout(200);

const DOCK_LEFT = VW - 330 - 14; // card width 330, MARGIN 14
const headerY = 34;

const darkCard = await probe(DOCK_LEFT + 6, headerY);
// Header from the right edge: 10px padding, close (22), gap, units (98), gap,
// theme (22).
const THEME_X = VW - 167;
const GRIP_X = VW - 323;
const CLOSE_X = VW - 35;

await glide({ x: THEME_X, y: headerY });
await page.mouse.click(THEME_X, headerY);
await page.waitForTimeout(350);
const surface = await probe(DOCK_LEFT + 6, headerY);
check('theme toggle repaints the card', !darkCard.equals(surface));
await page.screenshot({ path: `${OUT}/theme-light.png` });

// Drag the card by its grip to a spot a wide-screen user would pick.
const grip = { x: GRIP_X, y: headerY };
const dropped = { x: 520, y: 300 };
const pinned = { left: dropped.x - (grip.x - DOCK_LEFT), top: dropped.y - (headerY - 14) };

await glide(grip);
await page.mouse.down();
await page.mouse.move(dropped.x, dropped.y, { steps: 20 });
await page.mouse.up();
await page.waitForTimeout(350);
check('card moved to where it was dropped', surface.equals(await probe(pinned.left + 6, pinned.top + 20)));
check('card left the dock', !surface.equals(await probe(DOCK_LEFT + 6, headerY)));
await page.screenshot({ path: `${OUT}/dragged.png` });

// Resize from the bottom-right corner. The card's height is capped 10px from
// the viewport bottom (overlay.setCardPosition), and it is taller than that
// here, so the handle sits at a position we can compute rather than hunt for.
const VH = page.viewportSize().height;
const cardRight = pinned.left + 330;
const cardBottom = VH - 10;
const corner = { x: cardRight - 8, y: cardBottom - 8 };
const grew = { x: pinned.left + 458, y: pinned.top + 100 };

check('the card is not that wide yet', !surface.equals(await probe(grew.x, grew.y)));

await page.mouse.move(corner.x, corner.y);
await page.mouse.down();
await page.mouse.move(corner.x + 140, corner.y - 40, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(350);
check('card resizes from its corner', surface.equals(await probe(grew.x, grew.y)));
await page.screenshot({ path: `${OUT}/resized.png` });

// The stylesheet caps the card at 640px. A JS maximum wider than that silently
// ignored the last stretch of the drag and stored an unrenderable width.
const beyondMax = { x: pinned.left + 660, y: pinned.top + 20 };
await page.mouse.move(corner.x + 140, corner.y - 40);
await page.mouse.down();
await page.mouse.move(corner.x + 600, corner.y - 40, { steps: 15 });
await page.mouse.up();
await page.waitForTimeout(300);
check('resize stops at the width the stylesheet allows', !surface.equals(await probe(beyondMax.x, beyondMax.y)));

// The rendered width is capped by CSS either way, so the giveaway is what got
// stored: a JS maximum wider than the stylesheet persists a width the card can
// never render, and the handle detaches from the cursor for that last stretch.
const storedSize = (await sw.evaluate(() => chrome.storage.local.get('designtool.prefs')))?.['designtool.prefs']?.size;
check(
  'the stored width is one the card can render',
  storedSize != null && storedSize.width <= 640,
  `stored ${JSON.stringify(storedSize)}`
);

// Releasing a drag outside the card used to be swallowed by the capture-phase
// suppressor, leaving the card glued to the cursor with no button held.
const pinnedGrip = { x: pinned.left + 22, y: pinned.top + 20 };
await page.mouse.move(pinnedGrip.x, pinnedGrip.y, { steps: 12 });
await page.mouse.down();
await page.mouse.move(2, 300, { steps: 25 }); // past the left edge, so the
await page.mouse.up();                        // release lands on the page
await page.waitForTimeout(300);
const parked = await probe(10, 320);
check('card follows the drag to the screen edge', surface.equals(parked));
await page.mouse.move(700, 520, { steps: 25 });
await page.waitForTimeout(300);
check('card stops when the button is released', surface.equals(await probe(10, 320)));

// Put it back where the rest of the run expects it.
await page.mouse.move(26, 300, { steps: 8 });
await page.mouse.down();
await page.mouse.move(pinned.left + 22, pinned.top + 20, { steps: 20 });
await page.mouse.up();
await page.waitForTimeout(300);

// Double-clicking the grip hands the card back to automatic docking.
await page.mouse.dblclick(pinned.left + 22, pinned.top + 20);
await page.waitForTimeout(400);
check('double-click on the grip re-docks the card', !surface.equals(await probe(pinned.left + 6, pinned.top + 20)));

// ---- the close control ---------------------------------------------------
await glide({ x: CLOSE_X, y: headerY });
await page.mouse.click(CLOSE_X, headerY);
await page.waitForTimeout(400);
check(
  'close button stops the tool',
  await page.evaluate(() => !document.getElementById('designtool-root'))
);
await arm(); // back on for the rest of the run
await page.waitForTimeout(300);

// ---- measurement ---------------------------------------------------------
await page.keyboard.press('u'); // back to px for a readable screenshot
await page.keyboard.press('u');
await page.waitForTimeout(200);
const c2 = await page.locator('#c2').boundingBox();
await glide({ x: c1.x + 40, y: c1.y + 40 });
await page.mouse.click(c1.x + 40, c1.y + 40);
await glide({ x: c2.x + 40, y: c2.y + 40 });
await page.screenshot({ path: `${OUT}/gap.png` });


// ---- media ---------------------------------------------------------------
// The measurement above left an element locked, and a locked card describes
// that element however you hover. Back to armed first.
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

// A 4x4 PNG drawn at 80px. Format, intrinsic size and the fact that it is
// being upscaled are all things the DOM states nowhere in one place.
await glide(await reach('#png', 40, 40));
const pngCard = await cardText();
check('media block names the format', pngCard.includes('PNG'), pngCard.slice(0, 80));
check('media block reports the intrinsic size', /4\s*x\s*4/.test(pngCard));
check('media block flags an upscaled asset', pngCard.includes('upscaled'));
await page.screenshot({ path: `${OUT}/media-image.png` });

await glide(await reach('#clip', 60, 40));
const clipCard = await cardText();
check(
  'autoplay + muted + loop reads as a background video',
  clipCard.includes('background loop'),
  clipCard.slice(0, 80)
);
check('video format comes from the source', clipCard.includes('WEBM'));
check('playback flags are listed', clipCard.includes('autoplay') && clipCard.includes('muted'));

await glide(await reach('#player', 60, 40));
const playerCard = await cardText();
check(
  'a video with controls is not called a background loop',
  playerCard.includes('Video') && !playerCard.includes('background loop')
);
check('MP4 is reported as MP4', playerCard.includes('MP4'));
await page.screenshot({ path: `${OUT}/media-video.png` });

// ---- design tokens -------------------------------------------------------
// One element sets its colour through var(), the other hardcodes the same hex.
// The first is found by reading the rule, the second only by matching values,
// so between them they cover both resolution paths.
await glide(await reach('#tokened', 60, 10));
const tokenedCard = await cardText();
check('a var() colour reports its token name', tokenedCard.includes('--color-brand'), tokenedCard.slice(0, 120));
check('the raw value is still shown next to it', tokenedCard.includes('#2A51FD'));
await page.screenshot({ path: `${OUT}/token-exact.png` });

await glide(await reach('#valued', 60, 10));
const valuedCard = await cardText();
check(
  'a hardcoded colour is matched back to its token',
  valuedCard.includes('--color-brand'),
  valuedCard.slice(0, 120)
);

// A colour the palette does not define must stay a plain hex: inventing a
// token name for it would be worse than showing nothing.
await glide(await reach('.tile-d', 40, 8));
const plainCard = await cardText();
check('a colour with no token stays a raw hex', !plainCard.includes('--color-'), plainCard.slice(0, 120));

// ---- both measured elements are described --------------------------------
// A is the h1 (text), B is a flex container, so the two columns should carry
// different vocabularies: a type spec against a box.
// No Escape here: the state is already armed, and Escape while armed exits
// the tool rather than clearing a selection.
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
const titleAt = await reach('#title', 60, 20);
await glide(titleAt);
await page.mouse.click(titleAt.x, titleAt.y);
await page.waitForTimeout(250);
await glide(await reach('#c1', 40, 40));
const pairCard = await cardText();
check('the measurement names both elements', pairCard.includes('h1#title') && pairCard.includes('.card'), pairCard.slice(0, 160));
check('the text side shows its type spec', pairCard.includes('Size') && pairCard.includes('Weight'));
check('the box side shows width and height', /W[\d.]/.test(pairCard) && /H[\d.]/.test(pairCard));
await page.screenshot({ path: `${OUT}/pair-summary.png` });
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

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

// MV3 evicts an idle service worker, and the armed-per-tab state used to be an
// in-memory Map that went with it. It now lives in session storage. The Esc
// above sends "disarmed" to the worker, which is the reachable end of that
// path: if the key is present, the worker wrote it.
const session = await sw.evaluate(() => chrome.storage.session.get('armedTabs'));
check('the worker persists armed state to session storage', session?.armedTabs !== undefined);

check('no console errors', errors.length === 0, errors.join(' | '));

await ctx.close();
console.log(failures.length ? `\n${failures.length} FAILED` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
