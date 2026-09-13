# Design Tool

A Chrome extension that turns any website into something you can QA the way you
review a Figma file. Hover an element to read its type styles. Click two
elements to measure the gap between them. See padding, border and margin as a
spacing box instead of an alphabetical list of CSS.

Built for designers doing design QA, not for reading CSS.

![Measuring the gap between two cards](docs/measure.png)

## What it does

- **Type styles at a glance.** Size, weight and line height as large readouts,
  plus family, letter spacing, transform and colour underneath.
- **Measure between two elements.** Dimension lines drawn on the page, with
  extension lines so it is obvious which edges the number spans.
- **A spacing box.** Margin, border, padding and content as nested rings, with
  the container's `gap` stated next to its padding.
- **px, rem and em**, converted everywhere at once. `rem` resolves against the
  page's real root font-size, not an assumed 16px.
- **Click any value to copy it.**

## Permissions

`activeTab`, `scripting` and `storage`. That is all.

There is no host permission and no always-on content script. Nothing is injected
into any page until you click the toolbar icon or press the shortcut, and Chrome
grants access only to that one tab, only for that visit. Install shows no "read
your data on all websites" warning.

It makes no network requests. It stores your unit, theme, card position and card
size, locally, and nothing else.

## Install

Not on the Chrome Web Store yet. To run it now:

1. Download or clone this repo.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**, top right.
4. Click **Load unpacked** and select the repo folder.

No build step and no dependencies. Edit a file, press the reload icon on the
extension card, refresh the page you are testing.

## Use it

| Action | What happens |
| --- | --- |
| Toolbar icon, or `Option+Shift+I` (`Alt+Shift+I` on Windows) | Arms inspect mode, badge reads `ON` |
| Hover | The card reads typography, spacing, layout and fill for whatever is under the cursor |
| Click an element | Locks it as **A**, blue |
| Hover another | Live measurement between A and it |
| Click again | Freezes it as **B**, amber |
| Click a third element | Starts a new measurement from that one |
| Hold `Cmd` / `Ctrl` while hovering | Reaches past overlays to the most specific element under the cursor |
| `Alt` + scroll, or `[` / `]` | Walks up and down the DOM |
| `U` | Cycles px / rem / em |
| Click any value | Copies it |
| `Esc` | Clears the measurement. `Esc` again exits |

While inspect mode is armed the page does not receive clicks, so you can measure
a nav link without navigating away.

### The card

It sits in the top-right corner and stays there. It does not follow the cursor
and it does not change corners as you hover.

| Control | What it does |
| --- | --- |
| Grip, top left | Drag to place the card anywhere. Double-click to send it home |
| Corner handle | Drag to resize, 260 to 640 wide |
| Sun / moon | Light or dark |
| ✕ | Stops the tool, same as `Esc` `Esc` |

Position, size and theme persist across pages.

## Reaching the element you actually want

Most card grids are built with a full-bleed click target: an `<a>` or `<span>`
with `position: absolute; inset: 0` stretched over the whole card. It sits on
top of the heading, the date and everything else, so a plain hover lands on it
instead of on what you are looking at.

- An overlay that paints nothing (`opacity: 0`, `visibility: hidden`) is skipped
  outright. You are never pointing at something invisible.
- One that does paint, like a faint scrim, is still the topmost thing, so
  **hold `Cmd` (macOS) or `Ctrl`** to reach the most specific element under the
  cursor. Same idea as selecting through a group in Figma.
- `Alt` + scroll then walks up and down from wherever you landed.

## What the measurements mean

![The card reading type styles](docs/typography.png)

- **Two elements side by side or stacked**: one gap number, drawn between the
  facing edges.
- **One element inside another**: four numbers, one per edge, because a single
  number would be a lie. Measured from the container's **padding box**, so a
  12px padding with a 1px border reads as 12px, not 13px.
  `getBoundingClientRect()` returns the border box, and the border is already
  reported on its own in the spacing diagram.
- **Elements offset on both axes**: the horizontal and vertical components
  separately, not a diagonal nobody designs against.

## Known limits

- **Iframes.** The tool runs inside each frame independently. Measuring an
  element in the page against one inside an iframe is not supported.
- **Highlight badges** show rendered size in px whatever the unit toggle says.
  The card is the source of truth for converted values.
- **Strict CSP sites** may refuse the bundled fonts, and the card falls back to
  system fonts. Everything else still works.
- Canvas, WebGL and video are inspected as the element that contains them.

## Development

The extension itself has **no dependencies and no build step**. You only need
npm to run the tests.

```bash
npm install         # installs Playwright, for the browser tests only
npm test            # manifest checks, geometry units, then the browser suite
npm run test:unit   # geometry only, runs in a second, no browser
npm run package     # builds dist/design-tool-<version>.zip for the Web Store
```

The browser suite drives a real Chromium with the extension loaded. It runs
against a **patched copy** built by `test/build-test-extension.mjs`: the shipped
manifest only has `activeTab`, which Chrome grants on a real toolbar click, and
Playwright cannot click browser chrome, so the copy adds a content script back.
`test/manifest.test.mjs` asserts the shipped manifest stays minimal, so the two
cannot quietly diverge.

The mouse moves in small steps rather than teleporting. A scripted click jumps
straight to its target, which is the one way a human never approaches anything,
and it let an unreachable card ship once already.

## Layout

```
manifest.json              MV3 manifest
src/background.js          service worker: toolbar, command, per-tab state
src/content/
  index.js                 state machine and paint loop
  inspect.js               event capture and element picking
  styles.js                computed styles into designer vocabulary
  units.js                 px / rem / em conversion
  measure.js               gap geometry, pure functions
  overlay.js               closed shadow root, highlights, dimension lines
  card.js                  the card
  spacing-box.js           the margin/border/padding diagram
  prefs.js                 persisted unit, theme, position, size
src/ui/overlay-styles.js   all injected CSS, as a string
src/icons/icon.svg         icon source, exported from Figma
src/fonts/                 the two brand typefaces, with their OFL licences
test/fixture.html          a page with known-correct values to check against
test/verify.mjs            end-to-end checks in a real Chromium
test/measure.test.mjs      geometry unit tests, no browser
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
