/**
 * The shipped manifest is the thing users install and reviewers read, and the
 * test harness runs against a patched copy. These checks keep the two honest.
 *
 *   node test/manifest.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTENT_FILES } from './build-test-extension.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

const failures = [];
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures.push(name);
}

check('manifest v3', manifest.manifest_version === 3);
check('has a version', /^\d+\.\d+\.\d+$/.test(manifest.version || ''), manifest.version);

// The whole point of the activeTab design: no broad host access, nothing
// injected until the user asks for it.
check('asks for no host permissions', manifest.host_permissions === undefined);
check('declares no always-on content script', manifest.content_scripts === undefined);
check(
  'permissions stay minimal',
  JSON.stringify(manifest.permissions) === JSON.stringify(['activeTab', 'scripting', 'storage']),
  JSON.stringify(manifest.permissions)
);

// Every file the worker injects, and every asset the manifest names, must exist
// in the package. A typo here is invisible until someone installs it.
const background = manifest.background?.service_worker;
check('service worker exists', !!background && fs.existsSync(path.join(ROOT, background)));

const workerSource = fs.readFileSync(path.join(ROOT, background), 'utf8');
for (const file of CONTENT_FILES) {
  check(`worker injects ${file}`, workerSource.includes(file));
  check(`${file} exists`, fs.existsSync(path.join(ROOT, file)));
}

for (const size of ['16', '32', '48', '128']) {
  const icon = manifest.icons?.[size];
  check(`icon ${size} exists`, !!icon && fs.existsSync(path.join(ROOT, icon)));
}

// OFL 1.1 requires the licence text to ship alongside the fonts.
const fonts = fs.readdirSync(path.join(ROOT, 'src', 'fonts'));
check('font licences ship with the fonts', fonts.filter((f) => f.startsWith('OFL-')).length === 2);
check('a project licence exists', fs.existsSync(path.join(ROOT, 'LICENSE')));

console.log(failures.length ? `\n${failures.length} FAILED` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
