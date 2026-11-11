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

  /* ---- Panel, dark: "Ink". ----
     Graphite rather than black. One ground for the whole panel, a slightly
     lighter well for controls and a darker one kept for emphasis. Structure
     comes from hairlines and type weight, not from boxes. */
  --bg: #151618;
  --bg-raised: #222428;
  --bg-sunken: #0f1012;
  --seg: #34373d;
  --seg-shadow: none;
  --line: rgba(255, 255, 255, 0.075);
  --line-strong: rgba(255, 255, 255, 0.16);
  --text: #edeef0;
  --text-2: #9a9fa7;
  --text-3: #6d727a;
  --hover: rgba(255, 255, 255, 0.06);

  /* Brand blue lifts on dark: #2A51FD does not hold against graphite. */
  --accent: #3b63ff;
  --on-accent: #ffffff;
  --accent-text: #9db2ff;
  --accent-soft: rgba(76, 111, 255, 0.26);

  /* Status colours, for what a QA pass is actually looking for: a value that
     is right, one that is a guess, one that is a bug. They never decorate. */
  --ok: #3dd68c;
  --on-ok: #04130b;
  --warn: #ffb224;
  --danger: #ff6369;
  --on-danger: #1c0406;

  /* The selector line reads like code, so the id gets a syntax colour. */
  --syntax-id: #e5a23a;
  /* B on the panel. On the page it is always --hl-b. */
  --mark-b: #ffb224;

  /* Box model: one quiet tint for the rings, the accent for the content. It
     was four colours, which was the loudest thing on the panel. */
  --box-ring: rgba(255, 255, 255, 0.04);
  --box-ring-line: transparent;

  --shadow: 0 0 0 1px rgba(0, 0, 0, 0.5), -12px 0 32px rgba(0, 0, 0, 0.25);

  /* The stage: a dotted canvas the framed page sits on. */
  --canvas: #0a0b0c;
  --dots: rgba(255, 255, 255, 0.09);
  --frame-ring: rgba(255, 255, 255, 0.16);
  --panel-w: min(360px, calc(100vw - 96px));

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

/* ---- Panel, light: "Quiet". ----
   White, hairlines, no containers. It separates from a white website by its
   edge and shadow, not by a tinted ground. */
.layer[data-theme="light"] {
  --bg: #ffffff;
  --bg-raised: #f3f3f4;
  --bg-sunken: #f7f7f8;
  --seg: #ffffff;
  --seg-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
  --line: #ebebed;
  --line-strong: #d9d9dd;
  --text: #111113;
  --text-2: #68686d;
  --text-3: #86868c;
  --hover: rgba(17, 17, 19, 0.05);

  --accent: #2a51fd;
  --on-accent: #ffffff;
  --accent-text: #2442c9;
  --accent-soft: #eef2ff;

  --ok: #0b7a4b;
  --on-ok: #ffffff;
  --warn: #8f5400;
  --danger: #c8253a;
  --on-danger: #ffffff;

  --syntax-id: #8f5400;
  --mark-b: #b86a00;

  --box-ring: transparent;
  --box-ring-line: #ebebed;

  --shadow: 0 0 0 1px rgba(0, 0, 0, 0.08), -12px 0 32px rgba(0, 0, 0, 0.05);

  --canvas: #f1f1f2;
  --dots: rgba(17, 17, 19, 0.1);
  --frame-ring: rgba(17, 17, 19, 0.14);
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

/* ---------- the stage ---------- */

/* With the stage up, the layer stops being a transparent sheet over the page
   and becomes the whole window: canvas, toolbar and frame on one side, the
   panel on the other. The original page is underneath, covered and quiet. */
.layer[data-mode="arena"] {
  pointer-events: auto;
  background: var(--canvas);
}
.layer[data-mode="arena"] .panel { box-shadow: -1px 0 0 var(--line); }
/* The product's name and mark are in the toolbar there; the panel is titled
   for what it holds. */
.layer[data-mode="arena"] .panel .brand-mark { display: none; }
.layer[data-mode="arena"][data-side="left"] .panel { box-shadow: 1px 0 0 var(--line); }

.stage {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: var(--panel-w);
  display: flex;
  flex-direction: column;
  color: var(--text);
  font: 400 12.5px/1.45 var(--sans);
  font-variant-numeric: tabular-nums;
  container-type: inline-size;
}
/* A narrow window sheds the controls that have another way in: the size list
   first, then the typed fields, which the drag handle covers. */
@container (max-width: 980px) { .tb-name { display: none; } }
@container (max-width: 760px) { .pick { display: none; } }
@container (max-width: 580px) { .wh, .tb .read { display: none; } }
.layer[data-side="left"] .stage { left: var(--panel-w); right: 0; }
.stage :focus-visible { outline: 2px solid var(--accent-text); outline-offset: 1px; }

.tb {
  flex: none;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  height: 48px;
  padding: 0 14px;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
  overflow: hidden;
}
.tb-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--text);
  font: 600 12.5px/1.4 var(--sans);
  letter-spacing: -0.005em;
  white-space: nowrap;
}
.tb-mid { display: flex; align-items: center; gap: 8px; min-width: 0; }
.tb .read { justify-self: end; color: var(--text-2); font-size: 12px; white-space: nowrap; }

/* The size list: a label and a chevron, with the real select laid invisibly
   over them so the platform's own list still opens. */
.pick {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 190px;
  padding: 0 10px;
}
.pick-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pick::after {
  content: "";
  flex: none;
  width: 5px;
  height: 5px;
  margin-top: -3px;
  border-right: 1.5px solid var(--text-2);
  border-bottom: 1.5px solid var(--text-2);
  transform: rotate(45deg);
}
.pick select {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  font: 400 13px/1.4 var(--sans);
}
.pick[data-disabled] { color: var(--text-2); }
.pick[data-disabled] select { cursor: default; }
.pick[data-disabled]::after { opacity: 0.4; }
.pick:focus-within { outline: 2px solid var(--accent-text); outline-offset: 1px; }

.seg {
  flex: none;
  display: flex;
  padding: 2px;
  border-radius: 8px;
  background: var(--bg-raised);
}
.seg button {
  display: flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--text-2);
  font: 500 12px/1 var(--sans);
  cursor: pointer;
  transition: color var(--press) ease, transform var(--press) var(--ease-out);
}
.seg.dev button { padding: 0 8px; }
.seg.dev .fit-btn { padding: 0 10px; }
.seg button svg { width: 15px; height: 15px; display: block; }
.seg button[aria-pressed="true"] {
  background: var(--seg);
  color: var(--text);
  box-shadow: var(--seg-shadow);
}
@media (hover: hover) and (pointer: fine) {
  .seg button:hover { color: var(--text); }
}
.seg button:active { transform: scale(0.97); }

.field {
  flex: none;
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: var(--bg-raised);
  color: var(--text);
  font: 500 12px/1 var(--sans);
  font-variant-numeric: tabular-nums;
}
input.field { width: 56px; padding: 0 4px; text-align: center; appearance: textfield; }
input.field::-webkit-outer-spin-button,
input.field::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.wh { flex: none; display: flex; align-items: center; gap: 5px; color: var(--text-3); }

.ibtn {
  flex: none;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--text-2);
  cursor: pointer;
}
.ibtn svg { width: 15px; height: 15px; display: block; }
.ibtn:disabled { opacity: 0.35; cursor: default; }
@media (hover: hover) and (pointer: fine) {
  .ibtn:not(:disabled):hover { background: var(--hover); color: var(--text); }
}

.view {
  flex: 1;
  min-height: 0;
  position: relative;
  display: grid;
  place-items: center;
  padding-top: 16px;
  /* A frame mid-turn is taller than it is wide for a moment. */
  overflow: hidden;
  background: radial-gradient(circle, var(--dots) 1px, transparent 1.2px) 0 0 / 18px 18px;
}

.fit { position: relative; }
.turn { position: absolute; inset: 0; }

/* The size handles: right edge for width, bottom edge for height. Small and
   quiet until wanted: two short lines, as DevTools draws its own. */
.grip {
  position: absolute;
  border-radius: 6px;
  touch-action: none;
  transition: opacity 140ms ease;
}
.grip::before,
.grip::after {
  content: "";
  position: absolute;
  border-radius: 1px;
  background: var(--text-3);
  transition: background var(--press) ease;
}
.grip-x {
  top: 50%;
  left: 100%;
  width: 16px;
  height: 44px;
  margin-top: -22px;
  cursor: ew-resize;
}
.grip-x::before, .grip-x::after { top: 14px; width: 1.5px; height: 16px; }
.grip-x::before { left: 6px; }
.grip-x::after { left: 9.5px; }
.grip-y {
  left: 50%;
  top: 100%;
  width: 44px;
  height: 16px;
  margin-left: -22px;
  cursor: ns-resize;
}
.grip-y::before, .grip-y::after { left: 14px; height: 1.5px; width: 16px; }
.grip-y::before { top: 6px; }
.grip-y::after { top: 9.5px; }
@media (hover: hover) and (pointer: fine) {
  .grip:hover::before,
  .grip:hover::after { background: var(--text); }
}
.stage[data-dragging="w"] .grip-x::before,
.stage[data-dragging="w"] .grip-x::after,
.stage[data-dragging="h"] .grip-y::before,
.stage[data-dragging="h"] .grip-y::after { background: var(--accent-text); }
.stage[data-dragging="w"] { cursor: ew-resize; }
.stage[data-dragging="h"] { cursor: ns-resize; }
.stage[data-dragging] { user-select: none; }
/* During a rotation the frame's edges are mid-air, so what hangs off them
   steps out and comes back when the turn lands. */
.caption { transition: opacity 140ms ease; }
.stage[data-turning] .grip,
.stage[data-turning] .caption { opacity: 0; transition-duration: 0ms; }
/* While dragging, the page must not take the pointer or select its text. */
.stage[data-dragging] .frame { pointer-events: none; }
.caption {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  color: var(--text-2);
  font-size: 11.5px;
  white-space: nowrap;
}
.caption b { color: var(--text); font-weight: 500; }

/* The page itself. Always its own colours: the tool's theme stops at the
   frame's edge. White behind it, as a browser would paint. */
.frame {
  position: absolute;
  left: 0;
  top: 0;
  border: 0;
  border-radius: 10px;
  background: #fff;
  transform-origin: 0 0;
  box-shadow: 0 0 0 1px var(--frame-ring), 0 20px 50px rgba(0, 0, 0, 0.14);
}
.stage[data-loading] .frame { opacity: 0.4; }

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
  width: var(--panel-w);
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
  height: 48px;
  padding: 0 8px 0 14px;
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
  border-radius: 8px;
  background: var(--bg-raised);
}
.units button {
  min-width: 30px;
  height: 24px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--text-2);
  font: 500 11.5px/1 var(--sans);
  cursor: pointer;
  transition: background var(--press) ease, color var(--press) ease,
    transform var(--press) var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .units button:hover { color: var(--text); }
}
.units button:active { transform: scale(0.97); }
/* The active unit is a raised chip, not an accent fill: it is a setting, not
   a call to action. */
.units button[aria-pressed="true"] {
  background: var(--seg);
  color: var(--text);
  box-shadow: var(--seg-shadow);
}

/* ---------- first-run guide ---------- */

.guide {
  position: relative;
  padding: 4px 14px 16px;
  border-bottom: 1px solid var(--line);
}
.guide-title {
  margin-bottom: 10px;
  color: var(--text);
  font: 600 12px/1.4 var(--sans);
}
.guide .icon-btn { position: absolute; top: -2px; right: 8px; }
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
  border-radius: 50%;
  background: var(--bg-raised);
  color: var(--text-2);
  font: 500 11px/20px var(--sans);
  text-align: center;
}
/* The step you are on. */
.guide li.is-now { color: var(--text); }
.guide li.is-now .guide-n { background: var(--accent); color: var(--on-accent); }

.notice {
  margin: 0 14px 12px;
  padding: 9px 10px;
  border-radius: 8px;
  background: var(--bg-raised);
  color: var(--text-2);
  font: 400 12px/1.45 var(--sans);
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
  padding: 4px 14px 14px;
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
  font: 500 13px/1.4 var(--mono);
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
  font: 400 11.5px/1.4 var(--sans);
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

/* The numbers being checked, with nothing around them: a quiet label and a
   large figure. They were bordered tiles, which made three numbers look like
   three buttons. */
.hero {
  display: grid;
  gap: 12px 8px;
  padding: 14px;
  border-bottom: 1px solid var(--line);
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.hero.is-1up { grid-template-columns: minmax(0, 1fr); }
.hero.is-2up { grid-template-columns: repeat(2, minmax(0, 1fr)); }
/* Four edge distances: 2x2 rather than four slivers. */
.hero.is-4up { grid-template-columns: repeat(2, minmax(0, 1fr)); }

.tile {
  min-width: 0;
  margin: -4px -6px;
  padding: 4px 6px;
  border-radius: 6px;
}

.tile-label {
  display: block;
  margin-bottom: 1px;
  color: var(--text-2);
  font: 400 11.5px/1.4 var(--sans);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile-value {
  display: block;
  color: var(--text);
  font: 500 22px/1.2 var(--sans);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* The distance is the answer, so it is the biggest thing on the panel. */
.hero.is-measure.is-1up .tile-value { font-size: 34px; letter-spacing: -0.03em; }

.tile-unit,
.tile-sub {
  margin-left: 4px;
  color: var(--text-3);
  font: 400 11.5px/1.2 var(--sans);
  letter-spacing: 0;
}
.tile-sub { color: var(--text-2); }

/* A gap that lands exactly on a spacing token is the good news a QA pass is
   looking for, so it gets the status colour for "right". */
.tile-sub.is-token {
  display: block;
  margin-left: 0;
  margin-top: 2px;
  color: var(--ok);
  font: 500 12px/1.4 var(--mono);
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
  min-height: 40px;
  padding: 0 14px;
  border: 0;
  background: none;
  color: var(--text);
  font: 600 12px/1.4 var(--sans);
  text-align: left;
  cursor: pointer;
}
.sec-title::after {
  content: "";
  width: 6px;
  height: 6px;
  margin-right: 3px;
  color: var(--text-3);
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg) translate(-1px, -1px);
  transition: transform 160ms var(--ease-out);
}
.sec-title[aria-expanded="false"]::after { transform: rotate(-45deg) translate(-1px, -1px); }
@media (hover: hover) and (pointer: fine) {
  .sec-title:hover { background: var(--hover); }
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
  font: 400 12.5px/1.75 var(--sans);
}
.row dd {
  font: 500 12.5px/1.75 var(--sans);
  font-variant-numeric: tabular-nums;
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
/* The cursor over a copyable value: an arrow with a copy glyph. The platform's
   own copy cursor is an arrow with a green plus, which reads as "add". It
   stays as the fallback for a page whose CSP will not load an image cursor. */
.copy {
  cursor: copy;
  cursor: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='28'%20height='28'%20viewBox='0%200%2028%2028'%3E%3Cpath%20d='M3%202v15.5l4.1-3.7%202.7%206.1%202.5-1.1-2.7-6%205.5-.3z'%20fill='%23fff'%20stroke='%23111'%20stroke-width='1.3'%20stroke-linejoin='round'/%3E%3Crect%20x='18.6'%20y='18.6'%20width='8'%20height='8'%20rx='2'%20fill='%23fff'%20stroke='%23111'%20stroke-width='1.3'/%3E%3Crect%20x='14.6'%20y='14.6'%20width='8'%20height='8'%20rx='2'%20fill='%23fff'%20stroke='%23111'%20stroke-width='1.3'/%3E%3C/svg%3E") 3 2, copy;
  cursor: -webkit-image-set(url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='28'%20height='28'%20viewBox='0%200%2028%2028'%3E%3Cpath%20d='M3%202v15.5l4.1-3.7%202.7%206.1%202.5-1.1-2.7-6%205.5-.3z'%20fill='%23fff'%20stroke='%23111'%20stroke-width='1.3'%20stroke-linejoin='round'/%3E%3Crect%20x='18.6'%20y='18.6'%20width='8'%20height='8'%20rx='2'%20fill='%23fff'%20stroke='%23111'%20stroke-width='1.3'/%3E%3Crect%20x='14.6'%20y='14.6'%20width='8'%20height='8'%20rx='2'%20fill='%23fff'%20stroke='%23111'%20stroke-width='1.3'/%3E%3C/svg%3E") 1x, url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='56'%20height='56'%20viewBox='0%200%2028%2028'%3E%3Cpath%20d='M3%202v15.5l4.1-3.7%202.7%206.1%202.5-1.1-2.7-6%205.5-.3z'%20fill='%23fff'%20stroke='%23111'%20stroke-width='1.3'%20stroke-linejoin='round'/%3E%3Crect%20x='18.6'%20y='18.6'%20width='8'%20height='8'%20rx='2'%20fill='%23fff'%20stroke='%23111'%20stroke-width='1.3'/%3E%3Crect%20x='14.6'%20y='14.6'%20width='8'%20height='8'%20rx='2'%20fill='%23fff'%20stroke='%23111'%20stroke-width='1.3'/%3E%3C/svg%3E") 2x) 3 2, copy;
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

.is-hex { font-family: var(--mono); font-size: 12px; }

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
  min-height: 46px;
  padding: 8px 10px 8px 14px;
  background: var(--bg);
  border-top: 1px solid var(--line);
}

.status-text {
  flex: 1;
  min-width: 0;
  color: var(--text-2);
  font: 400 12px/1.4 var(--sans);
}

/* The dot carries the state in the same colours as the on-page highlights. */
.status-dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-3);
}
.status-dot.is-lockedA { background: var(--accent); }
.status-dot.is-measuring { background: var(--measure); }
.status-dot.is-lockedAB { background: var(--mark-b); }

.btn {
  flex: none;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
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
  border: 0;
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
  padding: 22px 4px 4px;
  border-radius: 7px;
  background: var(--box-ring);
  box-shadow: inset 0 0 0 1px var(--box-ring-line);
  text-align: center;
}

.ring-label {
  position: absolute;
  top: 6px;
  left: 9px;
  color: var(--text-3);
  font: 400 11px/1.3 var(--sans);
}

.ring-mid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 3px;
}

.sv {
  display: inline-block;
  min-width: 26px;
  padding: 3px 3px;
  font: 400 11.5px/1.5 var(--sans);
  font-variant-numeric: tabular-nums;
  color: var(--text);
}
.sv.is-zero { color: var(--text-3); }
.sv.is-side-l, .sv.is-side-r { flex: none; }

.content-box {
  padding: 6px 4px;
  border-radius: 5px;
  background: var(--accent-soft);
  color: var(--accent-text);
}

.dim {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 5px;
  padding: 1px 3px;
  font: 500 12px/1.5 var(--sans);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.dim-axis { font-size: 11px; font-weight: 400; opacity: 0.7; }

.sbox-note {
  margin-top: 8px;
  display: grid;
  grid-template-columns: 104px 1fr;
  gap: 0 10px;
}
.sbox-note dt { color: var(--text-2); font: 400 12.5px/1.75 var(--sans); }
.sbox-note dd { font: 500 12.5px/1.75 var(--sans); font-variant-numeric: tabular-nums; text-align: right; }

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
  font: 400 11.5px/1.5 var(--mono);
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
  font: 500 10.5px/1.5 var(--sans);
  letter-spacing: 0.02em;
}

/* ---------- the two measured elements ---------- */

/* Stacked, not side by side: two narrow columns truncate an identity like
   section#hero.container to nothing, and the eye reads A then B as a sequence
   anyway. Full width also lets each one's facts run inline. */
.pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
}

.pair-col { min-width: 0; }

.pair-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 24px;
}

.pair-name {
  flex: 1;
  min-width: 0;
  color: var(--text);
  font: 400 12px/1.4 var(--mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* One line each: which element, then the one fact that identifies it. */
.pair-sum {
  flex: none;
  margin-left: auto;
  padding-left: 10px;
  color: var(--text-2);
  font: 400 12.5px/1.4 var(--sans);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

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
