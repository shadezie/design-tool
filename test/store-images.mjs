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
// A stacked icon+wordmark reads as "just a logo" at thumbnail size in search
// results, indistinguishable from any other tile. A horizontal lockup plus a
// ghosted bracket motif gives it product texture without adding illegible
// detail at 440x280.
const page = await browser.newPage({ viewport: TILE, deviceScaleFactor: 1 });
await page.setContent(`<style>
  @font-face{font-family:DT;src:url("${dataUri(path.join(ROOT, 'src/fonts/plus-jakarta-sans.woff2')).replace('image/png', 'font/woff2')}") format('woff2');font-weight:200 800}
  @font-face{font-family:DTM;src:url("${dataUri(path.join(ROOT, 'src/fonts/ibm-plex-mono-500.woff2')).replace('image/png', 'font/woff2')}") format('woff2');font-weight:500}
  html,body{margin:0;height:100%}
  body{position:relative;overflow:hidden;display:flex;align-items:center;
       background:radial-gradient(130% 140% at 8% -10%, #24337A 0%, ${INK} 55%);
       font-family:DT,ui-sans-serif,sans-serif;color:#F4F6FA}
  .motif{position:absolute;right:-46px;top:50%;transform:translateY(-50%);
         width:230px;height:230px;opacity:.16}
  .motif svg{width:100%;height:100%}
  .lockup{position:relative;display:flex;align-items:center;gap:16px;padding:0 26px}
  img{width:64px;height:64px;border-radius:15px;flex:none;box-shadow:0 8px 22px rgba(0,0,0,.5)}
  .text{display:flex;flex-direction:column;gap:9px}
  h1{margin:0;font-size:25px;font-weight:800;letter-spacing:-.03em;line-height:1}
  p{margin:0;font-size:12.5px;font-weight:500;color:#9CA8C9;line-height:1.4;max-width:190px}
  .kicker{display:inline-flex;width:fit-content;align-items:center;gap:6px;
          padding:4px 9px 4px 7px;border-radius:6px;background:rgba(42,81,253,.22);
          border:1px solid rgba(110,140,255,.35)}
  .kicker span{font-family:DTM,monospace;font-size:10px;font-weight:500;
               letter-spacing:.06em;color:#9DB2FF;text-transform:uppercase}
  .dot{width:5px;height:5px;border-radius:50%;background:#3DDC84}
</style>
<div class="motif"><svg viewBox="0 0 128 128" fill="none" stroke="#F4F6FA" stroke-width="9"
  stroke-linecap="round" stroke-linejoin="round">
  <path d="M16 44V26a10 10 0 0 1 10-10h18"/>
  <path d="M112 44V26a10 10 0 0 0-10-10H84"/>
  <path d="M16 84v18a10 10 0 0 0 10 10h18"/>
</svg></div>
<div class="lockup">
  <img src="${dataUri(path.join(ROOT, 'src/icons/icon128.png'))}">
  <div class="text">
    <div class="kicker"><span class="dot"></span><span>Chrome extension</span></div>
    <h1>Design Tool</h1>
    <p>Inspect any website like a designer, not an engineer.</p>
  </div>
</div>`);
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(OUT, 'promo-440x280.png') });
await page.close();
console.log('docs/store/promo-440x280.png');

await browser.close();
