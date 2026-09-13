/**
 * Build the zip to upload to the Chrome Web Store.
 *
 *   npm run package
 *
 * Ships the extension only. node_modules, the test suite, the markdown docs and
 * the SVG icon sources are not part of what users install, and every extra file
 * is something a reviewer has to account for.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const out = path.join(ROOT, 'dist', `design-tool-${manifest.version}.zip`);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.rmSync(out, { force: true });

execFileSync(
  'zip',
  [
    '-r',
    '-q',
    out,
    'manifest.json',
    'src',
    '-x',
    '*.DS_Store',
    'src/icons/*.svg',
    // The OFL-*.txt files must ship; the README explaining them is for us.
    '*.md',
  ],
  { cwd: ROOT }
);

const listed = execFileSync('unzip', ['-Z1', out], { cwd: ROOT, encoding: 'utf8' })
  .trim()
  .split('\n');
const size = (fs.statSync(out).size / 1024).toFixed(0);

console.log(`${path.relative(ROOT, out)}  (${size} KB, ${listed.length} files)`);

// The OFL requires the licence text to travel with the fonts, so a package
// missing it is not shippable.
const licences = listed.filter((f) => f.includes('OFL-'));
if (licences.length !== 2) {
  console.error(`\nERROR: expected both font licences in the zip, found ${licences.length}`);
  process.exit(1);
}
for (const bad of listed.filter((f) => /node_modules|^test\/|\.md$/.test(f))) {
  console.error(`\nERROR: ${bad} should not ship`);
  process.exit(1);
}
console.log('font licences included, no test or dev files');
