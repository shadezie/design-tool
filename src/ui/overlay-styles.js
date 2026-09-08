/**
 * All CSS for the injected UI, as a string.
 *
 * It lives in JS rather than a .css file because it is injected into a closed
 * shadow root: a manifest "css" entry would land in the host page instead, and
 * fetching a stylesheet at runtime trips strict CSP on sites like GitHub.
 */
(() => {
  const DT = (window.__designtool = window.__designtool || {});

  DT.css = `
:host { all: initial; }

* { box-sizing: border-box; margin: 0; padding: 0; }

.layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif;
  --bg: #14161a;
  --bg-soft: #1c1f25;
  --line: rgba(255, 255, 255, 0.10);
  --text: #e6e8eb;
  --muted: #8b929c;
  --accent: #4f8cff;
  --accent-b: #ffb020;
  --measure: #ff3b6b;
  --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}

/* ---------- element highlights ---------- */

.hl {
  position: absolute;
  z-index: 1;
  pointer-events: none;
  border: 1px solid var(--accent);
  background: rgba(79, 140, 255, 0.10);
  border-radius: 1px;
}
.hl.is-a { border-color: var(--accent); background: rgba(79, 140, 255, 0.14); }
.hl.is-b { border-color: var(--accent-b); background: rgba(255, 176, 32, 0.14); }
.hl.is-hover { border-style: dashed; background: rgba(79, 140, 255, 0.07); }

.hl-tag {
  position: absolute;
  top: -19px;
  left: -1px;
  padding: 2px 6px;
  border-radius: 3px 3px 0 0;
  background: var(--accent);
  color: #fff;
  font: 500 10px/1.4 var(--mono);
  white-space: nowrap;
}
.hl.is-b .hl-tag { background: var(--accent-b); color: #241a00; }

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
  max-height: 82vh;
  overflow-y: auto;
  overscroll-behavior: contain;
  pointer-events: auto;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  font-size: 12px;
  line-height: 1.5;
  scrollbar-width: thin;
}
.card::-webkit-scrollbar { width: 8px; }
.card::-webkit-scrollbar-thumb { background: #2c313a; border-radius: 4px; }

.card-head {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
}

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
.card-title .t-id { color: var(--accent-b); }
.card-title .t-class { color: var(--muted); }

.units {
  display: flex;
  flex: none;
  padding: 2px;
  border-radius: 6px;
  background: var(--bg-soft);
}
.units button {
  padding: 4px 10px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--muted);
  font: 500 11px/1.5 var(--mono);
  cursor: pointer;
}
.units button:hover { color: var(--text); }
.units button[aria-pressed="true"] { background: var(--accent); color: #fff; }

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
  color: #5d646f;
}

.tile-label {
  display: block;
  margin-bottom: 3px;
  color: var(--muted);
  font: 600 9px/1.4 ui-sans-serif, sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.tile-value {
  display: block;
  color: var(--text);
  font: 600 18px/1.2 var(--mono);
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
  font: 600 9px/1.4 ui-sans-serif, sans-serif;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.row {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 8px;
  align-items: baseline;
  padding: 1px 0;
}
.row dt { color: var(--muted); }
.row dd {
  font: 400 12px/1.5 var(--mono);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy { cursor: copy; border-radius: 3px; }
.copy:hover { background: rgba(255, 255, 255, 0.07); box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.07); }
.copy.is-copied { background: var(--accent); color: #fff; box-shadow: 0 0 0 3px var(--accent); }

.swatch {
  display: inline-block;
  width: 9px;
  height: 9px;
  margin-right: 5px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 2px;
  vertical-align: baseline;
}

.hint {
  padding: 8px 12px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.5;
  background: var(--bg-soft);
}
.hint kbd {
  padding: 1px 4px;
  border: 1px solid var(--line);
  border-radius: 3px;
  background: #262b33;
  color: var(--text);
  font: 500 10px/1.4 var(--mono);
}

/* ---------- spacing box ---------- */

.sbox { --ring: rgba(255, 255, 255, 0.14); }

.ring {
  position: relative;
  padding: 14px 2px 3px;
  border: 1px dashed var(--ring);
  border-radius: 5px;
  text-align: center;
}
.ring + .ring { margin: 0; }

.ring-label {
  position: absolute;
  top: 2px;
  left: 6px;
  color: var(--muted);
  font: 600 8px/1.3 ui-sans-serif, sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ring-margin { background: rgba(255, 176, 32, 0.07); }
.ring-border { background: rgba(140, 150, 165, 0.08); }
.ring-padding { background: rgba(79, 255, 176, 0.07); }

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
.sv.is-zero { color: #565d68; }
.sv.is-side-l, .sv.is-side-r { flex: none; }

.content-box {
  padding: 6px 4px;
  border: 1px solid var(--ring);
  border-radius: 4px;
  background: rgba(79, 140, 255, 0.12);
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
  grid-template-columns: 88px 1fr;
  gap: 8px;
}
.sbox-note dt { color: var(--muted); font-size: 12px; }
.sbox-note dd { font: 400 12px/1.5 var(--mono); text-align: right; }

/* ---------- measurement readout inside the card ---------- */

.mkind { margin-bottom: 6px; color: var(--muted); font-size: 11px; }
.mval { color: var(--measure); font-weight: 600; }
`;
})();
