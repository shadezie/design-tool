/**
 * The palette, held to its contrast floors.
 *
 *   node test/contrast.test.mjs
 *
 * Reads the tokens straight out of the shipped stylesheet, so a colour changed
 * there is checked here without anyone remembering to. No browser needed.
 *
 * Floors are WCAG 2.x contrast ratios: 4.5 for text, 3 for large text and for
 * the dimmed tier, which is only ever used for values that are zero.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(HERE, '..', 'src', 'ui', 'overlay-styles.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox);
const css = sandbox.window.__designtool.css;

function tokens(selector) {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf('\n}', start));
  const out = {};
  for (const [, name, value] of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[name] = value.trim();
  return out;
}

const dark = tokens('.layer');
const light = { ...dark, ...tokens('.layer[data-theme="light"]') };

function rgb(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`not a solid hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
}
function luminance(hex) {
  const [r, g, b] = rgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const failures = [];
function check(theme, set, fg, bg, floor) {
  const value = ratio(set[fg] || fg, set[bg] || bg);
  const ok = value >= floor;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${theme}  ${fg} on ${bg}  ${value.toFixed(2)} (needs ${floor})`);
  if (!ok) failures.push(`${theme} ${fg} on ${bg}`);
}

for (const [theme, set] of [['dark ', dark], ['light', light]]) {
  for (const ground of ['bg', 'bg-raised', 'bg-sunken']) {
    check(theme, set, 'text', ground, 7);
    check(theme, set, 'text-2', ground, 4.5);
  }
  check(theme, set, 'text-3', 'bg', 3);
  check(theme, set, 'text-3', 'bg-raised', 3);
  check(theme, set, 'accent-text', 'bg', 4.5);
  check(theme, set, 'accent-text', 'bg-raised', 4.5);
  check(theme, set, 'on-accent', 'accent', 4.5);
  check(theme, set, 'syntax-id', 'bg', 4.5);
  for (const status of ['ok', 'warn', 'danger']) {
    check(theme, set, status, 'bg', 4.5);
    check(theme, set, status, 'bg-raised', 4.5);
  }
  check(theme, set, 'on-ok', 'ok', 4.5);
  check(theme, set, 'on-danger', 'danger', 4.5);
  // A dot or a badge, not text: 3 is the floor for a graphic.
  check(theme, set, 'mark-b', 'bg', 3);
}

// The page overlay is the same in both themes: label text on its own fill.
check('page ', dark, '#ffffff', 'hl-a', 4.5);
check('page ', dark, 'on-hl-b', 'hl-b', 4.5);
check('page ', dark, '#ffffff', 'measure', 4.5);
// A and B have to stay apart from each other, not only from the page.
check('page ', dark, 'hl-b', 'hl-a', 3);

console.log(failures.length ? `\n${failures.length} FAILED` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
