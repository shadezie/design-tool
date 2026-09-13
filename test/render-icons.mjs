/**
 * Render the extension icons from their SVG sources.
 *
 *   node test/render-icons.mjs
 *
 * 16px uses the tuned mark: the faithful one blurs into itself at that size.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ICONS = path.join(HERE, '..', 'src', 'icons');

const JOBS = [
  { src: 'logo-small.svg', sizes: [16] },
  { src: 'logo.svg', sizes: [32, 48, 128] },
];

const browser = await chromium.launch({ headless: true, channel: 'chromium' });
for (const job of JOBS) {
  const svg = fs.readFileSync(path.join(ICONS, job.src), 'utf8');
  for (const size of job.sizes) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<style>html,body{margin:0;padding:0;background:transparent}` +
        `svg{display:block;width:${size}px;height:${size}px}</style>${svg}`
    );
    await page.screenshot({ path: path.join(ICONS, `icon${size}.png`), omitBackground: true });
    await page.close();
    console.log(`icon${size}.png from ${job.src}`);
  }
}
await browser.close();
