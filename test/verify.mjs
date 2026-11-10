/**
 * End-to-end checks against a real Chromium with the extension loaded.
 *
 *   node test/verify.mjs
 *
 * Screenshots land in test/out/ for eyeballing. Everything here moves the way
 * a hand does: v1 shipped a card that dodged the cursor, and scripted clicks
 * did not catch it because they teleport the mouse.
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
  viewport: { width: 1280, height: 800 },
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

const { width: VW, height: VH } = page.viewportSize();
const PANEL_W = 360;

/**
 * Ask the panel a question.
 *
 * The overlay lives in a closed shadow root, so page.evaluate cannot reach it.
 * executeScript with world: 'ISOLATED' lands in the same world as the content
 * script, which is the one place `window.__designtool` exists. No test-only
 * hook in the shipped code, and the closed root stays closed to the page.
 */
const ask = (kind, arg) =>
  sw.evaluate(
    async ([kind, arg]) => {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'ISOLATED',
        args: [kind, arg ?? null],
        func: (kind, arg) => {
          const overlay = window.__designtool?.overlay;
          const panel = overlay?.panel;
          if (!panel) return null;
          const rectOf = (node) => {
            if (!node) return null;
            const b = node.getBoundingClientRect();
            return { x: b.x, y: b.y, width: b.width, height: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
          };
          if (kind === 'text') return panel.textContent;
          if (kind === 'rect') return rectOf(arg ? panel.querySelector(arg) : panel);
          if (kind === 'count') return overlay.shadowRoot.querySelectorAll(arg).length;
          if (kind === 'theme') return panel.parentNode.getAttribute('data-theme');
          if (kind === 'side') return panel.getAttribute('data-side');
          if (kind === 'pressed') return panel.querySelector('.units [aria-pressed="true"]')?.textContent;
          if (kind === 'folded') {
            const title = [...panel.querySelectorAll('.sec-title')].find((n) => n.textContent === arg);
            return title ? title.getAttribute('aria-expanded') === 'false' : null;
          }
          if (kind === 'title') {
            const title = [...panel.querySelectorAll('.sec-title')].find((n) => n.textContent === arg);
            return rectOf(title);
          }
          if (kind === 'crumb') return rectOf([...panel.querySelectorAll('.crumb:not(.is-current)')].pop());
          if (kind === 'crumbs') return [...panel.querySelectorAll('.crumb')].map((n) => n.textContent);
          if (kind === 'audit') {
            const sizes = [];
            for (const n of panel.querySelectorAll('*')) {
              if (![...n.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim())) continue;
              if (n.getClientRects().length) sizes.push(parseFloat(getComputedStyle(n).fontSize));
            }
            const buttons = [...panel.querySelectorAll('button')].filter((n) => n.getClientRects().length);
            const copies = [...panel.querySelectorAll('.copy')];
            return {
              minFont: Math.min(...sizes),
              minButton: Math.min(...buttons.map((n) => n.getBoundingClientRect().height)),
              copies: copies.length,
              focusableCopies: copies.filter((n) => n.tabIndex === 0).length,
            };
          }
          return null;
        },
      });
      return res.result;
    },
    [kind, arg]
  );

const panelText = () => ask('text');

/** Click a control inside the panel, approaching it like a hand would. */
async function press(selectorOrRect) {
  const rect = typeof selectorOrRect === 'string' ? await ask('rect', selectorOrRect) : selectorOrRect;
  await page.mouse.move(rect.cx, rect.cy, { steps: 15 });
  await page.mouse.click(rect.cx, rect.cy);
  await page.waitForTimeout(300);
}

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
await page.waitForTimeout(300);
check('arms', await page.evaluate(() => !!document.getElementById('designtool-root')));

// ---- the panel is there before anything is hovered -----------------------
// v1 showed nothing until the first hover: no sign the tool was on, and no
// hint of what to do with it.
const docked = await ask('rect');
check(
  'the panel is docked to the right edge at full height',
  docked.width === PANEL_W && Math.round(docked.x) === VW - PANEL_W && docked.y === 0 && docked.height === VH,
  JSON.stringify(docked)
);
const firstFrame = await panelText();
check('a new user is told how it works before hovering', firstFrame.includes('How it works') && firstFrame.includes('Hover'));
check('the footer says what a click will do', firstFrame.includes('Click an element to lock it.'));
await page.screenshot({ path: `${OUT}/panel-empty.png` });

// ---- hero tiles ----------------------------------------------------------
await glide({ x: 200, y: 79 }); // the h1
await page.screenshot({ path: `${OUT}/tiles-text.png` });
await glide({ x: 640, y: 240 }); // the flex container
await page.screenshot({ path: `${OUT}/tiles-container.png` });
const pic = await page.locator('#pic').boundingBox();
await glide({ x: pic.x + 40, y: pic.y + 30 });
await page.screenshot({ path: `${OUT}/tiles-image.png` });

// ---- the panel does not move ---------------------------------------------
// The floating card changed height with every element and could be dragged,
// pinned and resized. The panel has one place and one size.
const afterHover = await ask('rect');
check('hovering does not move or resize the panel', JSON.stringify(afterHover) === JSON.stringify(docked));
await glide({ x: VW - 180, y: 300 }, 30);
check('reaching for the panel does not move it', JSON.stringify(await ask('rect')) === JSON.stringify(docked));

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
  'with nothing locked, the modifier reaches the deepest layer under the cursor',
  scrimBase.equals(await probe(scrim.at.x, scrim.at.y))
);
await page.screenshot({ path: `${OUT}/deep-select.png` });
await page.keyboard.up('Control');
await page.waitForTimeout(200);

// ---- panel controls ------------------------------------------------------
const c1 = await page.locator('#c1').boundingBox();
const c2 = await page.locator('#c2').boundingBox();
await glide({ x: c1.x + 40, y: c1.y + 40 });
await page.mouse.click(c1.x + 40, c1.y + 40);
await page.waitForTimeout(300);

await press('.units [data-unit="rem"]');
check('unit toggle responds to a click', (await ask('pressed')) === 'rem');
await page.screenshot({ path: `${OUT}/units-switched.png` });

// U cycles units without reaching for the panel at all.
await glide({ x: c1.x + 40, y: c1.y + 40 });
await page.keyboard.press('u');
await page.waitForTimeout(300);
check('U cycles units', (await ask('pressed')) === 'em');
await page.keyboard.press('u'); // back to px for readable screenshots
await page.waitForTimeout(200);

await press('.theme');
check('theme toggle switches to light', (await ask('theme')) === 'light');
await page.screenshot({ path: `${OUT}/theme-light.png` });
await press('.theme');
check('and back to dark', (await ask('theme')) === 'dark');

// While the panel sits on the page, whatever is under it cannot be hovered.
// Flipping sides is how you reach it.
await press('.side');
const flipped = await ask('rect');
check('the panel docks to the left on request', (await ask('side')) === 'left' && flipped.x === 0, JSON.stringify(flipped));
await page.screenshot({ path: `${OUT}/docked-left.png` });
await press('.side');
check('and back to the right', Math.round((await ask('rect')).x) === VW - PANEL_W);

// Sections fold from their title and stay folded as the selection changes.
await press(await ask('title', 'Spacing'));
check('a section folds from its title', (await ask('folded', 'Spacing')) === true);
await glide({ x: c2.x + 40, y: c2.y + 40 });
await page.mouse.click(c2.x + 40, c2.y + 40);
await page.waitForTimeout(300);
check('a folded section stays folded on the next element', (await ask('folded', 'Spacing')) === true);
await press(await ask('title', 'Spacing'));
check('and unfolds again', (await ask('folded', 'Spacing')) === false);

// Legibility and reach. v1 set 50 of its 74 text elements under 11px and no
// copyable value could take keyboard focus.
const audit = await ask('audit');
check('no text on the panel is under 10px', audit.minFont >= 10, `smallest ${audit.minFont}px`);
check('every button is at least 24px tall', audit.minButton >= 24, `smallest ${audit.minButton}px`);
check(
  'every copyable value can take keyboard focus',
  audit.copies > 0 && audit.focusableCopies === audit.copies,
  `${audit.focusableCopies} of ${audit.copies}`
);

// The trail is the DOM walk made clickable.
const before = await ask('crumbs');
await press(await ask('crumb'));
const after = await ask('crumbs');
check(
  'clicking an ancestor in the trail selects it',
  after[after.length - 1] === before[before.length - 2],
  `${before.join(' > ')}  ->  ${after.join(' > ')}`
);

// ---- measurement waits for the modifier ----------------------------------
// It used to appear on every hover once A was locked, which covered the page
// in dimension lines while you were only moving the mouse.
await glide({ x: c1.x + 40, y: c1.y + 40 });
await page.mouse.click(c1.x + 40, c1.y + 40);
await page.waitForTimeout(250);
await glide({ x: c2.x + 40, y: c2.y + 40 });
check('hovering with A locked draws no dimension line', (await ask('count', '.mlabel')) === 0);
check('and the panel shows no distance', (await ask('count', '.hero.is-measure')) === 0);
check('the footer says which key to hold', /Hold (Cmd|Ctrl)/.test(await panelText()));
await page.screenshot({ path: `${OUT}/locked-hover.png` });

await page.keyboard.down('Control');
await page.waitForTimeout(300);
check('holding the modifier shows the gap', (await ask('count', '.mlabel')) > 0 && (await ask('count', '.hero.is-measure')) === 1);
await page.screenshot({ path: `${OUT}/gap.png` });

await page.keyboard.up('Control');
await page.waitForTimeout(300);
check('releasing it hides the gap again', (await ask('count', '.mlabel')) === 0);

await page.keyboard.down('Control');
await page.mouse.click(c2.x + 40, c2.y + 40);
await page.keyboard.up('Control');
await page.waitForTimeout(300);
await glide({ x: 200, y: 79 });
check('a modifier click keeps the measurement with the key released', (await ask('count', '.mlabel')) > 0);
check('the footer confirms it was kept', (await panelText()).includes('Measurement kept'));

// Esc clears. It no longer exits: one press too many used to end the session.
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
check('Esc clears the measurement', (await ask('count', '.mlabel')) === 0);
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
check('a second Esc does not close the tool', await page.evaluate(() => !!document.getElementById('designtool-root')));

// A plain click with A locked selects the new element instead.
await glide({ x: c1.x + 40, y: c1.y + 40 });
await page.mouse.click(c1.x + 40, c1.y + 40);
await glide({ x: c2.x + 40, y: c2.y + 40 });
await page.mouse.click(c2.x + 40, c2.y + 40);
await page.waitForTimeout(250);
const reselected = await panelText();
check('a plain click on another element selects it', reselected.includes('div#c2') && (await ask('count', '.mlabel')) === 0, reselected.slice(60, 140));
await press('.clear');
check('the Clear button releases the selection', (await panelText()).includes('Click an element to lock it.'));

// ---- the close control ---------------------------------------------------
await press('.close');
check(
  'close button stops the tool',
  await page.evaluate(() => !document.getElementById('designtool-root'))
);
await arm(); // back on for the rest of the run
await page.waitForTimeout(300);
check('theme and side survive a restart', (await ask('side')) === 'right' && (await ask('theme')) === 'dark');

// ---- media ---------------------------------------------------------------
// A 4x4 PNG drawn at 80px. Format, intrinsic size and the fact that it is
// being upscaled are all things the DOM states nowhere in one place.
await glide(await reach('#png', 40, 40));
const pngCard = await panelText();
check('media block names the format', pngCard.includes('PNG'), pngCard.slice(0, 80));
check('media block reports the intrinsic size', /4\s*x\s*4/.test(pngCard));
check('media block flags an upscaled asset', pngCard.includes('upscaled'));
await page.screenshot({ path: `${OUT}/media-image.png` });

await glide(await reach('#clip', 60, 40));
const clipCard = await panelText();
check(
  'autoplay + muted + loop reads as a background video',
  clipCard.includes('background loop'),
  clipCard.slice(0, 80)
);
check('video format comes from the source', clipCard.includes('WEBM'));
check('playback flags are listed', clipCard.includes('autoplay') && clipCard.includes('muted'));

await glide(await reach('#player', 60, 40));
const playerCard = await panelText();
check(
  'a video with controls is not called a background loop',
  playerCard.includes('Video') && !playerCard.includes('background loop')
);
check('MP4 is reported as MP4', playerCard.includes('MP4'));
await page.screenshot({ path: `${OUT}/media-video.png` });

// A 4x3 asset in a 90x90 box: the rendered ratio is 1:1, the asset's is 4:3,
// and object-fit decides which of those the viewer actually sees.
await glide(await reach('#square', 45, 45));
const squareCard = await panelText();
check('the rendered ratio is reported', squareCard.includes('1:1'), squareCard.slice(0, 140));
check(
  "a differing asset ratio is called out with what the box does to it",
  squareCard.includes('4:3') && squareCard.includes('cropped'),
  squareCard.slice(0, 160)
);

// ---- design tokens -------------------------------------------------------
// One element sets its colour through var(), the other hardcodes the same hex.
// The first is found by reading the rule, the second only by matching values,
// so between them they cover both resolution paths.
await glide(await reach('#tokened', 60, 10));
const tokenedCard = await panelText();
check('a var() colour reports its token name', tokenedCard.includes('--color-brand'), tokenedCard.slice(0, 120));
check('the raw value is still shown next to it', tokenedCard.includes('#2A51FD'));
await page.screenshot({ path: `${OUT}/token-exact.png` });

await glide(await reach('#valued', 60, 10));
const valuedCard = await panelText();
check(
  'a hardcoded colour is matched back to its token',
  valuedCard.includes('--color-brand'),
  valuedCard.slice(0, 120)
);

// A colour the palette does not define must stay a plain hex: inventing a
// token name for it would be worse than showing nothing.
await glide(await reach('.tile-d', 40, 8));
const plainCard = await panelText();
check('a colour with no token stays a raw hex', !plainCard.includes('--color-'), plainCard.slice(0, 120));

// ---- both measured elements are described --------------------------------
// A is the h1 (text), B is a flex container, so the two columns should carry
// different vocabularies: a type spec against a box.
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
const titleAt = await reach('#title', 60, 20);
await glide(titleAt);
await page.mouse.click(titleAt.x, titleAt.y);
await page.waitForTimeout(250);
await page.keyboard.down('Control');
await glide(await reach('#c1', 40, 40));
const pairCard = await panelText();
await page.keyboard.up('Control');
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
await sw.evaluate(async () => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return chrome.tabs.sendMessage(tab.id, { type: 'designtool:toggle', armed: false });
});
await page.waitForTimeout(400);
check(
  'overlay fully removed when the toolbar turns it off',
  await page.evaluate(() => !document.getElementById('designtool-root'))
);

// MV3 evicts an idle service worker, and the armed-per-tab state used to be an
// in-memory Map that went with it. It now lives in session storage. The close
// button earlier sent "disarmed" to the worker, which is the reachable end of
// that path: if the key is present, the worker wrote it.
const session = await sw.evaluate(() => chrome.storage.session.get('armedTabs'));
check('the worker persists armed state to session storage', session?.armedTabs !== undefined);

check('no console errors', errors.length === 0, errors.join(' | '));

await ctx.close();
console.log(failures.length ? `\n${failures.length} FAILED` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
