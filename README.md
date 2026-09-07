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
| Click an element | Locks it as **A** (blue). The card docks to a top corner |
| Hover another element | Live measurement between A and it |
| Click again | Freezes it as **B** (amber) |
| Click a third element | Starts a new measurement from that element |
| `Alt` + scroll, or `[` / `]` | Walks up and down the DOM from the current element |
| Click any value in the card | Copies it |
| `px` / `rem` / `em` in the card header | Converts every number at once. Remembered between pages |
| `Esc` | Clears the measurement. `Esc` again exits inspect mode |

While inspect mode is armed the page does not receive clicks, so you can measure
a nav link without navigating away.

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
```

See `DESIGN.md` for the visual system and `DECISIONS.md` for why things are the
way they are.
