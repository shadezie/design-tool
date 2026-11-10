# Design system

The visual rules for Design Tool's own UI. It is an inspection tool, so it has
one job: be legible on top of any website, in front of any background, without
competing with the page it is measuring.

Everything here is defined as CSS custom properties on `.layer` in
`src/ui/overlay-styles.js`. Change values there, not in individual rules.

## Principles

1. **The tool is not the page.** Dark, flat, quiet. If the UI has a visual
   opinion, it is getting in the way of the one being reviewed.
2. **Numbers are the interface.** Everything else on the panel is a label for a
   number. Numbers are monospaced, right-aligned, and copyable.
3. **Never cover what is being measured.** The tool lives beside the page, in
   one place, at one size.
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
whatever the site being reviewed looks like. The **panel** is themed.

Every pair below is held to a contrast floor by `test/contrast.test.mjs`, which
reads the tokens out of the shipped stylesheet. Change a value and the test
tells you whether it still holds.

### Surfaces and text

Two looks on one structure: **Quiet** in light, **Ink** in dark. Neither uses
containers. Structure comes from hairlines and type weight, and the numbers
carry the emphasis that boxes used to.

| Token | Dark (Ink) | Light (Quiet) | Use |
| --- | --- | --- | --- |
| `--bg` | `#151618` | `#FFFFFF` | The panel and the stage toolbar |
| `--bg-raised` | `#222428` | `#F3F3F4` | Wells: segmented controls, fields, buttons, kbd |
| `--bg-sunken` | `#0F1012` | `#F7F7F8` | Reserved for emphasis |
| `--seg` | `#34373D` | `#FFFFFF` + hairline shadow | The active chip in a segmented control |
| `--canvas` | `#0A0B0C` | `#F1F1F2` | The stage behind the framed page, with `--dots` |
| `--line` | white 7.5% | `#EBEBED` | Hairlines between sections |
| `--line-strong` | white 16% | `#D9D9DD` | Swatch edges |
| `--text` | `#EDEEF0` | `#111113` | Values and section titles. 7:1 or better |
| `--text-2` | `#9A9FA7` | `#68686D` | Labels. 4.5:1 or better on every ground |
| `--text-3` | `#6D727A` | `#86868C` | Zero values, units, separators. 3:1 |
| `--hover` | white 6% | ink 5% | Hover ground for anything clickable |

Ink is graphite rather than black, so it reads as a surface and not a hole in
the page. Quiet is plain white and separates from the page by a hairline.

An earlier pass used bordered tiles, uppercase mono labels and a tinted
first-run block. Each was defensible alone and together they were noise: on a
panel that is read all day, every border is something to look past.

The tool's theme stops at the frame's edge. The page inside is always its own
colours, on white, as a browser would paint it.

### Accent

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `--accent` | `#3B63FF` | `#2A51FD` (brand) | Fills that carry `--on-accent` text: the A mark, the current step |
| `--accent-text` | `#9DB2FF` | `#2442C9` | The same hue as text: tags, token names |
| `--accent-soft` | accent 26% | `#EEF2FF` | The content box in the spacing diagram |

One accent, used sparingly. The active unit or device is a raised neutral chip,
not an accent fill: it is a setting, not a call to action.

### Status

New in v2. A QA pass is looking for three things: a value that is right, one
that is a guess, one that is a bug. v1 had no colour for any of them, so "alt
text: missing" looked exactly like "alt text: A gradient".

| Token | Dark | Light | Means | Used for |
| --- | --- | --- | --- | --- |
| `--ok` | `#3DD68C` | `#0B7A4B` | Right | A gap that lands on a spacing token. The copied flash |
| `--warn` | `#FFB224` | `#8F5400` | Check this | An upscaled asset. The underline on a token matched by value |
| `--danger` | `#FF6369` | `#C8253A` | Bug | Missing alt text. The close button on hover |

Each has an `--on-*` colour for text on its fill and a `-soft` tint. Status
colours never decorate: if it is green, something was verified.

### Page overlay

| Token | Hex | Why |
| --- | --- | --- |
| `--hl-a` | `#2A51FD` | Brand primary. The element you picked |
| `--hl-b` | `#FFB224` | The second element. Blue and amber are far apart in lightness as well as hue |
| `--measure` | `#E01563` | A dimension line must be tellable apart from both, and carry white text at 4.5:1 |
| `--halo` | white 82% | A light ring outside every mark |

Three things changed here, all for sites the old colours failed on:

- **The halo.** A blue outline on a blue hero, or any outline on a dark page,
  used to vanish. Every highlight, tag and dimension line now has a 1px light
  ring outside it: invisible on white, decisive on anything else.
- **Letters, not only colours.** The A and B tags start with their letter, so
  the two boxes are tellable apart on a page that is itself blue or orange.
- **Hover is not a selection colour.** With A locked, the element under the
  cursor gets a dashed outline and a neutral ink tag. It used to get the same
  blue tag as A.

### Box model

One quiet tint for the rings and the accent for the content: `--box-ring`,
`--box-ring-line`, `--accent-soft`. It was four colours in the DevTools order,
which made it the loudest thing on the panel. Border is no longer a ring; it is
a row under the diagram, because it is almost always 0 or 1px and a ring of
zeros was a third of the drawing.

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

Sans throughout, with tabular figures so digits still align. Mono is kept for
the things that are code: selectors, token names, hex values, and the labels
drawn on the page.

| Style | Size / weight / tracking |
| --- | --- |
| Section title | 12px / 600 sans, sentence case, `--text` |
| Hero label | 11.5px / 400 sans, `--text-2` |
| Hero value | 22px / 500 sans, tabular / `-0.02em`. 34px for a single distance |
| Label (`dt`) | 12.5px / 400 sans, `--text-2` |
| Value (`dd`) | 12.5px / 500 sans, tabular, `--text`, right-aligned |
| Selection identity | 12.5px / 500 mono |
| Status line, steps | 12 to 12.5px / 400 sans |

**Nothing on the panel is under 10px, and values are 12.5px.** v1 set 50 of its
74 text elements under 11px, down to 8px, to fit a 330px card. The browser
suite asserts the floor.


## Space

A 4px base. Used values: 2, 4, 6, 8, 10, 12, 14.

- Panel width: `360px`, full height, docked to an edge. The stage takes the rest.
- Stage toolbar: `48px` tall, the same height as the panel header, so the two
  read as one bar.
- Section padding: `12px 14px`.
- Label column: fixed `104px`, so values align down the whole panel.
- Click targets: 28px icon buttons, 24px minimum for everything else. The
  browser suite asserts that too.

## Radius and depth

| Element | Radius |
| --- | --- |
| Tiles, pair columns | 8px |
| Buttons, unit control, box-model rings | 6-7px |
| Marks, kbd, copy flash, dimension label | 4px |
| Highlight rect | 1px |

One shadow, on the panel's inner edge, to lift it off the page it sits on.
Dimension labels get a small `0 1px 4px` to stay readable over busy pages.

## Components

### Stage

The page, framed, on a dotted canvas. One toolbar across the top, flush with
the panel header, in this order: Inspect / Interact, the device icons and Fit,
the size list, width × height, rotate, and the zoom at the far right.

The frame has a 10px radius, a hairline ring and a soft shadow, with a caption
above it: device, size, zoom. It is laid out at its true size and scaled with a
transform, so the page inside always sees real pixels and the marks drawn on it
scale with it.

Segmented controls here and in the panel are the same component: a well with a
raised chip for the active choice.

### Panel

Three regions that never move: a header (name, units, dock edge, theme,
close), a scrolling body, and a status footer.

The body in reading order: a notice when device sizes are unavailable,
first-run steps, selection, hero values, the two measured elements, Media,
Typography, Spacing, Layout, Fill & effects, Shortcuts. Every titled section
folds from its title and remembers it.

Sections with nothing meaningful to report are omitted, not shown empty. An
image has no typography; a static div has no fill.

### Selection

A mark, then `div#hero.card` in mono, coloured by part: tag in `--accent-text`,
id in `--syntax-id`, classes in `--text-2`. The mark is a filled blue `A` once
locked and a dashed square while only hovering, matching the outline on the
page.

Under it, a trail of the last few ancestors. Each is a button that selects it.
This is the DOM walk as something you can see; `Alt` + scroll still works.

### First-run steps

Three numbered lines on `--accent-soft`, with the step you are on filled in.
Shown from the first frame until a measurement has been kept or the steps are
dismissed. Numbered because it is a sequence.

### Status footer

A dot in the state's colour, one sentence saying what the next click does, and
a Clear button whenever something is locked. It is on `--bg-sunken` because it
is the tool talking to you rather than data about the page.

### Hero values

The three values you are actually checking, directly under the selection.
Which three depends on what the element is:

| Element | Values |
| --- | --- |
| Renders its own text | `Size` · `Weight` · `Line height` |
| Flex or grid container | `Width` · `Height` · `Gap` |
| Anything else | `Width` · `Height` |
| While measuring | The distance, or one per edge |

A quiet label over a large figure, with nothing around it. The unit rides
after the number, small and dim, so the figure is what the eye lands on. A
qualifier follows the same way: `700 Bold`, `46 px 1.15x`. Copying still copies
the full value with its unit.

When the type trio is on show, those three rows are dropped from the Typography
section below, so nothing is stated twice.

### Row

A two-column grid, `104px 1fr`. Label left in sans and `--text-2`, value right
in mono and full contrast. Colour values get a 12px swatch chip before the hex.
A row can take a status tone: `--warn` for an upscaled asset, `--danger` for
missing alt text.

### Copyable value

Every number and colour is click-to-copy, and each one is a focusable control
that answers Enter and Space. Hover shows `--hover` with a 3px spread, so the
hit target reads as larger than the text. On copy it flashes `--ok` for 420ms.
Cursor is `copy`.

### Spacing box

Nested rings, outside in: margin, padding, content. Each ring is labelled at
its top-left with its four side values on the corresponding sides. Zero sides
are dimmed to `--text-3`, never hidden, so the diagram keeps a stable shape.
The content box shows width and height as separate rows.

Under it, as rows: border, radius, and the container's `gap` when there is
one. Gap versus padding is the confusion this panel exists to end.

### Shortcuts

A keys-and-meaning table in the last section, folded by default: learned once,
then in the way. The live guidance is the status footer, not this.

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

A three-up segmented control in the panel header. The active mode is a filled
`--accent` pill; inactive modes are `--text-2` text that goes full contrast on
hover. `aria-pressed` carries the state.

## Behaviour rules

- **The panel has one place and one size.** It was a floating card, and every
  version of that was wrong somewhere: following the cursor it could not be
  reached, choosing a corner it wandered, and fixed in a corner it still
  covered a quarter of the page and changed height on every hover.
- **A measurement appears only while Cmd or Ctrl is held.** With A locked,
  hovering shows a dashed outline of what a click would select. Hold the key
  and that element becomes B, with the gap drawn. Click with the key held to
  keep it.
- **A click selects.** With no key held, clicking always makes that element A,
  whatever was selected before.
- **Esc clears and never closes.** Closing is the ✕ or the toolbar icon.
- **A press that starts on the panel never selects an element.** The press
  origin is tracked so a release over the page is swallowed.
- The overlay layer is `pointer-events: none`; only the panel opts back in, so
  hovering the page always reaches the page.
- Everything is fixed-position inside a viewport-clipped layer at
  `z-index: 2147483647`, and the host element is re-attached every frame in case
  the page rewrites the DOM.

## Motion

What moves is decided by how often it happens.

| Moment | Frequency | Motion |
| --- | --- | --- |
| Panel opens | A few times a session | Slides out of its edge. 220ms, `--ease-drawer` |
| Device or size changes | Occasional | **No animation.** A frame that tweens through every width in between makes the page reflow at each one |
| Panel closes | A few times a session | Slides back into the same edge. 160ms, `--ease-out` |
| Panel flips sides | Rare | Travels the distance it moved. 220ms, `--ease-in-out` |
| A section unfolds | Occasional | Fades in and settles 4px. 160ms, `--ease-out` |
| A control is pressed | Often | Scales to 0.97 for 140ms |
| A value is copied | Often | Fills with `--ok` at once, fades back |
| Hover highlight, dimension lines, panel contents | Many times a second | **Never animates** |
| Measurement appears on Cmd / Ctrl | Keyboard, constantly | **Never animates** |

The last two are the rule that matters. Anything that follows the mouse or a
held key has to be instant, or the tool feels like it is lagging behind your
hand.

Only `transform` and `opacity` move. The curves are tokens on `.layer`, and
`overlay.motion()` is the one place they are used, through the Web Animations
API: a CSS entry animation would fire again every time the panel body is
rebuilt, which is on every hover. With `prefers-reduced-motion` the movement
goes and a 120ms fade stays.

## Icon

`src/icons/icon.svg` is the source of truth, exported from Figma. The mark is
three corner brackets around a cursor, on `#2A51FD`.

The committed PNGs (16, 32, 48, 128) are Figma exports too. Figma hints small
sizes better than a browser downscale does, so prefer exporting from there.
`node test/render-icons.mjs` regenerates them from the SVG when you need a size
Figma has not exported; check the 16px result by eye before keeping it, since
that is where the cursor and the top-left bracket start to merge.

Note the icon blue (`#2A51FD`) is deeper than the dark-theme accent (`--accent`,
`#3B63FF`). The lighter blue is chosen to stay legible on top of arbitrary
websites, which the icon never has to do.

## Adding to the UI

Before adding a row, ask whether a designer would check it during QA. Before
adding a section, ask whether it can be omitted when empty. Before adding a
colour, use a token that already exists, and if it is a status colour, make
sure something was actually verified.

## Token rows

A token name is the answer and the raw value is the evidence, so the name leads
and the value sits under it, quieter.

| Part | Spec |
| --- | --- |
| Token name | 12px/500 mono, `--accent-text` |
| Value match | the same, with `underline dotted var(--warn)`, 3px offset |
| Raw value | 11px/400 mono, `--text-2`, right-aligned under the name |

Both halves copy independently: the name yields `var(--token)` for code, the
value yields the hex for Figma.

## Media chip

| Part | Spec |
| --- | --- |
| Kind | 12.5px/500 sans, `--text` |
| Format chip | 10px/500 mono, `--on-accent` on `--accent`, 4px radius |

The format is the one thing being looked for, so it is the only chip on the panel
that gets a filled accent ground.

## A/B pair

Two rows, one per element: a 16px lettered mark in the same colour as that
element's on-page highlight (`--hl-a`, `--hl-b`), its selector in mono, and the
one fact that identifies it on the right. Text gets size and weight, anything
else gets width × height. While measuring, these rows replace the selection
block, which would only say the same thing.
