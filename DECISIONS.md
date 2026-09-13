# Decisions

A running log of what this project is, what was decided, and why. Newest
decisions go at the bottom of each section.

## The problem

Designers doing QA on a shipped page have to use DevTools, which is built for
engineers. The Elements panel is a DOM tree. Computed styles are 300 properties
in alphabetical order. Measuring the space between two things means eyeballing
an overlay. None of it maps to how a designer already thinks, which is the
Figma model: hover a layer to see its type styles, select two layers to see the
distance, select a frame to see its padding.

Design Tool rebuilds that surface for any website.

## Scope

**v1 (built):**

1. Hover card with typography, spacing box, layout, and fill/effects.
2. Two-element measurement with dimension lines drawn on the page.
3. Figma-style spacing box (margin / border / padding / content).
4. px / rem / em toggle that converts every number at once.

**Deliberately not in v1:** layer tree panel, contrast checking, design token
matching, screenshot export, comparing against a Figma file. The architecture
leaves room for these; none of them are built.

## Decisions

### Vanilla JS, MV3, no build step

Nine plain files loaded as content scripts. No npm, no bundler, no TypeScript.
Load unpacked, edit a file, hit reload. A build step between every edit and
every test is the wrong trade for a tool this size, and it makes the repo
approachable to a designer who wants to change a colour. Revisit if the UI
grows past a few panels.

### Toolbar toggle arms the tool, Esc exits

Clicking the extension icon or pressing `Option+Shift+I` (`Alt+Shift+I` on
Windows) arms inspect mode. Hover
is live while armed; the first click locks element A, the second sets B, a third
starts over from whatever was clicked. `Esc` clears the measurement, `Esc` again
exits. One mode instead of separate inspect and measure modes: switching modes
to measure two things is friction in the exact moment you want to be fast.

The alternative considered was a DevTools panel. Rejected: it requires DevTools
to be open, which is the thing this tool exists to avoid.

### The whole UI lives in a closed shadow root

The host page's CSS cannot restyle the tool, and the tool's CSS cannot leak into
the page being reviewed. A tool that changes the page it is measuring is worse
than no tool.

CSS is a JS string (`src/ui/overlay-styles.js`) rather than a `.css` file. A
manifest `"css"` entry would inject into the page instead of the shadow root,
and fetching a stylesheet at runtime trips strict CSP on sites like GitHub.

### The page does not receive clicks while armed

All pointer events are captured at the window and suppressed. Clicking a nav
link to measure it must not navigate away. Events from our own card are let
through, which one `event.target === host` check covers, because events crossing
a closed shadow root are retargeted to the host.

### Element picking uses `elementFromPoint`, not `event.target`

`document.elementsFromPoint()` returns the full stack under the cursor,
innermost first. That gives both the pick and the DOM walk (`Alt` + scroll,
`[` / `]`) from one call, and it naturally skips the overlay, which is
`pointer-events: none`.

### rem resolves against the page's real root font-size

Not an assumed 16px. Sites using `html { font-size: 62.5% }` are exactly where
QA bugs hide, and a hardcoded base would report confidently wrong numbers there.
The root size is re-read on activation and on resize, since it is often
responsive. `em` uses the inspected element's own font-size.

### Rects are re-read every animation frame while armed

Rather than caching on scroll. Sticky headers, scroll-linked animations and SPA
re-renders all move elements without a scroll event that maps cleanly to them.
Re-reading is two `getBoundingClientRect()` calls per frame, which is cheap; the
card is only re-rendered when its content signature changes, and the measurement
lines are only rebuilt when the geometry actually moved.

### The card docks to a corner once an element is locked

Found during testing: a card anchored next to element A covers exactly the
element you are trying to measure against. So the card behaves like a tooltip
and follows the cursor while you are only hovering, then docks to a top corner
the moment anything is locked. The corner flips only when the cursor gets close
to it, so it does not jump around while you work.

### Nested elements get four numbers, not one

A single "distance" between an element and its container is meaningless. When
two elements overlap or nest, the tool reports all four edge distances. When
they are offset on both axes, it reports the horizontal and vertical components
rather than a diagonal, because nobody designs against a hypotenuse.

### Two decimal places

Real layout produces subpixel values. Three decimals is noise, zero decimals
hides genuine half-pixel bugs. Two is where it stops being useful and starts
being clutter.

## v1.1

### The card could not be hovered, and it was a dodge bug

Reported from real use: switching px/rem/em and clicking values to copy was
painful to impossible. Two independent causes in `DT.card.position()`, and
between them the card was unreachable in every state:

- **Hover mode** placed the card at `cursor + 14px` every frame, so the pointer
  was never inside it. Move toward it, it moves the same amount, forever.
- **Locked mode** docked to a corner but flipped to the opposite corner once the
  cursor came within 342px. Reach for it, it jumps across the screen.

Pointer events were never the problem: `.card` correctly re-enables them inside
the `pointer-events: none` layer. The v1 test missed it because scripted clicks
teleport the mouse straight onto the target, which is the one way a human never
approaches anything.

Fixed by making the card always docked, choosing its corner from the inspected
element rather than the cursor, and freezing it outright once the pointer comes
near. `test/verify.mjs` now glides the mouse in 30 steps and asserts the card
stays put; run against the pre-fix commit it fails exactly the four checks the
bug caused.

The floating tooltip is gone as a result, which is a real loss of the "card
follows your eye" feel. The per-element readout it was providing is still on the
page, in the highlight badge above each element.

### `U` cycles units

The toggle being reachable is necessary but still costs a mouse trip across the
screen. `U` cycles px / rem / em from wherever your hand already is.

### The values that matter got promoted to stat tiles

Width and height for a container, and size / weight / line-height for text, were
rendering at the same visual weight as `text-align` and `z-index`. Those are the
numbers being checked during QA, so they now sit in large tiles above everything
else, and are dropped from the detail rows below to avoid saying them twice.

### Type styles are only reported where they mean something

Every element inherits a font, so v1 showed a full Typography section on images
and layout containers. It now appears only for elements that render their own
text, plus form controls that render text from a value.

## v1.2

### Invisible overlays were stealing every hover

Reported from a real site: hovering a card selected a `span.absolute.inset-0`
with `opacity: 0` rather than the heading or the date under it. Full-bleed click
targets are how most card grids are built, and the topmost painted element is
always that overlay.

Two changes. An element that paints nothing (`opacity: 0`, `visibility: hidden`)
is now skipped outright: you are never pointing at something invisible. And
holding Cmd (macOS) or Ctrl reaches past whatever covers the target, the way
Figma lets you select through a group.

The deep pick is **smallest box wins, deeper node breaks the tie**. DOM depth
alone is not enough, which cost a round of debugging: a full-bleed scrim is
usually a *sibling* of the heading it covers, so both sit at the same depth and
paint order hands you the scrim.

### The card is a panel now, not just a readout

Three asks that are really one: on a large screen there is dead space, and the
tool should let you put the panel in it and size it to taste.

- **Drag by the grip** to place the card anywhere; double-click the grip to hand
  it back to automatic docking.
- **Resize from the corner**, 260-680 wide.
- **Light and dark**, since QA on a light site with a black panel next to it
  makes colour judgement harder.

All three persist across pages in one storage key.

The resize handle lives in the overlay layer rather than inside the card. Native
`resize: both` put its grip under the scrollbar and was unreliable to hit, and a
handle inside a scrolling card scrolls away with the content.

### Two bugs the new tests found

A drag or resize released outside the card fired a click at the page, which
locked whatever was under the pointer. The press origin is now tracked, so a
click whose press started on our own UI is swallowed.

A card pinned low on the page ran past the bottom of the viewport, putting its
own resize handle out of reach. Max height is now computed from the card's top
edge every frame.

### The toggle is Option+Shift+I

The brand guideline mocks the shortcut as `Cmd+Shift+I`, which is Chrome's own
DevTools binding and cannot be overridden by an extension. `Option+Shift+I`
keeps the `I` for inspect and is unclaimed on both platforms.

Chrome keeps whatever binding a user already has when a suggested key changes,
so anyone who installed before this needs to reset it at
`chrome://extensions/shortcuts`.

### Nested insets measure from the padding box

Reported from a real page: DevTools said the container's padding was 12px, the
spacing diagram agreed, and the measurement said 13px.

All three were right. `getBoundingClientRect()` returns the **border box**, so
the distance from a container's outer edge to its child includes the
container's 1px border. Correct arithmetic, wrong number: nobody QAs the
border-box inset, and the border is already reported on its own line in the
spacing diagram, so counting it here states it twice.

When one element really is an ancestor of the other, the container's rect is
now shrunk by its border widths before measuring. Siblings are untouched: the
visible gap between two elements genuinely is border box to border box.

The adjustment lives in the caller (`index.js`) rather than in `measure.js`, so
the geometry stays a pure rect-in, numbers-out function. That let it get unit
tests that need no browser (`test/measure.test.mjs`).

## Open questions for v2

- Cross-frame measurement (element in the page vs element inside an iframe).
- Whether the highlight badge should honour the unit toggle, or stay px as a
  "rendered size" readout. Currently px.
- A pinned panel mode for reviewing many elements in sequence without the card
  moving at all.
- Design token matching: flag when a value is off-scale for the site's own
  spacing or type ramp.
