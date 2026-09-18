# Chrome Web Store listing

Copy for the Developer Dashboard. Keep this in sync with what is actually
submitted, so the next release does not have to reinvent it.

---

## Store listing tab

**Name**

```
Design Tool
```

**Short description** (132 char limit, this is 118)

```
Design QA for any website. Type styles, spacing, design tokens and media, read the way a designer thinks about them.
```

**Category**: Developer Tools
**Language**: English

**Detailed description**

```
Design Tool inspects any website the way you review a Figma file.

DevTools is built for engineers. The Elements panel is a DOM tree, computed
styles are three hundred properties in alphabetical order, and measuring the
space between two things means eyeballing an overlay. None of that maps to how
a designer thinks.

Hover an element and read its type spec: size, weight and line height up front,
then family, letter spacing, transform and colour. Click two elements and the
distance between them is drawn on the page with dimension lines. Select a
container and see margin, border and padding as nested rings, with the flex or
grid gap stated right next to the padding.

WHAT YOU GET

• Type styles at a glance, in designer vocabulary rather than CSS
• Measure between any two elements, drawn on the page, with the spec of both
• Design token names instead of raw values, where the site defines them
• Media: format actually served, aspect ratio, and whether the asset fits
• A spacing box: margin, border, padding, content, plus gap
• px, rem and em, converted everywhere at once
• Click any value to copy it
• Light and dark, and a panel you can drag anywhere and resize

DESIGN TOKENS

If the site is built on CSS custom properties, a colour reads as
--color-brand-600 rather than #2A51FD, with the hex still shown underneath.
Copy either one: the token name for code, the value for Figma. Where a token
can only be inferred by matching values, it says so rather than pretending to
certainty.

MEDIA

Hover an image or video for the format the browser actually chose out of
srcset, not the src fallback, so a picture element serving WebP reports WebP.
Aspect ratio is stated for the rendered box, and again for the asset itself
when the two differ, along with what the box is doing about it: cropped,
letterboxed or stretched. Asset scale catches a blurry upscale and a 3x file in
a 100px slot, neither of which the page tells you about.

BUILT FOR REAL PAGES

Most card grids stretch an invisible click target over the whole card, which
means a plain hover lands on that instead of the heading you were pointing at.
Design Tool skips overlays that paint nothing, and holding Cmd or Ctrl reaches
the most specific element under the cursor, the same way you select through a
group in Figma.

rem is resolved against the page's real root font size, not an assumed 16px, so
sites that set a 62.5% root report correctly rather than confidently wrong.

Nested measurements come from the container's padding box, so a 12px padding
with a 1px border reads as 12px, not 13px.

PRIVACY

No network requests. No analytics. No accounts. Nothing is injected into any
page until you click the toolbar icon or press the shortcut, and access is
limited to that one tab for that visit. Your unit, theme and panel position are
stored locally and never leave your machine.

Open source: https://github.com/shadezie/design-tool

HOW TO USE IT

Click the toolbar icon or press Option+Shift+I (Alt+Shift+I on Windows). Hover
to inspect. Click one element, then hover or click a second, to measure. Press
Esc to clear, Esc again to exit.
```

---

## Privacy tab

**Single purpose**

```
Design Tool inspects the styling of elements on the page the user is viewing,
so a designer can check typography, spacing and layout against their design
without reading CSS.
```

**Permission justifications**

`activeTab`

```
The extension reads computed styles and element geometry from the page the user
is inspecting. activeTab limits that to the single tab the user activated, and
only after they click the toolbar icon or press the extension's shortcut. This
is used instead of a host permission so the extension has no access to any page
until the user explicitly asks for it.
```

`scripting`

```
Used to inject the inspection overlay into the active tab when the user
activates the extension. Because there is no always-on content script, this is
the only way the tool reaches the page, and it runs only on the tab covered by
the activeTab grant.
```

`storage`

```
Stores the user's own display preferences locally: the unit (px, rem or em),
the light or dark theme, and the position and size of the inspector panel. No
browsing data is stored and nothing is transmitted.
```

**Data usage disclosures**

Tick nothing. The extension collects no user data. Then certify all three:

- Not being sold to third parties
- Not being used or transferred for purposes unrelated to the single purpose
- Not being used or transferred to determine creditworthiness or for lending

**Privacy policy URL**: not required, since no user data is collected.

---

## Assets

| Asset | Size | File |
| --- | --- | --- |
| Icon | 128x128 | `src/icons/icon128.png` |
| Screenshot 1 | 1280x800 | `docs/store/gap-distance-1280x800.png` |
| Screenshot 2 | 1280x800 | `docs/store/font-size-1280x800.png` |
| Screenshot 3 | 1280x800 | `docs/store/container-padding-1280x800.png` |
| Screenshot 4 | 1280x800 | `docs/store/image-video-tag-1280x800.png` |
| Small promo tile | 440x280 | `docs/store/promo-440x280.png` |
| Marquee promo tile | 1400x560 | `docs/store/marquee-1400x560.png` |

The small tile and marquee are optional; screenshots are the ones that matter.
Upload all four. Order matters: the first one is what shows in search results,
and the measurement is the clearest single picture of what the tool does.

All four are regenerated from `docs/raw/` by `npm run store-images`, so replacing
a screenshot means dropping a new file in there and rerunning it, never editing
anything in `docs/store/` by hand.

---

## Before each submission

```bash
npm test          # all three suites green
npm run package   # dist/design-tool-<version>.zip
```

Bump `version` in `manifest.json` first (and `package.json`, to match). The Web
Store rejects an upload whose version is not higher than the published one.

## Released

| Version | What shipped |
| --- | --- |
| 1.0.0 | First release: type styles, measurement, spacing box, units, copy |
| 1.1.0 | Design token names, media format and aspect ratio, both sides of a measurement, folded shortcuts, Obsidian and Paper palettes |
