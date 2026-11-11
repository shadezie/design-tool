/**
 * The injected UI surface.
 *
 * Everything lives in a closed shadow root so the host page's CSS cannot
 * restyle the tool and the tool's CSS cannot leak into the page being QA'd.
 * The layer is pointer-events: none, so the page still receives hover; only
 * the panel opts back in.
 */
(() => {
  const DT = (window.__designtool = window.__designtool || {});
  const { prefs } = DT;

  const HOST_ID = 'designtool-root';
  const MAX_Z = '2147483647';
  const HOST_STYLE = `position:fixed;top:0;left:0;width:0;height:0;margin:0;padding:0;border:0;z-index:${MAX_Z};pointer-events:none;`;

  let host = null;
  let root = null;
  let layer = null;
  let panel = null;
  let head = null;
  let body = null;
  let foot = null;
  let loadedFonts = [];
  // Where highlights and dimension lines are drawn. In place, that is our own
  // layer. With the stage, it is a second layer inside the framed document,
  // so the marks scroll and scale with the page they describe.
  let markHost = null;
  let markLayer = null;
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
    markLayer.appendChild(box);
    const entry = { box, tag };
    highlights.set(kind, entry);
    return entry;
  }

  const overlay = {
    get layer() {
      return layer;
    },

    /** The docked panel, and its three regions. */
    get panel() {
      return panel;
    },
    get head() {
      return head;
    },
    get body() {
      return body;
    },
    get foot() {
      return foot;
    },

    get shadowRoot() {
      return root;
    },

    mounted() {
      return host !== null;
    },

    /**
     * True when an event came from our own UI. Events crossing a closed shadow
     * root are retargeted to the host, so this one check covers the whole panel.
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
      host.style.cssText = HOST_STYLE;

      root = host.attachShadow({ mode: 'closed' });
      const style = el('style');
      style.textContent = DT.css;
      root.appendChild(style);

      layer = el('div', 'layer');
      layer.style.overflow = 'hidden';
      root.appendChild(layer);

      panel = el('aside', 'panel');
      panel.setAttribute('aria-label', 'Design Tool');
      head = el('header', 'panel-head');
      body = el('div', 'panel-body');
      foot = el('footer', 'panel-foot');
      panel.append(head, body, foot);
      layer.appendChild(panel);

      overlay.setTheme(prefs.get('theme'));
      overlay.setSide(prefs.get('side'));
      overlay.setMode('inplace');
      loadFonts(document);
      overlay.attachMarks(document);

      document.documentElement.appendChild(host);
      overlay.motion(panel, 'enter');
    },

    setTheme(theme) {
      layer?.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
    },

    /** 'arena' when the page is framed on the stage, 'inplace' otherwise. */
    setMode(mode) {
      layer?.setAttribute('data-mode', mode);
    },

    /**
     * Point the highlights and dimension lines at a document.
     * @param {Document} doc the top document, or the stage frame's
     */
    attachMarks(doc) {
      overlay.detachMarks();
      if (doc === document) {
        markLayer = layer;
      } else {
        markHost = doc.createElement('div');
        markHost.id = HOST_ID;
        markHost.style.cssText = HOST_STYLE;
        const markRoot = markHost.attachShadow({ mode: 'closed' });
        const style = doc.createElement('style');
        style.textContent = DT.css;
        markLayer = doc.createElement('div');
        markLayer.className = 'layer';
        markRoot.append(style, markLayer);
        doc.documentElement.appendChild(markHost);
        loadFonts(doc);
      }
      makeHighlight('hover');
      makeHighlight('a');
      makeHighlight('b');
    },

    detachMarks() {
      for (const { box } of highlights.values()) box.remove();
      for (const node of measureNodes) node.remove();
      highlights.clear();
      measureNodes = [];
      markHost?.remove();
      markHost = null;
      markLayer = null;
    },

    /** @param {boolean} [animate] true when the user asked for the move */
    setSide(side, animate) {
      if (!panel) return;
      const before = animate ? panel.getBoundingClientRect().left : 0;
      panel.setAttribute('data-side', side === 'left' ? 'left' : 'right');
      layer.setAttribute('data-side', side === 'left' ? 'left' : 'right');
      if (animate) overlay.motion(panel, 'flip', { dx: before - panel.getBoundingClientRect().left });
    },

    /**
     * Motion, in one place.
     *
     * What animates is decided by how often it happens. Opening, closing,
     * flipping sides and unfolding a section are occasional, so they move.
     * Hover highlights, dimension lines and the panel's contents change many
     * times a second while the mouse moves, so they never do.
     *
     * Only transform and opacity, through the Web Animations API so nothing
     * lingers in the stylesheet to fire again when the body is rebuilt. With
     * reduced motion the movement goes and a short fade stays.
     *
     * @param {'enter'|'exit'|'flip'|'unfold'|'turn'|'settle'} kind
     * @param {{dx?: number}} [opts] flip: how far the panel just jumped
     */
    motion(node, kind, opts = {}) {
      if (!node?.animate || !layer) return null;
      const css = getComputedStyle(layer);
      const curve = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const fromEdge = panel?.getAttribute('data-side') === 'left' ? '-100%' : '100%';

      const plans = {
        // A drawer coming out of the edge it is docked to.
        enter: [[{ transform: `translateX(${fromEdge})` }, { transform: 'none' }], 220, curve('--ease-drawer', 'ease-out')],
        // Leaves the way it came, quicker: the user has already moved on.
        exit: [[{ transform: 'none' }, { transform: `translateX(${fromEdge})` }], 160, curve('--ease-out', 'ease-out')],
        // Already at the other edge; play back the distance it jumped.
        flip: [[{ transform: `translateX(${opts.dx || 0}px)` }, { transform: 'none' }], 220, curve('--ease-in-out', 'ease-in-out')],
        unfold: [[{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], 160, curve('--ease-out', 'ease-out')],
        // The stage's frame turning a quarter, as a device does in the hand.
        turn: [[{ transform: 'rotate(-90deg)' }, { transform: 'none' }], 280, curve('--ease-in-out', 'ease-in-out')],
        // A new size arriving. Barely there: this happens while comparing.
        settle: [[{ opacity: 0.6, transform: 'scale(0.985)' }, { opacity: 1, transform: 'none' }], 180, curve('--ease-out', 'ease-out')],
      };
      const fades = {
        enter: [{ opacity: 0 }, { opacity: 1 }],
        exit: [{ opacity: 1 }, { opacity: 0 }],
        flip: [{ opacity: 0 }, { opacity: 1 }],
        unfold: [{ opacity: 0 }, { opacity: 1 }],
        turn: [{ opacity: 0.4 }, { opacity: 1 }],
        settle: [{ opacity: 0.6 }, { opacity: 1 }],
      };
      const [frames, duration, easing] = plans[kind];
      try {
        return node.animate(reduce ? fades[kind] : frames, { duration: reduce ? 120 : duration, easing: reduce ? 'ease' : easing });
      } catch {
        return null;
      }
    },

    unmount() {
      for (const [fontDoc, face] of loadedFonts) {
        try {
          fontDoc.fonts.delete(face);
        } catch {
          // Already gone, or the document is being torn down.
        }
      }
      loadedFonts = [];
      // The marks on the page go at once. The panel slides back into its edge,
      // on a host this module has already let go of, so arming again mid-exit
      // just builds a fresh one.
      const leaving = host;
      overlay.detachMarks();
      const exit = overlay.motion(panel, 'exit');
      if (exit && leaving) {
        panel.style.pointerEvents = 'none';
        exit.finished.catch(() => {}).then(() => leaving.remove());
      } else {
        leaving?.remove();
      }
      host = root = layer = panel = head = body = foot = null;
    },

    /** Keep the host attached and on top even if the page rewrites the DOM. */
    reassert() {
      if (host && host.parentNode !== document.documentElement) {
        document.documentElement.appendChild(host);
      }
      const markDoc = markHost?.ownerDocument;
      if (markDoc?.documentElement && markHost.parentNode !== markDoc.documentElement) {
        markDoc.documentElement.appendChild(markHost);
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
      tag.style.top = rect.top < 26 ? '2px' : '-23px';
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
  };

  /**
   * Register the brand typefaces on the document.
   *
   * They cannot live in the shadow root: Chrome ignores @font-face rules
   * declared inside one. A strict font-src CSP can still refuse them, so every
   * step is guarded and the stylesheet falls back to the platform stack.
   */
  function loadFonts(doc) {
    // Faces belong to the window that made them, so the frame gets its own.
    const FontFace = doc.defaultView?.FontFace;
    if (typeof FontFace !== 'function' || !doc.fonts) return;
    for (const [family, file, descriptors] of DT.FONTS) {
      try {
        const url = chrome.runtime.getURL(`src/fonts/${file}`);
        const face = new FontFace(family, `url("${url}") format("woff2")`, descriptors);
        face
          .load()
          .then(() => {
            doc.fonts.add(face);
            loadedFonts.push([doc, face]);
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
    markLayer.appendChild(line);
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
    markLayer.appendChild(cap);
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
    markLayer.appendChild(label);
    measureNodes.push(label);
  }

  DT.overlay = overlay;
})();
