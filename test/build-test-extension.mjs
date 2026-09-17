/**
 * Build a copy of the extension that a headless browser can drive.
 *
 * The shipped manifest asks only for activeTab, which Chrome grants on a real
 * toolbar click. Playwright cannot click browser chrome, so the tests would
 * have no way in. This copy adds back the declarative content script and the
 * host permission so the suite can arm the tool by messaging it.
 *
 * Everything else is byte-identical, and test/manifest.test.mjs asserts the
 * shipped manifest stays minimal, so the two cannot quietly diverge.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

export const CONTENT_FILES = [
  'src/ui/overlay-styles.js',
  'src/content/prefs.js',
  'src/content/units.js',
  'src/content/tokens.js',
  'src/content/styles.js',
  'src/content/measure.js',
  'src/content/overlay.js',
  'src/content/spacing-box.js',
  'src/content/card.js',
  'src/content/inspect.js',
  'src/content/index.js',
];

export function buildTestExtension() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-tool-test-'));
  fs.cpSync(path.join(ROOT, 'src'), path.join(dir, 'src'), { recursive: true });

  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  manifest.host_permissions = ['<all_urls>'];
  manifest.content_scripts = [
    {
      matches: ['<all_urls>'],
      all_frames: true,
      run_at: 'document_idle',
      js: CONTENT_FILES,
    },
  ];
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return dir;
}
