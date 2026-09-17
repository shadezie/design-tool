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

From the brand guideline (Figma, "Brand guidelines v1.0"). Four brand colours,
and the guideline's own ratio note: neutral ground, ink type, blue used
sparingly.

| Brand | Hex | Use |
| --- | --- | --- |
| Primary | `#2A51FD` | The mark, primary actions, active states |
| Light | `#E8EDFF` | Chips, highlights |
| Ink | `#0F172A` | Body copy and product chrome |
| Neutral | `#F4F6FA` | Page and panel backgrounds, cards |

Two token groups, and they are not interchangeable. The **page overlay**
(highlights, dimension lines, badges) is never themed: it has to read on top of
whatever the site being reviewed looks like. The **card** is themed.

| Token | Dark | Light |
| --- | --- | --- |
| `--bg` | `#0F172A` (Ink) | `#FFFFFF` |
| `--bg-soft` | `#1A2440` | `#F4F6FA` (Neutral) |
| `--line` | `rgba(232,237,255,0.12)` | `rgba(15,23,42,0.10)` |
| `--text` | `#F4F6FA` (Neutral) | `#0F172A` (Ink) |
| `--muted` | `#8895B3` | `#5D6B85` |
| `--accent` | `#2A51FD` | `#2A51FD` |
| `--accent-text` | `#6E8CFF` | `#2A51FD` |
| `--flash` | `rgba(232,237,255,0.09)` | `#E8EDFF` (Light) |

`--accent` fills things that carry white text, so it stays brand-exact. Brand
blue as *text* on the Ink ground is too dark to read, so `--accent-text` lifts
it on dark and is brand-exact on light. Hex readouts use it, as the guideline's
inspector mock does.

`--bg-soft` on dark is derived rather than brand-specified: the guideline gives
one dark ground, and the chips in its own product mock sit a step above it.

### Functional colours, outside the brand palette

| Token | Hex | Why |
| --- | --- | --- |
| `--hl-a` | `#2A51FD` | Brand primary. The element you picked |
| `--hl-b` | `#FFB020` | A second element must be tellable apart from the first |
| `--measure` | `#FF3B6B` | A dimension line must be tellable apart from both |

The brand palette has one accent. Measurement needs three signals at once on top
of an arbitrary site, so B and the dimension lines borrow amber and pink. They
are the only non-brand colours in the tool and they never touch the card chrome.

## Type

Both brand typefaces ship with the extension as WOFF2 (`src/fonts/`, ~47KB
total), registered on the document with the CSS Font Loading API. `@font-face`
inside a shadow root is ignored by Chrome, so they cannot be declared in the
overlay stylesheet. A strict `font-src` CSP can still refuse them; every step is
guarded and the stack falls back to the platform fonts.

| Role | Face |
| --- | --- |
| Labels, values, inspector readouts, section titles | IBM Plex Mono |
| Hints and prose | Plus Jakarta Sans |

The guideline assigns **labels as well as values** to the mono, which is why row
labels are mono rather than sans. Mono labels are wider, so the label column is
106px rather than the 88px the sans version used.

| Style | Size / weight / tracking |
| --- | --- |
| Section title | 9px / 500 mono / `0.18em`, uppercase, `--muted` |
| Tile label | 8px / 500 mono / `0.12em`, uppercase, `--muted` |
| Tile value | 18px / 500 mono / `-0.02em`, `--text` |
| Label (`dt`) | 11px / 400 mono, `--muted` |
| Value (`dd`) | 12px / 400 mono, `--text`, right-aligned |
| Shortcut meaning, state line | 11px / 400 sans, `--muted` / `--text` |

Section labels take the brand's `0.18em` uppercase tracking. Tile labels drop to
`0.12em` at 8px, because `LINE HEIGHT PX` clips inside an 86px tile at `0.18em`.
Display sizes tighten tracking per the guideline's `-0.035em` note; at 18px the
tile values take `-0.02em`.

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

Left to right: drag grip, identity, theme toggle, unit control, close. 22x22
icon buttons, 14px stroked SVG at `--muted`, going to `--text` on a `--flash`
ground. Close is the exception: it goes white on `--measure`, because stopping
the tool is the one destructive thing in the header.

The grip turns `--accent` while the card is pinned, the only indication that the
card is no longer in its home position.

### Shortcuts

A state line in `--text` saying what to do next, then a keys-and-meaning table:
a 104px column of `kbd` chips, then the meaning in sans `--muted`.

This was a paragraph of prose, which nobody reads. As a table it is scannable
and the tool teaches itself while you use it. Keep every meaning to one line at
330px; that is the whole point of the format.

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

- **The card has one home: the top-right corner, and it stays there.** It does
  not follow the cursor and it does not pick a side per element. Both of those
  shipped and both were wrong: a card anchored to the pointer can never be
  reached, and a card that re-chooses its corner wanders across the screen while
  you are only hovering. One fixed home is calmer and you build a habit around
  it.
- **A pinned card does not move at all.** Dragging the grip pins it wherever you
  drop it; double-clicking the grip sends it home. Position, size and theme
  persist across pages.
- **A drag that starts on the card never selects an element.** Releasing a drag
  or resize outside the card fires a click at the page; the press origin is
  tracked so that click is swallowed.
- The overlay layer is `pointer-events: none`; only the card opts back in, so
  hovering the page always reaches the page.
- Everything is fixed-position inside a viewport-clipped layer at
  `z-index: 2147483647`, and the host element is re-attached every frame in case
  the page rewrites the DOM.

## Icon

`src/icons/icon.svg` is the source of truth, exported from Figma. The mark is
three corner brackets around a cursor, on `#2A51FD`.

The committed PNGs (16, 32, 48, 128) are Figma exports too. Figma hints small
sizes better than a browser downscale does, so prefer exporting from there.
`node test/render-icons.mjs` regenerates them from the SVG when you need a size
Figma has not exported; check the 16px result by eye before keeping it, since
that is where the cursor and the top-left bracket start to merge.

Note the icon blue (`#2A51FD`) is deeper than the UI accent (`--accent`,
`#4F8CFF`). The lighter blue is chosen to stay legible on top of arbitrary
websites, which the icon never has to do.

## Adding to the UI

Before adding a row, ask whether a designer would check it during QA. Before
adding a section, ask whether it can be omitted when empty. Before adding a
colour, use one of the three that already exist.

## Token rows

A token name is the answer and the raw value is the evidence, so the name leads
and the value sits under it, quieter.

| Part | Spec |
| --- | --- |
| Token name | 11.5px/500 mono, `--accent-text` |
| Value match | the same, with `underline dotted var(--line)`, 3px offset |
| Raw value | 10.5px/400 mono, `--muted`, right-aligned under the name |

Both halves copy independently: the name yields `var(--token)` for code, the
value yields the hex for Figma.

## Media chip

| Part | Spec |
| --- | --- |
| Kind | 11.5px/500 sans, `--text` |
| Format chip | 9px/500 mono, white on `--accent`, 4px radius, `2px 6px` |

The format is the one thing being looked for, so it is the only chip on the card
that gets a filled accent ground.

## A/B pair columns

Two equal columns on `--bg-soft`, 5px radius, 8px gutter, under a hairline rule.
Each carries a 13px square badge in the same colour as that element's on-page
highlight (`--hl-a`, `--hl-b`), so the column and the box it describes are
obviously the same thing. Keys are 9.5px `--muted`, values 10.5px/500 `--text`.
