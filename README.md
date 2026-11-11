# Design Tool

A Chrome extension that turns any website into something you can QA the way you
review a Figma file. Hover an element to read its type styles. Click two
elements to measure the gap between them. See padding, border and margin as a
spacing box instead of an alphabetical list of CSS.

Built for designers doing design QA, not for reading CSS.

![Measuring the gap between two headings, with the spec of both](docs/readme/gap-distance.png)

## What it does

- **A stage with device sizes.** The page is framed beside the panel at mobile,
  tablet, desktop or large desktop size, or any width and height you type.
- **Type styles at a glance.** Size, weight and line height as large readouts,
  plus family, letter spacing, transform and colour underneath.
- **Measure between two elements.** Dimension lines drawn on the page, with
  extension lines so it is obvious which edges the number spans.
- **A spacing box.** Margin, border, padding and content as nested rings, with
  the container's `gap` stated next to its padding.
- **Design token names instead of raw values.** If the page defines a token
  system, a colour reads as `--color-brand`, with the hex underneath. Copy
  either one.
- **Media, identified.** Whether it is a video or an image, what format it is
  actually being served in, and whether the asset is the right size for the box
  it is drawn in.
- **Both sides of a measurement.** The distance, plus the spec of each of the
  two elements it spans.
- **px, rem and em**, converted everywhere at once. `rem` resolves against the
  page's real root font-size, not an assumed 16px.
- **Click any value to copy it.**

## Permissions

`activeTab`, `scripting`, `storage` and `declarativeNetRequestWithHostAccess`.

There is no host permission and no always-on content script. Nothing is injected
into any page until you click the toolbar icon or press the shortcut, and Chrome
grants access only to that one tab, only for that visit. Install shows no "read
your data on all websites" warning.

The fourth permission exists for the stage. Many sites send a header that
forbids showing them inside a frame, and the stage is a frame. While the tool is
on in a tab, one rule removes `X-Frame-Options` and `Content-Security-Policy`
from that tab's own frames of the site you are on, and it is deleted when the
tool is turned off. It touches no other tab and no other site, and the page in
the tab itself keeps its headers: only the copy on the stage loads without
them.

It makes no network requests of its own. It stores your unit, theme, which edge
the panel docks to, which sections you folded and the stage size you last used,
locally, and nothing else.

## Install

[**Install from the Chrome Web Store**](https://chromewebstore.google.com/detail/design-tool/ggnmijonbnnankhpgaiiieejmbdopbka)

Or load it from source:

1. Download or clone this repo.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**, top right.
4. Click **Load unpacked** and select the repo folder.

No build step and no dependencies. Edit a file, press the reload icon on the
extension card, refresh the page you are testing.

## Use it

| Action | What happens |
| --- | --- |
| Toolbar icon, or `Option+Shift+I` (`Alt+Shift+I` on Windows) | Opens the panel and arms inspect mode, badge reads `ON` |
| Hover | The panel reads typography, spacing, layout and fill for whatever is under the cursor |
| Click an element | Locks it as **A**, blue |
| Hold `Cmd` / `Ctrl` and hover another | Shows the gap between A and it, live |
| `Cmd` / `Ctrl` + click | Keeps that measurement on screen, the second element becomes **B**, amber |
| Click another element, no key held | Selects it as the new A |
| Hold `Cmd` / `Ctrl` with nothing locked | Reaches past overlays to the most specific element under the cursor |
| `Alt` + scroll, `[` / `]`, or the trail in the panel | Walks up and down the DOM |
| `U` | Cycles px / rem / em |
| Click any value | Copies it |
| `Esc`, or **Clear** in the panel | Clears the selection |
| ✕ in the panel, or the toolbar icon again | Closes the tool |

While inspect mode is armed the page does not receive clicks, so you can measure
a nav link without navigating away.

Measurements wait for the key on purpose. Showing a dimension line on every
hover after locking A covered the page in numbers while you were only moving the
mouse. Without the key, hovering shows a dashed outline of what a click would
select and nothing else.

### The stage

Turning the tool on moves the page onto a stage: the same URL, loaded in a
frame beside the panel. It opens at **Fit**, the largest size the stage can show
at 100%.

| Control | What it does |
| --- | --- |
| Interact / Inspect | The stage opens in Interact, where the page works as normal: open a menu, follow a link. Switch to Inspect to hover and click for styles and measurements |
| Device icons | Mobile 390, Tablet 768, Desktop 1440, Large desktop 1920, or Fit |
| Size list | The named sizes for that device, following Figma's frame presets: iPhones from SE to 18 Pro Max, Android, iPads, Surface, MacBooks, and 2560 × 1440 under Large. Closed, it shows the device name; the list shows each size |
| Width × height | Type any size from 240 to 3840 |
| Rotate | Swaps width and height |
| Handles on the frame's right and bottom edges | Drag to set the width or the height, as in DevTools. Arrow keys nudge them |
| Percentage, right | How far the page is scaled down to fit. Measurements are always the page's real pixels |

A framed page has a real viewport, so media queries, `vh` units and container
sizes all respond to the size you pick. It is a viewport, not a device: the
user agent, touch input and pixel density stay your desktop's.

The page loads a second time to get onto the stage, so anything held only in
memory starts over: an open modal, a half-filled form. Your login carries
across. Use Interact to get back to the state you want to inspect.

**Some sites refuse to be framed.** They send a header that forbids it. The
tool removes that header for the stage's own frame, so most of them still work.
Where that is not enough, and on local `file://` pages, the tool says so and
inspects the page in place, with the panel docked over it and device sizes
unavailable.

### The panel

A side panel docked to the right edge, full height, there from the moment the
tool is on. It does not float, follow the cursor or change size.

| Control | What it does |
| --- | --- |
| px / rem / em | Units, everywhere at once |
| Dock icon | Moves the panel to the other edge, to reach what is under it |
| Sun / moon | Light or dark |
| ✕ | Closes the tool |
| Section titles | Fold a section. Folded sections stay folded |
| Trail under the selection | Click an ancestor to select it |
| Footer | Says what the next click does, with a Clear button |

The first time, the panel opens with three steps explaining the flow. They go
away once you have kept a measurement, or when you dismiss them.

Edge, theme, unit and folds persist across pages.

## Reaching the element you actually want

Most card grids are built with a full-bleed click target: an `<a>` or `<span>`
with `position: absolute; inset: 0` stretched over the whole card. It sits on
top of the heading, the date and everything else, so a plain hover lands on it
instead of on what you are looking at.

- An overlay that paints nothing (`opacity: 0`, `visibility: hidden`) is skipped
  outright. You are never pointing at something invisible.
- One that does paint, like a faint scrim, is still the topmost thing, so
  **hold `Cmd` (macOS) or `Ctrl`** to reach the most specific element under the
  cursor. Same idea as selecting through a group in Figma. This applies while
  nothing is locked; once A is locked the same key measures instead, and the
  trail or `Alt` + scroll does the fine picking.
- `Alt` + scroll then walks up and down from wherever you landed.

## Design tokens

![A colour reported as --ink, with the hex underneath](docs/readme/font-size.png)

If the page is built on CSS custom properties, the panel names the token rather
than the value it resolved to: `--color-brand` instead of `#2A51FD`, with the
hex still shown underneath. Click the name to copy `var(--color-brand)`, click
the hex to copy `#2A51FD`.

Two things find the token, and they cover different ground:

- **Reading the rule.** The stylesheet rule that styles the element is checked
  for a literal `var(--token)`. Exact, but `.cssRules` throws on a cross-origin
  stylesheet, so a site serving CSS from a CDN gives this path nothing.
- **Matching the value.** Every custom property the page defines is resolved to
  its computed value and matched by value. Works wherever the CSS came from.

A value match is a guess, since two tokens can share a hex, and it is marked
with a dotted underline to say so. When neither finds anything, the raw value is
shown as before.

## Media

![An image reported with its format, ratio and asset scale](docs/readme/image-video-tag.png)

Hover an image or video and the panel says which it is, what format it is being
served in, and how the asset compares to the box it is drawn in.

- **Format** comes from `currentSrc`, the file the browser actually chose out of
  `srcset`, not the `src` fallback. So a `<picture>` serving WebP reports WebP.
- **Asset scale** is the intrinsic size over the rendered size. Below 1x is
  upscaling and looks soft; 2x is a retina asset; 3x in a small slot is wasted
  bytes.
- **A video that autoplays, loops and is muted with no controls** is reported as
  a background loop, because it behaves nothing like a video someone plays.
- Images also report `srcset`, lazy loading, `object-fit` and whether they have
  alt text.

## What the measurements mean

![An element measured inside its container, one number per edge](docs/readme/container-padding.png)

- **Two elements side by side or stacked**: one gap number, drawn between the
  facing edges.
- **One element inside another**: four numbers, one per edge, because a single
  number would be a lie. Measured from the container's **padding box**, so a
  12px padding with a 1px border reads as 12px, not 13px.
  `getBoundingClientRect()` returns the border box, and the border is already
  reported on its own in the spacing diagram.
- **Elements offset on both axes**: the horizontal and vertical components
  separately, not a diagonal nobody designs against.

Under the number, both measured elements are described in the same A/B colours
as their on-page highlights: the type spec for text, width and height for a box.
"24px between what?" is the next question every time.

## Known limits

- **The stage is a viewport, not a device.** It sets width and height. It does
  not change the user agent, touch input, hover capability or pixel density,
  so a site that serves different HTML to phones still serves the desktop one.
- **No network throttling.** Chrome only offers that to extensions through the
  `debugger` permission, which would put a warning on install and a banner on
  every use. DevTools throttling works alongside this tool.
- **The page loads twice on the stage.** The original stays underneath, paused
  and covered, so analytics will count a second page view.
- **The copy on the stage loads without the site's Content-Security-Policy.**
  That header can only be removed whole, and it is where the framing rule
  lives. A page that relies on its CSP to block one of its own scripts could
  behave differently on the stage than in the tab.
- **Where a page cannot be framed, the panel sits on it.** Whatever is under
  the panel cannot be hovered until you flip it to the other edge.
- **Screenshots in this README** predate the side panel and show the old
  floating card.
- **Iframes inside the page** are inspected as one element. The tool does not
  reach into them.
- **Highlight badges** show rendered size in px whatever the unit toggle says.
  The panel is the source of truth for converted values.
- **Strict CSP sites** may refuse the bundled fonts, and the panel falls back to
  system fonts. Everything else still works.
- **Canvas and WebGL** are inspected as the element that contains them; there
  is no way to reach inside what they draw.
- **Token matching by value** cannot tell two tokens with the same hex apart.
  The dotted underline marks a match it inferred rather than read.

## Development

The extension itself has **no dependencies and no build step**. You only need
npm to run the tests.

```bash
npm install         # Playwright plus the Chromium it drives, for the tests only
npm test            # manifest, geometry and contrast checks, then both browser suites
npm run test:unit   # geometry only, runs in a second, no browser
npm run package     # builds dist/design-tool-<version>.zip for the Web Store
npm run dev         # builds ./dev/, a side-by-side copy for local testing
```

### Running the dev copy next to the published one

An unpacked folder and the Web Store listing get different extension IDs, so
Chrome treats them as two unrelated extensions. Both can be installed at once
and they do not share storage, which is what you want: test locally without
touching the version you actually use.

What they would otherwise share is a name, an icon and a shortcut. `npm run
dev` writes a `dev/` folder that fixes all three:

- named **Design Tool (Dev)**
- **black** icon (brand Ink) instead of brand blue
- **Alt+Shift+D**, leaving Alt+Shift+I to the published build

Load `dev/` once via **Load unpacked**. After that, re-run `npm run dev` and
press reload on the extension card to pick up code changes. `dev/` is
gitignored and generated from `manifest.json` and `src/` at build time, so a
dev name or colour can never reach a store release.

`npm install` also downloads a Chromium for Playwright to drive, which is the
slow part and is a few hundred MB. If it was skipped, the browser suite fails
with "Looks like Playwright was just installed"; run `npx playwright install
chromium` to fix it.

`npm run package` and `npm run test:unit` need neither Playwright nor the
browser.

The browser suite drives a real Chromium with the extension loaded. It runs
against a **patched copy** built by `test/build-test-extension.mjs`: the shipped
manifest only has `activeTab`, which Chrome grants on a real toolbar click, and
Playwright cannot click browser chrome, so the copy adds a content script back.
`test/manifest.test.mjs` asserts the shipped manifest stays minimal, so the two
cannot quietly diverge.

The mouse moves in small steps rather than teleporting. A scripted click jumps
straight to its target, which is the one way a human never approaches anything,
and it let an unreachable card ship once already.

Under Playwright's headless Chromium the tests hold `Control`, since that is the
modifier on the platform they run on.

## Layout

```
manifest.json              MV3 manifest
src/background.js          service worker: toolbar, command, per-tab state
src/content/
  index.js                 state machine and paint loop
  inspect.js               event capture and element picking
  styles.js                computed styles into designer vocabulary
  units.js                 px / rem / em conversion
  tokens.js                design token names for computed values
  measure.js               gap geometry, pure functions
  target.js                which window is being inspected: the top one, or the stage's frame
  overlay.js               closed shadow root, highlights, dimension lines
  stage.js                 the framed page, device sizes, the toolbar
  card.js                  the panel's contents
  spacing-box.js           the margin/border/padding diagram
  prefs.js                 persisted unit, theme, dock edge, folds
src/ui/overlay-styles.js   all injected CSS, as a string
src/icons/icon.svg         icon source, exported from Figma
src/fonts/                 the two brand typefaces, with their OFL licences
test/fixture.html          a page with known-correct values to check against
test/verify.mjs            end-to-end checks in a real Chromium, page inspected in place
test/stage.test.mjs        end-to-end checks of the stage, page served over http
test/measure.test.mjs      geometry unit tests, no browser
test/contrast.test.mjs     holds the palette to its contrast floors, no browser
test/manifest.test.mjs     keeps the shipped manifest minimal
test/build-test-extension.mjs  patched copy the browser suite drives
test/package.mjs           builds the Web Store zip
test/render-icons.mjs      regenerates the icon PNGs from icon.svg
```

## Licence

Code is MIT, see [LICENSE](LICENSE).

The bundled typefaces are SIL Open Font License 1.1, with their licence texts in
`src/fonts/`. The Design Tool name and logo are not covered by the MIT licence.

`DESIGN.md` is the visual system. `DECISIONS.md` is why things are the way they
are, including the things that turned out to be wrong.
