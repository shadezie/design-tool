# Store image assets

What the Chrome Web Store actually requires, and how to produce it here.

## The four asset types

| Asset | Size | Required? | Source in this repo |
| --- | --- | --- | --- |
| Icon | 128x128 PNG | Required | `src/icons/icon128.png`, already correct |
| Screenshots | 1280x800 **or** 640x400, 1-5 of them | At least 1 required | `docs/raw/` → `npm run store-images` → `docs/store/` |
| Small promo tile | 440x280 | Optional, but shown in search results if present | `docs/store/promo-440x280.png`, generated |
| Marquee promo tile | 1400x560 | Optional, only used if Google features the extension | Not generated; skip until asked |

Screenshots are the one thing that actually sells the listing. The rest is
secondary.

## How to make the screenshots

1. Load the extension, use it on a real site you like the look of (not the
   test fixture — a real page sells better).
2. Take normal screenshots any way you like: `Cmd+Shift+4` on macOS, or a
   screenshot extension. Any size, any format, doesn't matter.
3. Drop the files into `docs/raw/`.
4. Run:

   ```bash
   npm run store-images
   ```

5. Pick 3-5 from `docs/store/*-1280x800.png` for the upload. Delete the ones
   you don't want to keep in the repo.

The script pads every image onto an Ink-coloured 1280x800 canvas so the store
never rejects a wrong-sized upload; it does not crop or distort your original.

## What to actually capture

Five screenshots, chosen to show a different feature each, in this order:

1. **Type inspection** — hover a heading, show the Size/Weight/Line-height
   tiles. This is the first thing a designer wants to see.
2. **Measurement** — two elements locked, the dimension line and gap number
   visible.
3. **Spacing box** — a container with visible padding and a gap, the nested
   rings.
4. **Light mode** — the same or a different shot in the light theme, to show
   it's not dark-mode-only.
5. **Deep select or the docked panel** — whichever tells a better story: either
   the Cmd/Ctrl-hover reaching through an overlay, or the panel pinned in the
   corner of a real, busy page.

## Regenerating

Safe to re-run any time. It overwrites files in `docs/store/` but never
touches `docs/raw/`.
