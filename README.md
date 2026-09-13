# Design Tool

A Chrome extension that turns any website into something you can QA the way you
review a Figma file. Hover an element to read its type styles. Click two
elements to measure the gap between them. See padding, border and margin as a
spacing box instead of an alphabetical list of CSS.

Built for designers doing design QA, not for reading CSS.

## Install (unpacked)

1. Clone this repo.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and pick the repo folder.

There is no build step. Edit a file, hit the reload icon on the extension card,
refresh the page you are testing.

## Use it

| Action | What happens |
| --- | --- |
| Click the toolbar icon, or `Alt+Shift+D` | Arms inspect mode (badge reads `ON`) |
| Hover | Card shows typography, spacing, layout, fill for whatever is under the cursor |
| | The card stays docked in a top corner, on the side away from what you are inspecting |
| Drag the grip | Places the card anywhere. Double-click the grip to re-dock it |
| Drag the corner | Resizes the card |
| Sun / moon icon | Switches the card between light and dark |
| Click an element | Locks it as **A** (blue) |
| Hover another element | Live measurement between A and it |
| Click again | Freezes it as **B** (amber) |
| Click a third element | Starts a new measurement from that element |
| `Alt` + scroll, or `[` / `]` | Walks up and down the DOM from the current element |
| Hold `Cmd` / `Ctrl` while hovering | Reaches past overlays to the most specific element under the cursor |
| `U` | Cycles px / rem / em without reaching for the card |
| Click any value in the card | Copies it |
| `px` / `rem` / `em` in the card header | Converts every number at once. Remembered between pages |
| `Esc` | Clears the measurement. `Esc` again exits inspect mode |

While inspect mode is armed the page does not receive clicks, so you can measure
a nav link without navigating away.

## Reaching the element you actually want

Most card grids are built with a full-bleed click target: an `<a>` or `<span>`
with `position: absolute; inset: 0` stretched over the whole card. It sits on
top of the heading, the date and everything else, so a plain hover lands on it
instead of on what you are looking at.

- An overlay that paints nothing (`opacity: 0`, `visibility: hidden`) is skipped
  outright. You are never pointing at something invisible.
- One that does paint, like a faint scrim, is still the topmost thing, so
  **hold `Cmd` (macOS) or `Ctrl`** to reach the most specific element under the
  cursor instead. Same idea as selecting through a group in Figma.
- `Alt` + scroll (or `[` / `]`) then walks up and down from wherever you landed.

## The card is a panel

Position, size and theme persist across pages.

- **Grip** (top left): drag to place the card anywhere on screen, which is what
  you want on a wide display. Double-click it to hand the card back to automatic
  docking. The grip turns blue while the card is pinned.
- **Corner handle**: drag to resize, 260 to 680 wide.
- **Sun / moon**: light or dark. The highlights and dimension lines on the page
  never change colour, since they have to read on top of any site.

## What the measurements mean

- **Two elements side by side or stacked** - one gap number, drawn as a dimension
  line between the facing edges, with extension lines so it is obvious which
  edges it spans.
- **One element inside another** - four numbers, one per edge, because a single
  number would be a lie.
- **Elements offset on both axes** - the horizontal and vertical components
  separately, not a diagonal nobody designs against.

`rem` is resolved against the page's real root font-size, not an assumed 16px.
On a site using `html { font-size: 62.5% }` a hardcoded base would report
confidently wrong numbers, which is exactly where QA bugs hide.

## Known limits

- **Iframes**: the tool runs inside each frame independently. Measuring an
  element in the page against an element inside an iframe is not supported.
- **Highlight badges** show rendered size in px regardless of the unit toggle;
  the card is the source of truth for converted values.
- **The card does not follow the cursor.** It docks to a top corner so it is
  always reachable and never covers what you are measuring.
- Canvas, WebGL and video content is inspected as the element that contains it.

## Layout

```
manifest.json           MV3 manifest
src/background.js       service worker: toolbar, keyboard command, per-tab state
src/content/
  index.js              state machine (idle -> armed -> lockedA -> lockedAB) + paint loop
  inspect.js            event capture and element picking
  styles.js             computed styles -> designer vocabulary
  units.js              px / rem / em conversion
  measure.js            gap geometry
  overlay.js            closed shadow root, highlights, dimension lines
  card.js               the card
  spacing-box.js        the margin/border/padding diagram
src/ui/overlay-styles.js  all injected CSS, as a string
src/icons/logo.svg      icon source; logo-small.svg is the 16px variant
test/fixture.html       a page with known-correct values to check against
test/verify.mjs         end-to-end checks in a real Chromium
test/render-icons.mjs   regenerates the icon PNGs from the SVG sources
```

## Tests

```bash
npm install     # playwright, for the tests only; the extension has no dependencies
npm test
```

Loads the extension into a real Chromium, drives it against `test/fixture.html`,
and writes screenshots to `test/out/`. The mouse moves in small steps rather
than teleporting, which is what a scripted click does and what let the v1 card
ship unreachable.

See `DESIGN.md` for the visual system and `DECISIONS.md` for why things are the
way they are.
