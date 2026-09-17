/**
 * All CSS for the injected UI, as a string.
 *
 * It lives in JS rather than a .css file because it is injected into a closed
 * shadow root: a manifest "css" entry would land in the host page instead, and
 * fetching a stylesheet at runtime trips strict CSP on sites like GitHub.
 *
 * Two token groups. The page overlay (highlights, dimension lines) is never
 * themed: it has to read on top of whatever the site looks like. The card is
 * themed, and light mode only reassigns its surface tokens.
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

  /* Page overlay. Never themed: it has to read on top of any site.
     Brand blue marks the element you picked. The other two are functional
     colours outside the brand palette, because a second element and a
     dimension line have to stay tellable apart from it and from each other. */
  --hl-a: #2a51fd;
  --hl-b: #ffb020;
  --measure: #ff3b6b;

  /* Card surface, dark. Ground is brand Ink. */
  --bg: #0f172a;
  --bg-soft: #1a2440;
  --line: rgba(232, 237, 255, 0.12);
  --text: #f4f6fa;
  --muted: #8895b3;
  --accent: #2a51fd;
  --accent-text: #6e8cff;
  --zero: #4c5a78;
  --flash: rgba(232, 237, 255, 0.09);
  --ring-line: rgba(232, 237, 255, 0.16);
  --tint-margin: rgba(255, 176, 32, 0.08);
  --tint-border: rgba(136, 149, 179, 0.10);
  --tint-padding: rgba(45, 212, 160, 0.08);
  --tint-content: rgba(42, 81, 253, 0.22);
  --shadow: 0 12px 32px rgba(4, 9, 22, 0.55);
}

.layer[data-theme="light"] {
  --bg: #ffffff;
  --bg-soft: #f4f6fa;
  --line: rgba(15, 23, 42, 0.10);
  --text: #0f172a;
  --muted: #5d6b85;
  --accent: #2a51fd;
  --accent-text: #2a51fd;
  --zero: #aab3c6;
  --flash: #e8edff;
  --ring-line: rgba(15, 23, 42, 0.14);
  --tint-margin: rgba(255, 159, 10, 0.16);
  --tint-border: rgba(93, 107, 133, 0.12);
  --tint-padding: rgba(16, 185, 129, 0.13);
  --tint-content: rgba(42, 81, 253, 0.12);
  --shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
}

/* ---------- element highlights ---------- */

.hl {
  position: absolute;
  z-index: 1;
  pointer-events: none;
  border: 1px solid var(--hl-a);
  background: rgba(79, 140, 255, 0.10);
  border-radius: 1px;
}
.hl.is-a { border-color: var(--hl-a); background: rgba(79, 140, 255, 0.14); }
.hl.is-b { border-color: var(--hl-b); background: rgba(255, 176, 32, 0.14); }
.hl.is-hover { border-style: dashed; background: rgba(79, 140, 255, 0.07); }

.hl-tag {
  position: absolute;
  top: -22px;
  left: -1px;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--hl-a);
  color: #fff;
  font: 500 10px/1.4 var(--mono);
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.hl.is-b .hl-tag { background: var(--hl-b); color: #241a00; }

/* ---------- measurement lines ---------- */

.mline {
  position: absolute;
  z-index: 1;
  background: var(--measure);
  pointer-events: none;
}
.mline.is-guide {
  background: none;
  border-top: 1px dashed rgba(255, 59, 107, 0.55);
  border-left: 1px dashed rgba(255, 59, 107, 0.55);
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
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

/* ---------- the card ---------- */

.card {
  position: absolute;
  z-index: 3;
  width: 330px;
  min-width: 260px;
  max-width: 640px;
  min-height: 160px;
  overflow: auto;
  overscroll-behavior: contain;
  pointer-events: auto;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: var(--shadow);
  font-size: 12px;
  line-height: 1.5;
  scrollbar-width: thin;
}
.card::-webkit-scrollbar { width: 8px; height: 8px; }
.card::-webkit-scrollbar-thumb { background: var(--line); border-radius: 4px; }

.card-head {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 10px;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
}

.icon-btn {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: none;
  color: var(--muted);
  cursor: pointer;
}
.icon-btn:hover { background: var(--flash); color: var(--text); }
.icon-btn.close:hover { background: var(--measure); color: #fff; }
.icon-btn svg { width: 14px; height: 14px; display: block; }

.grip { cursor: grab; }
.grip:active { cursor: grabbing; }
.card.is-pinned .grip { color: var(--accent); }

.card-title {
  flex: 1;
  min-width: 0;
  font: 500 12px/1.4 var(--mono);
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-title .t-tag { color: var(--accent); }
.card-title .t-id { color: #d18b00; }
.layer[data-theme="light"] .card-title .t-id { color: #9a6500; }
.card-title .t-class { color: var(--muted); }

.units {
  display: flex;
  flex: none;
  padding: 2px;
  border-radius: 6px;
  background: var(--bg-soft);
}
.units button {
  padding: 4px 8px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--muted);
  font: 500 11px/1.5 var(--mono);
  cursor: pointer;
}
.units button:hover { color: var(--text); }
.units button[aria-pressed="true"] { background: var(--accent); color: #fff; }

/* The resize handle rides outside the card's scroll area, so it stays put no
   matter how far the card is scrolled and never collides with the scrollbar. */
.resizer {
  position: absolute;
  z-index: 4;
  width: 16px;
  height: 16px;
  pointer-events: auto;
  cursor: nwse-resize;
}
.resizer::after {
  content: "";
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--muted);
  border-bottom: 2px solid var(--muted);
  border-bottom-right-radius: 3px;
}
.resizer:hover::after { border-color: var(--accent); }

/* ---------- hero values ---------- */

.hero {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--line);
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.hero.is-2up { grid-template-columns: repeat(2, minmax(0, 1fr)); }

.tile {
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--bg-soft);
  overflow: hidden;
}

.tile-unit {
  margin-left: 3px;
  color: var(--zero);
}

.tile-label {
  display: block;
  margin-bottom: 3px;
  color: var(--muted);
  font: 500 8px/1.4 var(--mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
}

.tile-value {
  display: block;
  color: var(--text);
  font: 500 18px/1.2 var(--mono);
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile-sub {
  margin-left: 4px;
  color: var(--muted);
  font: 400 10px/1.2 var(--mono);
}

.sec { padding: 10px 12px; border-bottom: 1px solid var(--line); }
.sec:last-child { border-bottom: 0; }

.sec-title {
  margin-bottom: 8px;
  color: var(--muted);
  font: 500 9px/1.4 var(--mono);
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.row {
  display: grid;
  grid-template-columns: 106px 1fr;
  gap: 8px;
  align-items: baseline;
  padding: 1px 0;
}
.row dt { color: var(--muted); font: 400 11px/1.6 var(--mono); }
.row dd {
  font: 400 12px/1.5 var(--mono);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy { cursor: copy; border-radius: 3px; }
.copy:hover { background: var(--flash); box-shadow: 0 0 0 3px var(--flash); }
.copy.is-copied { background: var(--accent); color: #fff; box-shadow: 0 0 0 3px var(--accent); }

.is-hex { color: var(--accent-text); }

.row dd.is-wrap { white-space: normal; overflow: visible; }

.swatch {
  display: inline-block;
  width: 9px;
  height: 9px;
  margin-right: 5px;
  border: 1px solid var(--ring-line);
  border-radius: 2px;
  vertical-align: baseline;
}

.state-line {
  margin-bottom: 9px;
  color: var(--text);
  font: 400 11px/1.5 var(--sans);
}

.sc {
  display: grid;
  gap: 5px;
}

.sc-row {
  display: grid;
  grid-template-columns: 104px 1fr;
  gap: 10px;
  align-items: center;
}

.sc-keys {
  display: flex;
  align-items: center;
  gap: 3px;
  justify-content: flex-start;
}

.sc-plus {
  color: var(--zero);
  font: 400 9px/1 var(--mono);
}

.sc-meaning {
  color: var(--muted);
  font: 400 11px/1.4 var(--sans);
}

kbd {
  padding: 2px 5px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--bg-soft);
  color: var(--text);
  font: 500 10px/1.3 var(--mono);
  white-space: nowrap;
}

/* ---------- spacing box ---------- */

.ring {
  position: relative;
  padding: 14px 2px 3px;
  border: 1px dashed var(--ring-line);
  border-radius: 5px;
  text-align: center;
}

.ring-label {
  position: absolute;
  top: 2px;
  left: 6px;
  color: var(--muted);
  font: 500 8px/1.3 var(--mono);
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.ring-margin { background: var(--tint-margin); }
.ring-border { background: var(--tint-border); }
.ring-padding { background: var(--tint-padding); }

.ring-mid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.sv {
  min-width: 18px;
  padding: 1px 2px;
  font: 400 10px/1.5 var(--mono);
  color: var(--text);
}
.sv.is-zero { color: var(--zero); }
.sv.is-side-l, .sv.is-side-r { flex: none; }

.content-box {
  padding: 6px 4px;
  border: 1px solid var(--ring-line);
  border-radius: 4px;
  background: var(--tint-content);
}

.dim {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 5px;
  padding: 1px 3px;
  font: 500 11px/1.5 var(--mono);
  white-space: nowrap;
}
.dim-axis { color: var(--muted); font-size: 9px; }

.sbox-note {
  margin-top: 7px;
  display: grid;
  grid-template-columns: 106px 1fr;
  gap: 8px;
}
.sbox-note dt { color: var(--muted); font: 400 11px/1.6 var(--mono); }
.sbox-note dd { font: 400 12px/1.5 var(--mono); text-align: right; }


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
  font: 500 11.5px/1.4 var(--mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* A value match is a guess: the same hex can belong to two tokens. The dotted
   underline says "probably this one" without a second line of explanation. */
.token.is-guess {
  text-decoration: underline dotted var(--line);
  text-underline-offset: 3px;
}

.token-raw {
  color: var(--muted);
  font: 400 10.5px/1.4 var(--mono);
}

/* ---------- media ---------- */

.media-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.media-kind {
  color: var(--text);
  font: 500 11.5px/1.4 var(--sans);
}

.media-format {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--accent);
  color: #fff;
  font: 500 9px/1.3 var(--mono);
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
  margin-top: 9px;
  padding-top: 9px;
  border-top: 1px solid var(--line);
}

.pair-col {
  min-width: 0;
  padding: 7px 8px;
  border-radius: 5px;
  background: var(--bg-soft);
}

.pair-head {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 5px;
  min-width: 0;
}

/* Same colours as the on-page highlights, so the column and the box it
   describes are obviously the same thing. */
.pair-badge {
  flex: none;
  width: 13px;
  height: 13px;
  border-radius: 3px;
  color: #fff;
  font: 600 8px/13px var(--mono);
  text-align: center;
}
.pair-badge.is-a { background: var(--hl-a); }
.pair-badge.is-b { background: var(--hl-b); color: #1A1200; }

.pair-name {
  min-width: 0;
  color: var(--muted);
  font: 400 9.5px/1.3 var(--mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pair-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
}

.pair-fact {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
}

.pair-key {
  color: var(--muted);
  font: 400 9.5px/1.6 var(--mono);
}

.pair-val {
  color: var(--text);
  font: 500 10.5px/1.6 var(--mono);
  white-space: nowrap;
}

/* ---------- the distance, on one line ---------- */

.mlead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.mlead-kind {
  color: var(--muted);
  font: 400 11px/1.5 var(--sans);
}

.mlead-val {
  color: var(--measure);
  font: 600 15px/1.4 var(--mono);
  white-space: nowrap;
}

/* ---------- measurement readout inside the card ---------- */

.mval { color: var(--measure); font-weight: 600; }
`;
})();
