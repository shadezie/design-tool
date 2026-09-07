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

Clicking the extension icon or pressing `Alt+Shift+D` arms inspect mode. Hover
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

## Open questions for v2

- Cross-frame measurement (element in the page vs element inside an iframe).
- Whether the highlight badge should honour the unit toggle, or stay px as a
  "rendered size" readout. Currently px.
- A pinned panel mode for reviewing many elements in sequence without the card
  moving at all.
- Design token matching: flag when a value is off-scale for the site's own
  spacing or type ramp.
