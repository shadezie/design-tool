/**
 * Turn raw screenshots into README images.
 *
 *   npm run readme-images
 *
 * Different job than store-images.mjs, so a different shape: no 1280x800
 * padding, no letterboxing. A README image should be a tight crop of the
 * interesting thing, because GitHub renders it at the width of the page and
 * a screenshot with acres of empty page around a small card just makes
 * people scroll past it.
 *
 * Reads the same docs/raw/ folder as store-images.mjs. Auto-trims uniform
 * background margins, then caps the width so nobody's laptop screenshot
 * blows out the README layout.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'docs', 'raw');
const OUT = path.join(ROOT, 'docs', 'readme');
const MAX_WIDTH = 1400;
const PAD = 28; // breathing room kept around the trimmed content

fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const raws = fs.readdirSync(RAW).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
if (!raws.length) {
  console.log('No images in docs/raw/. Drop screenshots there and run this again.');
  process.exit(0);
}

const browser = await chromium.launch({ headless: true, channel: 'chromium' });
const page = await browser.newPage();

for (const file of raws) {
  const uri = `data:image/png;base64,${fs.readFileSync(path.join(RAW, file)).toString('base64')}`;

  const dataUrl = await page.evaluate(
    async ({ src, pad, maxWidth }) => {
      const img = new Image();
      img.src = src;
      await img.decode();

      const full = document.createElement('canvas');
      full.width = img.width;
      full.height = img.height;
      const fctx = full.getContext('2d');
      fctx.drawImage(img, 0, 0);
      const { data } = fctx.getImageData(0, 0, full.width, full.height);

      // Sample the four corners; the background is whichever colour wins.
      const at = (x, y) => {
        const i = (y * full.width + x) * 4;
        return [data[i], data[i + 1], data[i + 2]];
      };
      const corners = [at(0, 0), at(full.width - 1, 0), at(0, full.height - 1), at(full.width - 1, full.height - 1)];
      const bg = corners[0];
      const close = (c, tol) => Math.abs(c[0] - bg[0]) <= tol && Math.abs(c[1] - bg[1]) <= tol && Math.abs(c[2] - bg[2]) <= tol;

      let minX = full.width, minY = full.height, maxX = 0, maxY = 0;
      const step = 2; // scanning every pixel on a big screenshot is slow; every 2nd is plenty
      for (let y = 0; y < full.height; y += step) {
        for (let x = 0; x < full.width; x += step) {
          if (!close(at(x, y), 18)) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX <= minX || maxY <= minY) {
        // Nothing distinguishable from the background; keep the original.
        minX = 0; minY = 0; maxX = full.width; maxY = full.height;
      }

      const cropW = Math.min(full.width, maxX - minX + pad * 2);
      const cropH = Math.min(full.height, maxY - minY + pad * 2);
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);

      const scale = Math.min(1, maxWidth / cropW);
      const out = document.createElement('canvas');
      out.width = Math.round(cropW * scale);
      out.height = Math.round(cropH * scale);
      const octx = out.getContext('2d');
      octx.imageSmoothingQuality = 'high';
      octx.drawImage(full, cropX, cropY, cropW, cropH, 0, 0, out.width, out.height);
      return out.toDataURL('image/png');
    },
    { src: uri, pad: PAD, maxWidth: MAX_WIDTH }
  );

  const outPath = path.join(OUT, path.parse(file).name + '.png');
  fs.writeFileSync(outPath, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`docs/readme/${path.basename(outPath)}`);
}

await page.close();
await browser.close();
