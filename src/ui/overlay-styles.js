/**
 * All CSS for the injected UI, as a string.
 *
 * It lives in JS rather than a .css file because it is injected into a closed
 * shadow root: a manifest "css" entry would land in the host page instead, and
 * fetching a stylesheet at runtime trips strict CSP on sites like GitHub.
 *
 * Two token groups. The page overlay (highlights, dimension lines) is never
 * themed: it has to read on top of whatever the site looks like. The panel is
 * themed, and light mode only reassigns its tokens. DESIGN.md documents every
 * token; test/contrast.test.mjs holds the pairs to their contrast floors.
 */
(() => {
  const DT = (window.__designtool = window.__designtool || {});

  /**
   * @font-face inside a shadow root is ignored by Chrome, so the brand faces
   * are registered on the document with the CSS Font Loading API instead. The
   * family names are prefixed so they cannot collide with a page that ships its
   * own copy of either typeface.
   */
  DT.FONTS = [
    ['Design Tool Sans', 'plus-jakarta-sans.woff2', { weight: '200 800' }],
    ['Design Tool Mono', 'ibm-plex-mono-400.woff2', { weight: '400' }],
    ['Design Tool Mono', 'ibm-plex-mono-500.woff2', { weight: '500' }],
  ];

  DT.css = `
:host { all: initial; }

* { box-sizing: border-box; margin: 0; padding: 0; }
[hidden] { display: none !important; }

.layer {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  font-family: var(--sans);

  /* Brand type. The bundled faces load first, then the designer's local copy,
     then the platform stack. */
  --sans: "Design Tool Sans", "Plus Jakarta Sans", ui-sans-serif, -apple-system,
    "Segoe UI", Roboto, sans-serif;
  --mono: "Design Tool Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular,
    "SF Mono", Menlo, Consolas, monospace;

  /* ---- Page overlay. Never themed: it has to read on top of any site. ----
     Blue and amber are far apart in lightness as well as hue, so they carry A
     and B. The dimension line is a third hue, and every mark also differs in
     form, so nothing depends on colour alone: A and B are lettered solid
     boxes, hover is dashed and unlabelled, a measurement is a capped line.
     The halo is what makes a blue outline survive a blue page: a light ring
     outside every mark, invisible on white and decisive on anything else. */
  --hl-a: #2a51fd;
  --hl-a-fill: rgba(42, 81, 253, 0.12);
  --hl-b: #ffb224;
  --hl-b-fill: rgba(255, 178, 36, 0.16);
  --hl-hover-fill: rgba(42, 81, 253, 0.05);
  --on-hl-b: #241600;
  --measure: #e01563;
  --measure-guide: rgba(224, 21, 99, 0.6);
  --halo: rgba(255, 255, 255, 0.82);

  /* ---- Panel, dark: "Obsidian". ----
     Three grounds instead of two, so raised things (tiles, chips) and sunken
     things (the status footer) are different from the panel and from each
     other. Three text tiers, so "dimmed on purpose" has its own token rather
     than a one-off grey. */
  --bg: #0d0e10;
  --bg-raised: #181a1e;
  --bg-sunken: #070809;
  --line: rgba(255, 255, 255, 0.1);
  --line-strong: rgba(255, 255, 255, 0.2);
  --text: #f4f5f6;
  --text-2: #a6acb5;
  --text-3: #747a84;
  --hover: rgba(255, 255, 255, 0.08);

  /* Brand blue lifts on dark: #2A51FD does not hold against near-black. */
  --accent: #3b63ff;
  --on-accent: #ffffff;
  --accent-text: #9db2ff;
  --accent-soft: rgba(59, 99, 255, 0.2);

  /* Status colours, for what a QA pass is actually looking for: a value that
     is right, one that is a guess, one that is a bug. They never decorate. */
  --ok: #3dd68c;
  --on-ok: #04130b;
  --ok-soft: rgba(61, 214, 140, 0.14);
  --warn: #ffb224;
  --warn-soft: rgba(255, 178, 36, 0.14);
  --danger: #ff6369;
  --on-danger: #1c0406;
  --danger-soft: rgba(255, 99, 105, 0.15);

  /* The selector line reads like code, so the id gets a syntax colour. */
  --syntax-id: #e5a23a;
  /* B on the panel. On the page it is always --hl-b. */
  --mark-b: #ffb224;

  /* Box model, in the order DevTools taught everyone: margin orange, border
     yellow, padding green, content blue. */
  --box-margin: rgba(255, 159, 10, 0.13);
  --box-border: rgba(242, 212, 92, 0.11);
  --box-padding: rgba(61, 214, 140, 0.12);
  --box-content: rgba(59, 99, 255, 0.28);

  --shadow: 0 0 0 1px rgba(0, 0, 0, 0.4), 0 0 48px rgba(0, 0, 0, 0.45);

  /* The built-in easings are too soft to read as intentional at these
     durations. Only press feedback and hover use them: the panel's contents
     re-render on every hover, which is far too often to animate. */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --press: 140ms;
  /* Motion the panel itself makes. Read by overlay.js, so the curves live in
     one place. Entering and leaving use the drawer curve and the strong
     ease-out; moving across the screen uses the strong ease-in-out. */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}

/* ---- Panel, light: "Paper". ----
   Warm neutrals, because the average website is white and cool grey and a
   cool panel disappears into it. Raised surfaces are pure white on the paper
   ground, which is what makes a tile read as lifted without a shadow. */
.layer[data-theme="light"] {
  --bg: #f8f8f5;
  --bg-raised: #ffffff;
  --bg-sunken: #eeeeea;
  --line: rgba(26, 26, 23, 0.11);
  --line-strong: rgba(26, 26, 23, 0.22);
  --text: #1a1a17;
  --text-2: #5c5c55;
  --text-3: #85857d;
  --hover: rgba(26, 26, 23, 0.06);

  --accent: #2a51fd;
  --on-accent: #ffffff;
  --accent-text: #2442c9;
  --accent-soft: rgba(42, 81, 253, 0.1);

  --ok: #0b7a4b;
  --on-ok: #ffffff;
  --ok-soft: rgba(11, 122, 75, 0.11);
  --warn: #8f5400;
  --warn-soft: rgba(168, 100, 0, 0.13);
  --danger: #c8253a;
  --on-danger: #ffffff;
  --danger-soft: rgba(200, 37, 58, 0.1);

  --syntax-id: #8f5400;
  --mark-b: #b86a00;

  --box-margin: rgba(214, 122, 0, 0.15);
  --box-border: rgba(176, 148, 20, 0.15);
  --box-padding: rgba(11, 122, 75, 0.13);
  --box-content: rgba(42, 81, 253, 0.13);

  --shadow: 0 0 0 1px rgba(26, 26, 23, 0.06), 0 0 40px rgba(26, 26, 23, 0.14);
}

/* ---------- element highlights ---------- */

.hl {
  position: absolute;
  z-index: 1;
  pointer-events: none;
  border: 1px solid var(--hl-a);
  background: var(--hl-a-fill);
  border-radius: 1px;
  box-shadow: 0 0 0 1px var(--halo);
}
.hl.is-b { border-color: var(--hl-b); background: var(--hl-b-fill); }
.hl.is-hover { border-style: dashed; background: var(--hl-hover-fill); }

.hl-tag {
  position: absolute;
  top: -23px;
  left: -1px;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--hl-a);
  color: #fff;
  font: 500 10px/1.4 var(--mono);
  letter-spacing: 0.02em;
  white-space: nowrap;
  box-shadow: 0 0 0 1px var(--halo);
}
.hl.is-b .hl-tag { background: var(--hl-b); color: var(--on-hl-b); }
/* Not selected yet, so not in a selection colour: neutral ink. */
.hl.is-hover .hl-tag { background: #16181d; color: #fff; }

/* ---------- measurement lines ---------- */

.mline {
  position: absolute;
  z-index: 1;
  background: var(--measure);
  pointer-events: none;
  box-shadow: 0 0 0 1px var(--halo);
}
.mline.is-guide {
  background: none;
  box-shadow: none;
  border-top: 1px dashed var(--measure-guide);
  border-left: 1px dashed var(--measure-guide);
}
.mline.is-guide.is-h { border-left: none; }
.mline.is-guide.is-v { border-top: none; }

.mcap {
  position: absolute;
  z-index: 1;
  background: var(--measure);
  pointer-events: none;
}

.mlabel {
  position: absolute;
  z-index: 2;
  transform: translate(-50%, -50%);
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--measure);
  color: #fff;
  font: 600 11px/1.3 var(--mono);
  white-space: nowrap;
  box-shadow: 0 0 0 1px var(--halo), 0 1px 4px rgba(0, 0, 0, 0.3);
}

/* ---------- the panel ---------- */

/* Docked to one edge, full height, always there while the tool is on. It was
   a floating card: it covered what it measured, changed height on every hover
   and needed a grip, a pin and a resize handle to be lived with. */
.panel {
  position: absolute;
  z-index: 3;
  top: 0;
  bottom: 0;
  right: 0;
  width: min(360px, calc(100vw - 96px));
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  background: var(--bg);
  color: var(--text);
  box-shadow: var(--shadow);
  font-size: 12px;
  line-height: 1.5;
}
.panel[data-side="left"] { right: auto; left: 0; }

.panel :focus-visible {
  outline: 2px solid var(--accent-text);
  outline-offset: 1px;
}

.panel-head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 10px 10px 14px;
  border-bottom: 1px solid var(--line);
}

.brand {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  font: 600 12.5px/1.4 var(--sans);
  letter-spacing: -0.005em;
  white-space: nowrap;
}
.brand-mark {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--accent);
}

.panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--line-strong) transparent;
}
.panel-body::-webkit-scrollbar { width: 10px; }
.panel-body::-webkit-scrollbar-track { background: transparent; }
.panel-body::-webkit-scrollbar-thumb {
  background: var(--line-strong);
  border: 3px solid var(--bg);
  border-radius: 6px;
}

.icon-btn {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--text-2);
  cursor: pointer;
  transition: background var(--press) ease, color var(--press) ease,
    transform var(--press) var(--ease-out);
}
/* Touch devices fire hover on tap, so every hover state is gated. */
@media (hover: hover) and (pointer: fine) {
  .icon-btn:hover { background: var(--hover); color: var(--text); }
  .icon-btn.close:hover { background: var(--danger); color: var(--on-danger); }
}
/* Press feedback: the control has to look like it heard the click. */
.icon-btn:active { transform: scale(0.97); }
.icon-btn svg { width: 15px; height: 15px; display: block; }

.units {
  display: flex;
  flex: none;
  padding: 2px;
  margin-right: 2px;
  border-radius: 7px;
  background: var(--bg-raised);
  border: 1px solid var(--line);
}
.units button {
  min-width: 30px;
  height: 24px;
  padding: 0 7px;
  border: 0;
  border-radius: 5px;
  background: none;
  color: var(--text-2);
  font: 500 11px/1 var(--mono);
  cursor: pointer;
  transition: background var(--press) ease, color var(--press) ease,
    transform var(--press) var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .units button:hover { color: var(--text); }
}
.units button:active { transform: scale(0.97); }
.units button[aria-pressed="true"] { background: var(--accent); color: var(--on-accent); }

/* ---------- first-run guide ---------- */

.guide {
  position: relative;
  padding: 14px 14px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--accent-soft);
}
.guide-title {
  margin-bottom: 10px;
  color: var(--accent-text);
  font: 500 10px/1.4 var(--mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.guide .icon-btn { position: absolute; top: 6px; right: 8px; }
.guide ol { list-style: none; display: grid; gap: 8px; }
.guide li {
  display: grid;
  grid-template-columns: 20px 1fr;
  gap: 10px;
  align-items: start;
  color: var(--text-2);
  font: 400 12.5px/1.45 var(--sans);
}
.guide li b { color: var(--text); font-weight: 600; }
.guide-n {
  width: 20px;
  height: 20px;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  color: var(--text-2);
  font: 500 10.5px/18px var(--mono);
  text-align: center;
}
/* The step you are on. */
.guide li.is-now { color: var(--text); }
.guide li.is-now .guide-n {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--on-accent);
}

.empty {
  padding: 28px 14px;
  color: var(--text-2);
  font: 400 12.5px/1.5 var(--sans);
}

/* ---------- selection ---------- */

.sel {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line);
}
.sel-line { display: flex; align-items: center; gap: 8px; min-width: 0; }

.mark {
  flex: none;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: var(--hl-a);
  color: #fff;
  font: 600 10px/16px var(--mono);
  text-align: center;
}
.mark.is-b { background: var(--hl-b); color: var(--on-hl-b); }
/* Hovering, nothing locked: the same dashed outline the page shows. */
.mark.is-hover { background: none; border: 1px dashed var(--text-3); }

.identity {
  flex: 1;
  min-width: 0;
  font: 500 12.5px/1.4 var(--mono);
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.identity .t-tag { color: var(--accent-text); }
.identity .t-id { color: var(--syntax-id); }
.identity .t-class { color: var(--text-2); }

/* The DOM walk, as something you can see and click. It used to exist only as
   Alt + scroll, which nobody finds. */
.crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  margin-left: -5px;
  color: var(--text-3);
  font: 400 11px/1.4 var(--mono);
}
.crumb {
  max-width: 120px;
  min-height: 24px;
  padding: 2px 5px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--text-2);
  font: inherit;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (hover: hover) and (pointer: fine) {
  .crumb:hover { background: var(--hover); color: var(--text); }
}
.crumb.is-current { color: var(--text); cursor: default; background: none; }

/* ---------- hero values ---------- */

.hero {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line);
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.hero.is-1up { grid-template-columns: minmax(0, 1fr); }
.hero.is-2up { grid-template-columns: repeat(2, minmax(0, 1fr)); }
/* Four edge distances: 2x2 rather than four slivers. */
.hero.is-4up { grid-template-columns: repeat(2, minmax(0, 1fr)); }

.tile {
  padding: 9px 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg-raised);
  overflow: hidden;
}

.tile-unit { margin-left: 4px; color: var(--text-3); }

.tile-label {
  display: block;
  margin-bottom: 3px;
  color: var(--text-2);
  font: 500 10px/1.4 var(--mono);
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile-value {
  display: block;
  color: var(--text);
  font: 500 20px/1.2 var(--mono);
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* The distance is the answer, so it is the biggest thing on the panel. */
.hero.is-measure.is-1up .tile-value { font-size: 28px; }
.hero.is-measure .tile { border-color: var(--measure); }

.tile-sub {
  margin-left: 5px;
  color: var(--text-2);
  font: 400 11px/1.2 var(--mono);
  letter-spacing: 0;
}

/* A gap that lands exactly on a spacing token is the good news a QA pass is
   looking for, so it gets the status colour for "right". */
.tile-sub.is-token {
  display: block;
  margin-left: 0;
  margin-top: 3px;
  color: var(--ok);
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---------- sections ---------- */

.sec { border-bottom: 1px solid var(--line); }
.sec-body { padding: 0 14px 12px; }
.sec.is-plain .sec-body { padding-top: 12px; }

/* The title is the fold control. Sections keep their order and remember
   whether they are open, so the thing you were reading stays where it was. */
.sec-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  background: none;
  color: var(--text-2);
  font: 500 10px/1.4 var(--mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-align: left;
  cursor: pointer;
}
.sec-title::after {
  content: "";
  width: 6px;
  height: 6px;
  margin-right: 3px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg) translate(-1px, -1px);
  transition: transform 160ms var(--ease-out);
}
.sec-title[aria-expanded="false"]::after { transform: rotate(-45deg) translate(-1px, -1px); }
@media (hover: hover) and (pointer: fine) {
  .sec-title:hover { color: var(--text); background: var(--hover); }
}

.row {
  display: grid;
  grid-template-columns: 104px 1fr;
  gap: 10px;
  align-items: baseline;
  padding: 2px 0;
}

/* Labels are prose and values are data, so they are set differently: sans for
   the label, which is read as a word, and mono for the value, which is read as
   a number and has to align with the number above it. */
.row dt {
  color: var(--text-2);
  font: 400 12px/1.7 var(--sans);
}
.row dd {
  font: 450 12px/1.7 var(--mono);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row dd.is-wrap { white-space: normal; overflow: visible; }
.row dd.is-warn { color: var(--warn); }
.row dd.is-danger { color: var(--danger); }
.row dd.is-ok { color: var(--ok); }

/* Copyable values are real controls: focusable, with a hit area that extends
   past the glyphs. The confirmation is the "right" colour and is quick: it is
   feedback, not an event. */
.copy {
  cursor: copy;
  border-radius: 4px;
  transition: background var(--press) ease, color var(--press) ease,
    box-shadow var(--press) ease;
}
@media (hover: hover) and (pointer: fine) {
  .copy:hover { background: var(--hover); box-shadow: 0 0 0 3px var(--hover); }
}
.copy.is-copied,
.copy.is-copied * {
  color: var(--on-ok) !important;
}
.copy.is-copied {
  background: var(--ok);
  box-shadow: 0 0 0 3px var(--ok);
  transition-duration: 0ms;
}

.is-hex { color: var(--accent-text); }

/* Colour is the one value read as a thing rather than a number, so the chip
   is big enough to actually judge. */
.swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 6px;
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  vertical-align: -2px;
}

/* ---------- status footer ---------- */

/* The tool talking to you, rather than data about the page, so it sits on its
   own sunken strip at the bottom edge, where it never moves. */
.panel-foot {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 10px 8px 14px;
  background: var(--bg-sunken);
  border-top: 1px solid var(--line);
}

.status-text {
  flex: 1;
  min-width: 0;
  color: var(--text);
  font: 400 12px/1.4 var(--sans);
}

/* The dot carries the state in the same colours as the on-page highlights. */
.status-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-3);
}
.status-dot.is-lockedA { background: var(--hl-a); box-shadow: 0 0 0 1px var(--line-strong); }
.status-dot.is-measuring { background: var(--measure); }
.status-dot.is-lockedAB { background: var(--mark-b); }

.btn {
  flex: none;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: var(--bg-raised);
  color: var(--text);
  font: 500 11.5px/1 var(--sans);
  cursor: pointer;
  transition: background var(--press) ease, transform var(--press) var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .btn:hover { background: var(--hover); }
}
.btn:active { transform: scale(0.97); }

kbd {
  display: inline-block;
  padding: 1px 5px;
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  background: var(--bg-raised);
  color: var(--text);
  font: 500 10.5px/1.4 var(--mono);
  white-space: nowrap;
}

/* ---------- shortcuts ---------- */

.sc { display: grid; gap: 6px; }
.sc-row {
  display: grid;
  grid-template-columns: 112px 1fr;
  gap: 10px;
  align-items: center;
}
.sc-keys { display: flex; align-items: center; gap: 3px; }
.sc-plus { color: var(--text-3); font: 400 10px/1 var(--mono); }
.sc-meaning { color: var(--text-2); font: 400 12px/1.4 var(--sans); }

/* ---------- spacing box ---------- */

.ring {
  position: relative;
  padding: 18px 3px 3px;
  border: 1px dashed var(--line-strong);
  border-radius: 6px;
  text-align: center;
}

.ring-label {
  position: absolute;
  top: 3px;
  left: 7px;
  color: var(--text-2);
  font: 500 10px/1.3 var(--mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.ring-margin { background: var(--box-margin); }
.ring-border { background: var(--box-border); }
.ring-padding { background: var(--box-padding); }

.ring-mid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 3px;
}

.sv {
  display: inline-block;
  min-width: 24px;
  padding: 3px 3px;
  font: 400 11px/1.5 var(--mono);
  color: var(--text);
}
.sv.is-zero { color: var(--text-3); }
.sv.is-side-l, .sv.is-side-r { flex: none; }

.content-box {
  padding: 5px 4px;
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  /* On the panel ground rather than on three stacked tints, which turned the
     blue to olive. */
  background: linear-gradient(var(--box-content), var(--box-content)), var(--bg);
}

.dim {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 5px;
  padding: 2px 3px;
  font: 500 12px/1.5 var(--mono);
  white-space: nowrap;
}
.dim-axis { color: var(--text-2); font-size: 10px; }

.sbox-note {
  margin-top: 8px;
  display: grid;
  grid-template-columns: 104px 1fr;
  gap: 2px 10px;
}
.sbox-note dt { color: var(--text-2); font: 400 12px/1.7 var(--sans); }
.sbox-note dd { font: 450 12px/1.7 var(--mono); text-align: right; }

/* ---------- design tokens ---------- */

/* The token name is the answer, so it gets the accent and the raw value drops
   to a quiet second line underneath it. */
.row dd.has-token {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  white-space: normal;
}

.token {
  max-width: 100%;
  color: var(--accent-text);
  font: 500 12px/1.5 var(--mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* A value match is a guess: the same hex can belong to two tokens. The dotted
   underline in the "unsure" colour says so without a line of explanation. */
.token.is-guess {
  text-decoration: underline dotted var(--warn);
  text-underline-offset: 3px;
}

.token-raw {
  color: var(--text-2);
  font: 400 11px/1.5 var(--mono);
}

/* ---------- media ---------- */

.media-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.media-kind {
  color: var(--text);
  font: 500 12.5px/1.4 var(--sans);
}

.media-format {
  padding: 2px 7px;
  border-radius: 4px;
  background: var(--accent);
  color: var(--on-accent);
  font: 500 10px/1.5 var(--mono);
  letter-spacing: 0.06em;
}

/* ---------- the two measured elements ---------- */

/* Stacked, not side by side: two narrow columns truncate an identity like
   section#hero.container to nothing, and the eye reads A then B as a sequence
   anyway. Full width also lets each one's facts run inline. */
.pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
}

.pair-col {
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg-raised);
}

.pair-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 5px;
  min-width: 0;
}

.pair-name {
  min-width: 0;
  color: var(--text-2);
  font: 400 11px/1.3 var(--mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pair-facts { display: flex; flex-wrap: wrap; gap: 2px 14px; }
.pair-fact { display: inline-flex; align-items: baseline; gap: 5px; }
.pair-key { color: var(--text-2); font: 400 11px/1.7 var(--mono); }
.pair-val { color: var(--text); font: 500 12px/1.7 var(--mono); white-space: nowrap; }

.mlead-kind {
  margin: 0 0 8px;
  color: var(--text-2);
  font: 400 12px/1.5 var(--sans);
}

/* Reduced motion means gentler, not none: the press and hover feedback here
   is colour and a 6% scale, so only the movement is worth dropping. */
@media (prefers-reduced-motion: reduce) {
  .sec-title::after { transition-duration: 0ms; }
  .icon-btn:active,
  .btn:active,
  .units button:active { transform: none; }
}
`;
})();
