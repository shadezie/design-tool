/**
 * Build a side-by-side dev copy of the extension.
 *
 *   npm run dev      # writes ./dev/
 *
 * The published extension and an unpacked folder get different extension IDs,
 * so Chrome treats them as two unrelated extensions: both can be installed at
 * once, and they do not share storage. What they would share is a name, an
 * icon and a keyboard shortcut, which makes it impossible to tell which one
 * you just triggered. This copy renames itself, renders the icon on the brand
 * Ink ground instead of brand blue, and takes Alt+Shift+D so the published build keeps
 * Alt+Shift+I.
 *
 * Nothing here touches the shipped manifest or the committed icons, so a dev
 * value can never leak into a store release. ./dev/ is gitignored; load it
 * with chrome://extensions -> Load unpacked.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const OUT = path.join(ROOT, 'dev');

const BRAND = '#2A51FD';
const DEV = '#0F172A'; // brand Ink, reads as a black tile next to the blue one
const SIZES = [16, 32, 48, 128];

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'src'), path.join(OUT, 'src'), { recursive: true });

// ---- manifest ------------------------------------------------------------
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
manifest.name = 'Design Tool (Dev)';
manifest.description = `LOCAL DEV BUILD. ${manifest.description}`;
manifest.action.default_title = 'Design Tool (Dev): inspect this page (Alt+Shift+D)';
manifest.commands._execute_action.suggested_key = { default: 'Alt+Shift+D', mac: 'Alt+Shift+D' };
manifest.commands._execute_action.description = 'Toggle Design Tool (Dev) inspect mode';
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

// ---- icons ---------------------------------------------------------------
const svg = fs
  .readFileSync(path.join(ROOT, 'src/icons/icon.svg'), 'utf8')
  .replaceAll(BRAND, DEV);
fs.writeFileSync(path.join(OUT, 'src/icons/icon.svg'), svg);

const browser = await chromium.launch({ headless: true, channel: 'chromium' });
for (const size of SIZES) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}` +
      `svg{display:block;width:${size}px;height:${size}px}</style>${svg}`
  );
  await page.screenshot({
    path: path.join(OUT, `src/icons/icon${size}.png`),
    omitBackground: true,
  });
  await page.close();
}
await browser.close();

console.log(`dev/  ->  "${manifest.name}", black icon, Alt+Shift+D`);
console.log('Load it once via chrome://extensions -> Load unpacked -> select dev/');
console.log('After that, re-run this and hit Reload on the card to pick up changes.');
