/**
 * Unit tests for the measurement geometry.
 *
 *   node test/measure.test.mjs
 *
 * measure() is pure: it takes two rects and returns numbers, so it runs in node
 * with a stub window and no browser.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
globalThis.window = {};
new Function(fs.readFileSync(path.join(HERE, '..', 'src', 'content', 'measure.js'), 'utf8'))();
const measure = window.__designtool.measure;

const rect = (left, top, width, height) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

const failures = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) {
    console.log(`        expected ${JSON.stringify(expected)}`);
    console.log(`        actual   ${JSON.stringify(actual)}`);
    failures.push(name);
  }
}

const values = (result) => result.values.map((v) => [v.label, v.px]);

// Two cards side by side with a 24px gutter.
check(
  'siblings in a row report one gap',
  values(measure(rect(0, 0, 100, 50), rect(124, 0, 100, 50))),
  [['Gap', 24]]
);
check(
  'siblings in a column report one gap',
  values(measure(rect(0, 0, 100, 50), rect(0, 80, 100, 50))),
  [['Gap', 30]]
);
check(
  'order does not matter',
  values(measure(rect(124, 0, 100, 50), rect(0, 0, 100, 50))),
  [['Gap', 24]]
);

// A child inside a container reports all four edges, because one number would
// be a lie.
check(
  'a nested element reports four edges',
  values(measure(rect(0, 0, 200, 200), rect(12, 12, 100, 40))),
  [
    ['Top', 12],
    ['Right', 88],
    ['Bottom', 148],
    ['Left', 12],
  ]
);

// The container's own border is the caller's job to strip (index.js measures
// from the padding box); the geometry here is border-box in, border-box out.
check(
  'a padding-box container reads as the padding',
  values(measure(rect(1, 1, 198, 198), rect(13, 13, 100, 40))),
  [
    ['Top', 12],
    ['Right', 86],
    ['Bottom', 146],
    ['Left', 12],
  ]
);

// Offset on both axes: components, never a hypotenuse.
check(
  'diagonal reports both components',
  values(measure(rect(0, 0, 50, 50), rect(80, 90, 50, 50))),
  [
    ['Horizontal', 30],
    ['Vertical', 40],
  ]
);

check('nested is labelled as an inset', measure(rect(0, 0, 200, 200), rect(12, 12, 100, 40)).kind, 'nested');
check('a clean gap is labelled a gap', measure(rect(0, 0, 100, 50), rect(124, 0, 100, 50)).kind, 'gap');

console.log(failures.length ? `\n${failures.length} FAILED` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
