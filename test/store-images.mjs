/**
 * Turn raw screenshots into Chrome Web Store assets.
 *
 *   npm run store-images
 *
 * Drop any PNGs into docs/raw/. Each one comes out of docs/store/ at exactly
 * 1280x800, scaled to fit and centred on a brand ground, because the store
 * rejects anything that is not exactly 1280x800 or 640x400 and a retina
 * screenshot from a Mac is neither.
 *
 * Also renders the 440x280 small promo tile from the icon and wordmark.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'docs', 'raw');
const OUT = path.join(ROOT, 'docs', 'store');

const SHOT = { width: 1280, height: 800 };
const TILE = { width: 440, height: 280 };
const INK = '#0F172A';
const BLUE = '#2A51FD';

fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const dataUri = (file) =>
  `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;

const browser = await chromium.launch({ headless: true, channel: 'chromium' });

// ---- screenshots ---------------------------------------------------------
const raws = fs.readdirSync(RAW).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();

if (!raws.length) {
  console.log(`No images in docs/raw/. Put screenshots there and run this again.`);
} else {
  for (const file of raws) {
    const page = await browser.newPage({ viewport: SHOT, deviceScaleFactor: 1 });
    await page.setContent(`<style>
      html,body{margin:0;height:100%}
      body{display:flex;align-items:center;justify-content:center;background:${INK}}
      img{max-width:100%;max-height:100%;display:block;
          box-shadow:0 24px 60px rgba(0,0,0,.45);border-radius:6px}
    </style><img src="${dataUri(path.join(RAW, file))}">`);
    await page.waitForTimeout(120);
    const name = `${path.parse(file).name}-1280x800.png`;
    await page.screenshot({ path: path.join(OUT, name) });
    await page.close();
    console.log(`docs/store/${name}`);
  }
}

// ---- 440x280 small promo tile -------------------------------------------
const page = await browser.newPage({ viewport: TILE, deviceScaleFactor: 1 });
await page.setContent(`<style>
  @font-face{font-family:DT;src:url("${dataUri(path.join(ROOT, 'src/fonts/plus-jakarta-sans.woff2')).replace('image/png', 'font/woff2')}") format('woff2');font-weight:200 800}
  html,body{margin:0;height:100%}
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;
       background:radial-gradient(120% 120% at 30% 0%, #1B2C6B 0%, ${INK} 60%);
       font-family:DT,ui-sans-serif,sans-serif;color:#F4F6FA}
  img{width:72px;height:72px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.5)}
  h1{margin:0;font-size:30px;font-weight:800;letter-spacing:-.035em}
  p{margin:0;font-size:13px;font-weight:500;color:#8895B3}
  .rule{width:44px;height:3px;border-radius:2px;background:${BLUE}}
</style>
<img src="${dataUri(path.join(ROOT, 'src/icons/icon128.png'))}">
<h1>Design Tool</h1>
<div class="rule"></div>
<p>Design QA for any website</p>`);
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(OUT, 'promo-440x280.png') });
await page.close();
console.log('docs/store/promo-440x280.png');

await browser.close();
