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

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#14161A` | Card surface |
| `--bg-soft` | `#1C1F25` | Hint bar, unit toggle track |
| `--line` | `rgba(255,255,255,0.10)` | Section dividers, card border |
| `--text` | `#E6E8EB` | Values |
| `--muted` | `#8B929C` | Labels, section titles, zero values |
| `--accent` | `#4F8CFF` | Element A, hover highlight, active unit |
| `--accent-b` | `#FFB020` | Element B |
| `--measure` | `#FF3B6B` | Dimension lines and their labels |

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
- Card width: `300px`. Wide enough for `Letter spacing  -0.64px (-2%)`, narrow
  enough to dock without eating the viewport.
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

- The card follows the cursor while hovering, and docks to a top corner as soon
  as anything is locked. It flips corners only when the cursor comes within
  three margins of it.
- The overlay layer is `pointer-events: none`; only the card opts back in, so
  hovering the page always reaches the page.
- Everything is fixed-position inside a viewport-clipped layer at
  `z-index: 2147483647`, and the host element is re-attached every frame in case
  the page rewrites the DOM.

## Adding to the UI

Before adding a row, ask whether a designer would check it during QA. Before
adding a section, ask whether it can be omitted when empty. Before adding a
colour, use one of the three that already exist.
