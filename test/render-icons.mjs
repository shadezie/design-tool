/**
 * Render the extension icons from src/icons/icon.svg.
 *
 *   node test/render-icons.mjs
 *
 * The committed PNGs come from Figma, which hints small sizes better than a
 * browser downscale does. Use this when you need a size Figma did not export,
 * and check the 16px result by eye before keeping it.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ICONS = path.join(HERE, '..', 'src', 'icons');

const JOBS = [{ src: 'icon.svg', sizes: [16, 32, 48, 128] }];

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
