# Design system

The visual rules for Design Tool's own UI. It is an inspection tool, so it has
one job: be legible on top of any website, in front of any background, without
competing with the page it is measuring.

Everything here is defined as CSS custom properties on `.layer` in
`src/ui/overlay-styles.js`. Change values there, not in individual rules.

## Principles

1. **The tool is not the page.** Dark, flat, quiet. If the UI has a visual
   opinion, it is getting in the way of the one being reviewed.
2. **Numbers are the interface.** Everything else on the card is a label for a
   number. Numbers are monospaced, right-aligned, and copyable.
3. **Never cover what is being measured.** Position rules exist to keep the
   card out of the work area.
4. **Nothing is hidden to save space.** A zero value is dimmed, not removed, so
   the layout stays stable as you move between elements and your eye can stay
   in one place.

## Colour

Two token groups, and they are not interchangeable. The **page overlay**
(highlights, dimension lines, badges) is never themed: it has to read on top of
whatever the site being reviewed looks like. The **card** is themed, and light
mode only reassigns its surface tokens.

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#14161A` | Card surface |
| `--bg-soft` | `#1C1F25` | Hint bar, unit toggle track |
| `--line` | `rgba(255,255,255,0.10)` | Section dividers, card border |
| `--text` | `#E6E8EB` | Values |
| `--muted` | `#8B929C` | Labels, section titles, zero values |
| `--accent` | `#4F8CFF` | Active unit, tag names, hover controls |
| `--hl-a` | `#4F8CFF` | Element A and the hover highlight (never themed) |
| `--hl-b` | `#FFB020` | Element B (never themed) |
| `--measure` | `#FF3B6B` | Dimension lines and their labels (never themed) |

Light mode reassigns the card tokens only:

| Token | Light value |
| --- | --- |
| `--bg` | `#FFFFFF` |
| `--bg-soft` | `#F2F4F7` |
| `--line` | `rgba(0,0,0,0.10)` |
| `--text` | `#14181D` |
| `--muted` | `#6B7280` |
| `--accent` | `#2F6FE4` (darkened for contrast on white) |

The spacing-box ring tints are tokens too (`--tint-margin`, `--tint-border`,
`--tint-padding`, `--tint-content`) because a 7% wash that reads on near-black
is invisible on white. Light mode roughly doubles them.

Three signal colours, three roles, no overlap:

- **Blue** is "the thing you picked".
- **Amber** is "the thing you picked second".
- **Red** is "the number between them".

Highlights fill at 10-14% alpha so the underlying element stays readable through
them. Ring backgrounds in the spacing box sit at 7-8%.

## Type

| Role | Spec |
| --- | --- |
| Values, identity line, badges | `ui-monospace, SFMono-Regular, Menlo, Consolas` |
| Labels, section titles, hints | `ui-sans-serif, -apple-system, Segoe UI, Roboto` |

| Style | Size / weight / tracking |
| --- | --- |
| Section title | 9px / 600 / `0.09em`, uppercase, `--muted` |
| Label (`dt`) | 12px / 400 / normal, `--muted` |
| Value (`dd`) | 12px / 400 / mono, `--text`, right-aligned |
| Ring value | 10px / 400 / mono |
| Dimension label | 11px / 600 / mono, white on `--measure` |
| Element badge | 10px / 500 / mono, white on the highlight colour |
| Hint | 11px / 400 / sans, `--muted` |

Mono for anything you would compare against a spec. Sans for anything you read
once.

## Space

A 4px base. Used values: 2, 4, 6, 8, 10, 12, 14.

- Card padding: `10px 12px` per section.
- Row gap: `8px` between label column and value column.
- Label column: fixed `88px`, so values align down the whole card regardless of
  label length.
- Card width: `330px`. Wide enough for `Letter spacing  -0.64px (-2%)` and for
  a six-figure stat tile, narrow enough to dock without eating the viewport.
- Card max height: `82vh`, then it scrolls.

## Radius and depth

| Element | Radius |
| --- | --- |
| Card | 10px |
| Ring, content box, copy flash | 4-5px |
| Unit toggle | 6px (track), 4px (button) |
| Dimension label, element badge | 3-4px |
| Highlight rect | 1px |

One shadow, on the card only: `0 12px 32px rgba(0,0,0,0.45)`. Dimension labels
get a small `0 1px 4px` to stay readable over busy pages. Nothing else is
elevated.

## Components

### Card

Sticky header (identity + unit toggle), then sections in reading order:
Measurement, Typography, Spacing, Layout, Fill & effects, then the hint bar.

Sections with nothing meaningful to report are omitted, not shown empty. An
image has no typography; a static div has no fill. Omitting keeps the card short
on simple elements, which is most of them.

### Identity line

`div#hero.card` in mono, coloured by part: tag in `--accent`, id in
`--accent-b`, classes in `--muted`. Truncated to two classes with a `+n`
counter. It reads like a selector because that is what it is.

### Stat tiles

The three values you are actually checking, directly under the header, before
anything else. Which three depends on what the element is:

| Element | Tiles |
| --- | --- |
| Renders its own text | `Size` · `Weight` · `Line height` |
| Flex or grid container | `W` · `H` · `Gap` |
| Anything else | `W` · `H` |

Value 18px/600 mono in `--text`. Label 9px/600 uppercase `0.08em` in `--muted`.
Tile is `--bg-soft`, 6px radius, `8px 10px` padding, equal-width grid with an
8px gutter.

**The unit lives in the label, not the value.** `WIDTH PX` over `1200`, not
`1200px`. Every tile shares the unit, the toggle in the header already states
it, and the number needs the width: a truncated `123.…` is worse than useless
during QA. Copying a tile still copies the full value with its unit.

A qualifier rides after the value at 10px muted: `700 Bold`, `38.4 1.2x`.

When the type trio is on show, those three rows are dropped from the Typography
section below, so nothing is stated twice.

### Row

A two-column grid, `88px 1fr`. Label left in sans and muted, value right in mono
and full contrast. Colour values get a 9px swatch chip before the hex.

### Copyable value

Every number and colour is click-to-copy. Hover shows a soft
`rgba(255,255,255,0.07)` background with a 3px spread, so the hit target reads
as larger than the text. On copy it flashes `--accent` for 420ms. Cursor is
`copy`.

### Spacing box

Four nested rings, outside in: margin (amber tint), border (grey tint), padding
(green tint), content (blue tint). Each ring is dashed, labelled at its top-left
in 8px uppercase, with its four side values placed on the corresponding sides.

Zero sides are dimmed to `#565D68`, never hidden, so the diagram keeps a stable
shape. The content box shows width and height as separate `W` / `H` rows: in rem
a single `W x H` line gets long enough to wrap and shove the rings around.

When the element is a flex or grid container, its `gap` is stated directly under
the diagram. Gap versus padding is the confusion this panel exists to end.

### Header controls

Left to right: drag grip, identity, theme toggle, unit control. 22x22 icon
buttons, 14px stroked SVG at `--muted`, going to `--text` on a `--flash`
ground. The grip turns `--accent` while the card is pinned, which is the only
indication the card is no longer docking itself.

### Resize handle

A 16x16 corner chevron that rides on the card's bottom-right corner but lives
*outside* the card in the overlay layer, so it never scrolls away with the
content and never collides with the scrollbar. 2px `--muted` borders, going
`--accent` on hover. Min 260x160, max 680 wide.

The card's max height is recomputed from its top edge every frame. Pinned low on
a tall page it would otherwise run past the viewport and take its own resize
handle out of reach.

### Highlights

1px solid outline plus a low-alpha fill. Hover is dashed, locked is solid. The
element badge sits flush above the top-left corner and flips inside the element
when it would sit above the viewport. Badge text is `tag#id.class  WxH` in
rendered pixels.

### Dimension lines

1px solid `--measure` with 7px end caps, so a near-zero gap still reads as a
tick rather than disappearing. Extension guides are 1px dashed at 55% alpha.
The label pill sits 12px above a horizontal line, or 22px right of a vertical
one, so the line stays continuous underneath it.

### Unit toggle

A three-up segmented control in the card header. The active mode is a filled
`--accent` pill; inactive modes are `--muted` text that goes full contrast on
hover. `aria-pressed` carries the state.

## Behaviour rules

- **The card is always docked to a top corner and never follows the cursor.**
  A card anchored to the pointer can never be reached, because the pointer is
  never inside it.
- **The card dodges the inspected element, not the pointer.** It docks to the
  side away from whatever is being inspected, which is stable while you move the
  mouse. A rule that reacts to cursor position makes the card flee as you reach
  for it.
- **The card freezes on approach.** Within 48px of the cursor it holds position
  until the cursor is 160px away again. This is the guarantee that no future
  positioning rule can reintroduce the dodge.
- **A pinned card does not move at all.** Dragging the grip pins it;
  double-clicking the grip hands it back to automatic docking. Position and size
  persist across pages.
- **A drag that starts on the card never selects an element.** Releasing a drag
  or resize outside the card fires a click at the page; the press origin is
  tracked so that click is swallowed.
- The overlay layer is `pointer-events: none`; only the card opts back in, so
  hovering the page always reaches the page.
- Everything is fixed-position inside a viewport-clipped layer at
  `z-index: 2147483647`, and the host element is re-attached every frame in case
  the page rewrites the DOM.

## Adding to the UI

Before adding a row, ask whether a designer would check it during QA. Before
adding a section, ask whether it can be omitted when empty. Before adding a
colour, use one of the three that already exist.
