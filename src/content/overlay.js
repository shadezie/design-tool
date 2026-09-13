/**
 * The injected UI surface.
 *
 * Everything lives in a closed shadow root so the host page's CSS cannot
 * restyle the tool and the tool's CSS cannot leak into the page being QA'd.
 * The layer is pointer-events: none, so the page still receives hover; only
 * the card opts back in.
 */
(() => {
  const DT = (window.__designtool = window.__designtool || {});
  const { prefs } = DT;

  const HOST_ID = 'designtool-root';
  const MAX_Z = '2147483647';

  let host = null;
  let root = null;
  let layer = null;
  let card = null;
  let resizer = null;
  let sizeWatcher = null;
  let loadedFonts = [];
  const highlights = new Map();
  let measureNodes = [];

  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function makeHighlight(kind) {
    const box = el('div', `hl is-${kind}`);
    box.style.display = 'none';
    const tag = el('span', 'hl-tag');
    box.appendChild(tag);
    layer.appendChild(box);
    const entry = { box, tag };
    highlights.set(kind, entry);
    return entry;
  }

  const overlay = {
    get card() {
      return card;
    },

    get resizer() {
      return resizer;
    },

    /** Set while the user is dragging the card, so hover tracking holds still. */
    dragging: false,

    get shadowRoot() {
      return root;
    },

    mounted() {
      return host !== null;
    },

    /**
     * True when an event came from our own UI. Events crossing a closed shadow
     * root are retargeted to the host, so this one check covers the whole card.
     */
    ownsEvent(event) {
      return host !== null && event.target === host;
    },

    mount() {
      if (host) return;

      host = el('div');
      host.id = HOST_ID;
      // Inline, and re-asserted on every frame, because some pages have
      // aggressive `div { ... }` rules or scripts that reshuffle the DOM.
      host.style.cssText = `position:fixed;top:0;left:0;width:0;height:0;margin:0;padding:0;border:0;z-index:${MAX_Z};pointer-events:none;`;

      root = host.attachShadow({ mode: 'closed' });
      const style = el('style');
      style.textContent = DT.css;
      root.appendChild(style);

      layer = el('div', 'layer');
      layer.style.overflow = 'hidden';
      root.appendChild(layer);

      card = el('div', 'card');
      card.style.display = 'none';
      const size = prefs.get('size');
      if (size) {
        card.style.width = `${size.width}px`;
        card.style.height = `${size.height}px`;
      }
      layer.appendChild(card);

      // The resize handle writes inline width and height on the card. That
      // inline style is the signal that a size was chosen deliberately, rather
      // than the card just growing with its content.
      if (typeof ResizeObserver === 'function') {
        sizeWatcher = new ResizeObserver(() => {
          if (!card?.style.width) return;
          prefs.set('size', {
            width: Math.round(parseFloat(card.style.width)),
            height: Math.round(parseFloat(card.style.height)),
          });
        });
        sizeWatcher.observe(card);
      }

      overlay.setTheme(prefs.get('theme'));
      loadFonts();

      resizer = el('div', 'resizer');
      resizer.style.display = 'none';
      resizer.title = 'Drag to resize';
      layer.appendChild(resizer);

      makeHighlight('hover');
      makeHighlight('a');
      makeHighlight('b');

      document.documentElement.appendChild(host);
    },

    setTheme(theme) {
      layer?.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
    },

    unmount() {
      for (const face of loadedFonts) {
        try {
          document.fonts.delete(face);
        } catch {
          // Already gone, or the document is being torn down.
        }
      }
      loadedFonts = [];
      sizeWatcher?.disconnect();
      sizeWatcher = null;
      overlay.dragging = false;
      host?.remove();
      host = root = layer = card = resizer = null;
      highlights.clear();
      measureNodes = [];
    },

    /** Keep the host attached and on top even if the page rewrites the DOM. */
    reassert() {
      if (host && host.parentNode !== document.documentElement) {
        document.documentElement.appendChild(host);
      }
    },

    /**
     * @param {'hover'|'a'|'b'} kind
     * @param {DOMRect|null} rect
     * @param {string} [label]
     */
    setHighlight(kind, rect, label) {
      const entry = highlights.get(kind);
      if (!entry) return;
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        entry.box.style.display = 'none';
        return;
      }
      const { box, tag } = entry;
      box.style.display = 'block';
      box.style.transform = `translate(${Math.round(rect.left)}px, ${Math.round(rect.top)}px)`;
      box.style.width = `${Math.max(0, Math.round(rect.width))}px`;
      box.style.height = `${Math.max(0, Math.round(rect.height))}px`;
      tag.textContent = label || '';
      tag.style.display = label ? 'block' : 'none';
      // Flip the tag inside the element when it would sit above the viewport.
      tag.style.top = rect.top < 24 ? '2px' : '-22px';
    },

    clearHighlights() {
      for (const { box } of highlights.values()) box.style.display = 'none';
    },

    /** Draw the dimension lines for a measurement result. */
    setMeasurement(result, formatValue) {
      for (const node of measureNodes) node.remove();
      measureNodes = [];
      if (!result) return;

      for (const guide of result.guides) addLine(guide, true);
      for (const segment of result.segments) {
        addLine(segment, false);
        addLabel(segment, formatValue(segment.value));
      }
    },

    setCardPosition(left, top) {
      card.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
      // Keep the card inside the viewport from wherever its top edge sits.
      // Pinned low on a page it would otherwise run off the bottom, taking its
      // resize corner out of reach.
      card.style.maxHeight = `${Math.max(160, Math.round(window.innerHeight - top - 10))}px`;

      const rect = card.getBoundingClientRect();
      resizer.style.transform = `translate(${Math.round(rect.right - 16)}px, ${Math.round(
        rect.bottom - 16
      )}px)`;
    },

    showCard(show) {
      card.style.display = show ? 'block' : 'none';
      resizer.style.display = show ? 'block' : 'none';
    },
  };

  /**
   * Register the brand typefaces on the document.
   *
   * They cannot live in the shadow root: Chrome ignores @font-face rules
   * declared inside one. A strict font-src CSP can still refuse them, so every
   * step is guarded and the stylesheet falls back to the platform stack.
   */
  function loadFonts() {
    if (typeof FontFace !== 'function' || !document.fonts) return;
    for (const [family, file, descriptors] of DT.FONTS) {
      try {
        const url = chrome.runtime.getURL(`src/fonts/${file}`);
        const face = new FontFace(family, `url("${url}") format("woff2")`, descriptors);
        face
          .load()
          .then(() => {
            document.fonts.add(face);
            loadedFonts.push(face);
          })
          .catch(() => {
            // Page CSP blocked it; the fallback stack takes over.
          });
      } catch {
        // FontFace construction can throw on malformed descriptors.
      }
    }
  }

  function addLine(seg, isGuide) {
    const line = el('div', `mline${isGuide ? ` is-guide is-${seg.axis}` : ''}`);
    const x = Math.min(seg.x1, seg.x2);
    const y = Math.min(seg.y1, seg.y2);
    const w = Math.abs(seg.x2 - seg.x1);
    const h = Math.abs(seg.y2 - seg.y1);
    line.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    line.style.width = `${seg.axis === 'h' ? Math.round(w) : 1}px`;
    line.style.height = `${seg.axis === 'v' ? Math.round(h) : 1}px`;
    layer.appendChild(line);
    measureNodes.push(line);

    if (!isGuide) {
      // End caps, so a zero-ish gap is still visible as a tick.
      addCap(seg.axis, x, y);
      addCap(seg.axis, seg.axis === 'h' ? x + w : x, seg.axis === 'v' ? y + h : y);
    }
  }

  function addCap(axis, x, y) {
    const cap = el('div', 'mcap');
    const long = 7;
    cap.style.width = `${axis === 'h' ? 1 : long}px`;
    cap.style.height = `${axis === 'v' ? 1 : long}px`;
    const dx = axis === 'h' ? 0 : -(long - 1) / 2;
    const dy = axis === 'v' ? 0 : -(long - 1) / 2;
    cap.style.transform = `translate(${Math.round(x + dx)}px, ${Math.round(y + dy)}px)`;
    layer.appendChild(cap);
    measureNodes.push(cap);
  }

  function addLabel(seg, text) {
    const label = el('div', 'mlabel');
    label.textContent = text;
    const cx = (seg.x1 + seg.x2) / 2;
    const cy = (seg.y1 + seg.y2) / 2;
    // Nudge off the line so the line stays readable underneath.
    const offX = seg.axis === 'v' ? 22 : 0;
    const offY = seg.axis === 'h' ? -12 : 0;
    label.style.left = `${Math.round(cx + offX)}px`;
    label.style.top = `${Math.round(cy + offY)}px`;
    layer.appendChild(label);
    measureNodes.push(label);
  }

  DT.overlay = overlay;
})();
