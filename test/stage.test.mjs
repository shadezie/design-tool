/**
 * The stage, end to end: the page framed at a device size beside the panel.
 *
 *   node test/stage.test.mjs
 *
 * test/verify.mjs runs against a file:// page, which cannot be framed, so it
 * covers the in-place fallback. This suite serves the same demo page over
 * http, where the stage can load it, and one copy that refuses to be framed.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { buildTestExtension } from './build-test-extension.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT = buildTestExtension();
const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });

const failures = [];
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures.push(name);
}

// A page with one breakpoint, so a device width has something to change.
const demo = fs
  .readFileSync(path.join(HERE, 'demo.html'), 'utf8')
  .replace('</style>', '@media (max-width: 600px) { #hero-title { font-size: 28px; } }</style>');

const server = http
  .createServer((req, res) => {
    // An asset that never arrives, so the page's load event never fires.
    if (req.url.startsWith('/hang')) return;
    const headers = { 'content-type': 'text/html; charset=utf-8' };
    if (req.url.startsWith('/deny')) headers['x-frame-options'] = 'DENY';
    res.writeHead(200, headers);
    res.end(req.url.startsWith('/heavy') ? demo.replace('</body>', '<img src="/hang" alt=""></body>') : demo);
  })
  .listen(0);
const ORIGIN = `http://localhost:${server.address().port}`;

const ctx = await chromium.launchPersistentContext('', {
  headless: true,
  channel: 'chromium',
  viewport: { width: 1440, height: 900 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent('serviceworker', { timeout: 15000 }));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));

const toggle = (armed) =>
  sw.evaluate(async (armed) => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return chrome.tabs.sendMessage(tab.id, { type: 'designtool:toggle', armed }, { frameId: 0 });
  }, armed);

/**
 * Turn the tool on or off the way the toolbar icon does: through the worker's
 * own toggle, which is what installs the rule that lets a site be framed.
 */
const toolbar = () =>
  sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    // eslint-disable-next-line no-undef
    await toggle(tab);
  });
const framingRules = () => sw.evaluate(async () => (await chrome.declarativeNetRequest.getSessionRules()).length);

/** Ask the tool a question from inside the content script's world. */
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
          const root = overlay?.shadowRoot;
          if (!root) return null;
          const frame = root.querySelector('.frame');
          const rectOf = (node) => {
            if (!node) return null;
            const b = node.getBoundingClientRect();
            return { x: b.x, y: b.y, width: b.width, height: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
          };
          if (kind === 'text') return overlay.panel.textContent;
          if (kind === 'mode') return overlay.layer.getAttribute('data-mode');
          if (kind === 'rect') return rectOf(root.querySelector(arg));
          if (kind === 'count') return root.querySelectorAll(arg).length;
          if (kind === 'value') return root.querySelector(arg)?.value;
          if (kind === 'selected') return root.querySelector('.size-list')?.selectedOptions[0]?.textContent;
          if (kind === 'options') return [...(root.querySelector('.size-list')?.options || [])].map((o) => o.textContent);
          if (kind === 'go') {
            frame.contentWindow.location.href = arg;
            return true;
          }
          if (kind === 'scrollbar') {
            const doc = frame.contentDocument;
            return {
              styled: !!doc.getElementById('designtool-frame'),
              // With no scrollbar taking room, the layout width is the frame's width.
              gutter: frame.contentWindow.innerWidth - doc.documentElement.clientWidth,
            };
          }
          if (kind === 'label') return root.querySelector('.pick-label')?.textContent;
          if (kind === 'title') return overlay.panel.querySelector('.brand-name')?.textContent;
          if (kind === 'toolbar') {
            const bar = root.querySelector('.tb').getBoundingClientRect();
            const mid = root.querySelector('.tb-mid').getBoundingClientRect();
            const brand = root.querySelector('.tb-brand').getBoundingClientRect();
            return { offCentre: Math.abs(mid.x + mid.width / 2 - (bar.x + bar.width / 2)), brandLeft: brand.x - bar.x, name: root.querySelector('.tb-name')?.textContent };
          }
          if (kind === 'pressed') return root.querySelector('.seg [aria-pressed="true"]')?.textContent;
          if (kind === 'animations') return root.querySelector('.turn')?.getAnimations().length ?? 0;
          if (kind === 'frame') {
            if (!frame?.contentWindow) return null;
            const win = frame.contentWindow;
            const title = frame.contentDocument.querySelector('#hero-title');
            return {
              innerWidth: win.innerWidth,
              innerHeight: win.innerHeight,
              titleSize: title ? win.getComputedStyle(title).fontSize : null,
              path: win.location.href,
              zoom: frame.getBoundingClientRect().width / frame.offsetWidth,
            };
          }
          // A point inside an element of the framed page, in top-window pixels.
          if (kind === 'point') {
            const box = frame.getBoundingClientRect();
            const zoom = box.width / frame.offsetWidth;
            const el = frame.contentDocument.querySelector(arg.selector);
            if (!el) return null;
            el.scrollIntoView({ block: 'center' });
            const e = el.getBoundingClientRect();
            return { x: box.x + (e.x + arg.dx) * zoom, y: box.y + (e.y + arg.dy) * zoom };
          }
          return null;
        },
      });
      return res.result;
    },
    [kind, arg]
  );

const point = (selector, dx = 30, dy = 10) => ask('point', { selector, dx, dy });
async function glide(to) {
  await page.mouse.move(to.x, to.y, { steps: 20 });
  await page.waitForTimeout(250);
}
async function press(selector) {
  const rect = await ask('rect', selector);
  await page.mouse.move(rect.cx, rect.cy, { steps: 10 });
  await page.mouse.click(rect.cx, rect.cy);
  await page.waitForTimeout(350);
}
async function setField(selector, value) {
  const rect = await ask('rect', selector);
  await page.mouse.click(rect.cx, rect.cy, { clickCount: 3 });
  await page.keyboard.type(String(value));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(350);
}
/** Pick an entry in the size list, the way a keyboard user would. */
async function pickSize(index) {
  await sw.evaluate(async (index) => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'ISOLATED',
      args: [index],
      func: (index) => {
        const list = window.__designtool.overlay.shadowRoot.querySelector('.size-list');
        list.value = String(index);
        list.dispatchEvent(new Event('change', { bubbles: true }));
      },
    });
  }, index);
  await page.waitForTimeout(350);
}

// ---- the stage opens ------------------------------------------------------
await page.goto(`${ORIGIN}/`);
await page.waitForTimeout(400);
await toggle(true);
await page.waitForTimeout(1200);

check('the page is framed on the stage', (await ask('mode')) === 'arena' && (await ask('count', '.frame')) === 1);
const fit = await ask('frame');
check('it opens at Fit, unscaled', fit?.zoom === 1 && (await ask('selected')) === 'Fit to window', JSON.stringify(fit));
check('the panel raises no notice when framing works', (await ask('count', '.notice')) === 0);
check('the original page is locked while covered', await page.evaluate(() => document.documentElement.style.overflow === 'hidden'));
await page.screenshot({ path: `${OUT}/stage-fit-dark.png` });

// The toolbar: the name at the left edge, the controls centred in the stage.
const tb = await ask('toolbar');
check('the toolbar carries the name at its left edge', tb.name === 'Design Tool' && tb.brandLeft < 20, JSON.stringify(tb));
check('and its controls are centred', tb.offCentre < 2, `${tb.offCentre}px off`);
check('on the stage the panel is titled for what it holds', (await ask('title')) === 'Properties');

// It opens in Interact: the page works as usual until inspecting is asked for.
check('the stage opens in Interact', (await ask('pressed')) === 'Interact' && (await ask('text')).includes('Interact mode'));
const early = await point('#card-a', 80, 6);
await glide(early);
await page.mouse.click(early.x, early.y);
await page.waitForTimeout(250);
check('and a click there selects nothing', !(await ask('text')).includes('div#card-a'));
const bar = await ask('scrollbar');
check('the framed page has no scrollbar taking width', bar.styled && bar.gutter === 0, JSON.stringify(bar));
await press('.mode-inspect');

// ---- inspecting through the frame -----------------------------------------
await glide(await point('#hero-title', 120, 24));
check('hovering inside the frame reads the element', (await ask('text')).includes('h1#hero-title'));

const a = await point('#card-a', 80, 6);
await glide(a);
await page.mouse.click(a.x, a.y);
await page.waitForTimeout(250);
await glide(await point('#card-b', 80, 6));
check('no measurement without the modifier', (await ask('count', '.hero.is-measure')) === 0);
await page.keyboard.down('Control');
await page.waitForTimeout(300);
const measured = await ask('text');
check('the modifier measures inside the frame', (await ask('count', '.hero.is-measure')) === 1 && measured.includes('24'), measured.slice(0, 80));
await page.screenshot({ path: `${OUT}/stage-measure-dark.png` });
const b = await point('#card-b', 80, 6);
await page.mouse.click(b.x, b.y);
await page.keyboard.up('Control');
await page.waitForTimeout(250);

// Reaching for the panel must not empty it: the pointer leaves the frame on the way.
await glide(await ask('rect', '.panel-foot').then((r) => ({ x: r.cx, y: r.cy })));
check('moving to the panel keeps the measurement', (await ask('text')).includes('Measurement kept'));

await press('.theme');
await page.screenshot({ path: `${OUT}/stage-measure-light.png` });
await press('.theme');
await press('.clear');

// ---- device sizes ---------------------------------------------------------
await press('[data-device="mobile"]');
const mobile = await ask('frame');
check('Mobile gives the page a 390px viewport', mobile.innerWidth === 390 && mobile.innerHeight === 844, JSON.stringify(mobile));
check('the page answers with its mobile breakpoint', mobile.titleSize === '28px', mobile.titleSize);
// Closed, the size control names the device. The dimensions are in the list.
check('the closed size control shows only the device name', (await ask('label')) === 'iPhone 13 & 14', await ask('label'));
check('while the list still shows each size', (await ask('selected')) === 'iPhone 13 & 14 · 390 × 844', await ask('selected'));
// Several phones share a size, so the name has to come from what was picked.
const seventeen = (await ask('options')).findIndex((o) => o.startsWith('iPhone 17 ·'));
await pickSize(seventeen);
check('a device that shares its size keeps its own name', (await ask('label')) === 'iPhone 17' && (await ask('frame')).innerWidth === 402, await ask('label'));
await pickSize(0);
await page.screenshot({ path: `${OUT}/stage-mobile.png` });

const rot = await ask('rect', '.rotate');
await page.mouse.click(rot.cx, rot.cy);
await page.waitForTimeout(60);
check('rotating animates the frame', (await ask('animations')) > 0);
check('the caption and handles step out for the turn', (await ask('count', '.stage[data-turning]')) === 1);
await page.screenshot({ path: `${OUT}/stage-rotating.png` });
await page.waitForTimeout(350);
check('and come back when it lands', (await ask('count', '.stage[data-turning]')) === 0);
const turned = await ask('frame');
check('rotate swaps width and height', turned.innerWidth === 844 && turned.innerHeight === 390, JSON.stringify(turned));
await press('.rotate');

// The handle on the frame's edge. The frame is centred, so the width takes
// twice the pointer's travel, divided by the zoom.
const grip = await ask('rect', '.grip-x');
const zoomNow = (await ask('frame')).zoom;
await page.mouse.move(grip.cx, grip.cy, { steps: 5 });
await page.mouse.down();
await page.mouse.move(grip.cx + 50, grip.cy, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(300);
const dragged = await ask('frame');
const expected = 390 + 100 / zoomNow;
check('dragging the edge handle resizes the frame', Math.abs(dragged.innerWidth - expected) < 12, `${dragged.innerWidth}, expected about ${Math.round(expected)}`);
check('and the size list reads Custom', (await ask('selected')) === 'Custom');

// The same on the bottom edge, for height.
const tall = await ask('frame');
const gripY = await ask('rect', '.grip-y');
await page.mouse.move(gripY.cx, gripY.cy, { steps: 5 });
await page.mouse.down();
await page.mouse.move(gripY.cx, gripY.cy - 60, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(300);
const shorter = await ask('frame');
check('dragging the bottom handle changes the height', shorter.innerHeight < tall.innerHeight - 80 && shorter.innerWidth === tall.innerWidth, `${tall.innerHeight} -> ${shorter.innerHeight}`);
await page.screenshot({ path: `${OUT}/stage-grip.png` });

await press('[data-device="large"]');
const sizes = await ask('options');
check('Large offers 2560 × 1440', sizes.some((s) => s.includes('2560 × 1440')), sizes.join(' | '));
await pickSize(1);
const qhd = await ask('frame');
check('a size bigger than the stage is scaled down, not cropped', qhd.innerWidth === 2560 && qhd.zoom < 1, JSON.stringify(qhd));
await page.screenshot({ path: `${OUT}/stage-qhd.png` });

// The point of scaling with a transform: the pointer still lands on the right element.
await glide(await point('#cta', 20, 10));
check('hovering still hits the right element at a reduced zoom', (await ask('text')).includes('a#cta'), (await ask('text')).slice(0, 60));

await setField('.size-w', 900);
const custom = await ask('frame');
check('a typed width is applied', custom.innerWidth === 900, JSON.stringify(custom));
check('and the size list reads Custom', (await ask('selected')) === 'Custom');

await press('[data-device="fit"]');
check('Fit returns to 100%', (await ask('frame')).zoom === 1);

// ---- interact mode --------------------------------------------------------
await press('.mode-interact');
check('Interact says so in the footer', (await ask('text')).includes('Interact mode'));
const cta = await point('#cta', 20, 10);
await glide(cta);
await page.mouse.click(cta.x, cta.y);
await page.waitForTimeout(400);
check('in Interact the page gets the click', (await ask('frame')).path.endsWith('#'), (await ask('frame')).path);
check('and nothing is selected by it', (await ask('text')).includes('Interact mode'));
await press('.mode-inspect');
await glide(await point('#hero-title', 120, 24));
check('back in Inspect, hovering reads styles again', (await ask('text')).includes('h1#hero-title'));

// Following a link in Interact loads a new document into the frame. The
// inspector has to move to it, or it would be reading a page that is gone.
await ask('go', '/second');
await page.waitForTimeout(1200);
check('the frame navigated', (await ask('frame')).path.endsWith('/second'), (await ask('frame')).path);
await glide(await point('#cta', 20, 10));
check('inspection follows the frame to the new page', (await ask('text')).includes('a#cta'), (await ask('text')).slice(0, 60));
check('the tab itself stays where it was', page.url() === `${ORIGIN}/`, page.url());

// ---- closing --------------------------------------------------------------
await toggle(false);
await page.waitForTimeout(500);
check('closing removes the stage', await page.evaluate(() => !document.getElementById('designtool-root')));
check('and gives the page its scrolling back', await page.evaluate(() => document.documentElement.style.overflow !== 'hidden'));

// The size is remembered for next time.
await toggle(true);
await page.waitForTimeout(1200);
check('the stage reopens', (await ask('mode')) === 'arena');
await toggle(false);
await page.waitForTimeout(400);

// ---- a page that refuses to be framed, with no rule to help ---------------
// Turned on by message here, which skips the worker and so skips the rule:
// this is what a refusal the tool cannot lift looks like.
await page.goto(`${ORIGIN}/deny`);
await page.waitForTimeout(400);
await toggle(true);
await page.waitForTimeout(1500);
check('a page that forbids framing is inspected in place', (await ask('mode')) === 'inplace' && (await ask('count', '.frame')) === 0);
check('in place, the panel carries the product name', (await ask('title')) === 'Design Tool');
check('the panel says why device sizes are missing', (await ask('text')).includes('does not allow device preview'));
const title = await page.locator('#hero-title').boundingBox();
await glide({ x: title.x + 120, y: title.y + 24 });
check('and inspection still works there', (await ask('text')).includes('h1#hero-title'));
check('the page keeps its scrolling in place', await page.evaluate(() => document.documentElement.style.overflow !== 'hidden'));
await page.screenshot({ path: `${OUT}/stage-blocked.png` });
await toggle(false);
await page.waitForTimeout(300);

// ---- the same page, turned on from the toolbar ----------------------------
// The worker lifts the framing headers for this tab's own frames before the
// stage asks for one, so a site that says DENY can still be put on the stage.
await page.goto(`${ORIGIN}/deny`);
await page.waitForTimeout(400);
await toolbar();
await page.waitForTimeout(1500);
check('from the toolbar, a page that says DENY is framed', (await ask('mode')) === 'arena' && (await ask('count', '.notice')) === 0);
check('one rule exists while the tool is on', (await framingRules()) === 1);
await press('[data-device="mobile"]');
check('and device sizes work on it', (await ask('frame')).innerWidth === 390);
check('the page itself still refuses frames from anyone else', (await page.evaluate(() => fetch(location.href).then((r) => r.headers.get('x-frame-options')))) === 'DENY');

// The second click has to turn it off. The worker used to keep its own idea
// of on and off, which a loading frame could knock out of step.
await toolbar();
await page.waitForTimeout(500);
check('a second toolbar click turns it off', await page.evaluate(() => !document.getElementById('designtool-root')));
check('and the rule is removed with it', (await framingRules()) === 0);

// ---- a page that is slow, not refusing -------------------------------------
// A media-heavy page can take longer to finish loading than any timeout. The
// stage used to wait for that and then report the site as refusing to be
// framed. It must take the document as soon as it is readable.
await page.goto(`${ORIGIN}/heavy`, { waitUntil: 'commit' });
await page.waitForTimeout(600);
await toggle(true);
await page.waitForTimeout(1500);
check('a page still loading its media is framed anyway', (await ask('mode')) === 'arena' && (await ask('count', '.notice')) === 0);
await press('.mode-inspect');
await glide(await point('#hero-title', 120, 24));
check('and can be inspected before it finishes loading', (await ask('text')).includes('h1#hero-title'));
await toggle(false);
await page.waitForTimeout(300);

// ---- closing a tab while the tool is on ------------------------------------
// The worker cleaned up by clearing the badge on a tab that no longer existed,
// which Chrome reports as an uncaught error on the extension's card.
const workerErrors = [];
sw.on('console', (m) => m.type() === 'error' && workerErrors.push(m.text()));
const extra = await ctx.newPage();
await extra.goto(`${ORIGIN}/`);
await extra.bringToFront();
await extra.waitForTimeout(400);
await toolbar();
await extra.waitForTimeout(800);
const rejections = await sw.evaluate(() => {
  self.__rejections = [];
  self.addEventListener('unhandledrejection', (e) => self.__rejections.push(String(e.reason)));
  return true;
});
await extra.close();
await page.bringToFront();
await page.waitForTimeout(600);
const leaked = await sw.evaluate(() => self.__rejections);
check('closing a tab with the tool on raises no error in the worker', rejections && leaked.length === 0 && workerErrors.length === 0, [...leaked, ...workerErrors].join(' | '));
check('and its rule is cleaned up', (await framingRules()) === 0);

// Chrome logs its own line when it refuses a frame. That one is expected.
const unexpected = errors.filter((e) => !/X-Frame-Options|Refused to display|frame-ancestors/i.test(e));
check('no console errors', unexpected.length === 0, unexpected.join(' | '));

await ctx.close();
server.closeAllConnections?.();
server.close();
console.log(failures.length ? `\n${failures.length} FAILED` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
