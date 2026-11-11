/**
 * The stage: the page, framed at a chosen size, beside the panel.
 *
 * The same URL is loaded into a same-origin iframe and the inspector reads
 * that frame instead of the top window. An iframe has a real viewport of its
 * own, so media queries, vh units and container sizes all respond to the size
 * picked here. What it does not change is the user agent, touch input or
 * pixel density: this is a viewport, not a device.
 *
 * Framing is the page's to refuse. A site that sends X-Frame-Options: DENY or
 * frame-ancestors 'none' loads nothing readable, and the tool falls back to
 * inspecting the page in place, with the panel docked over it.
 */
(() => {
  const DT = (window.__designtool = window.__designtool || {});
  const { prefs, overlay } = DT;

  /** Device classes, default size first. [width, height, name] */
  const DEVICES = {
    mobile: { name: 'Mobile', sizes: [[390, 844, 'iPhone 15'], [360, 800, 'Android'], [430, 932, 'iPhone Pro Max']] },
    tablet: { name: 'Tablet', sizes: [[768, 1024, 'iPad mini'], [820, 1180, 'iPad Air'], [1024, 1366, 'iPad Pro']] },
    desktop: { name: 'Desktop', sizes: [[1440, 900, 'Laptop'], [1280, 800, 'Small laptop'], [1366, 768, 'HD']] },
    large: { name: 'Large desktop', sizes: [[1920, 1080, 'Full HD'], [2560, 1440, 'QHD']] },
  };
  const MIN = 240;
  const MAX = 3840;
  /** How long a frame gets to start answering at all. */
  const LOAD_TIMEOUT = 20000;

  const STROKE =
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const ICONS = {
    mobile: `<svg ${STROKE}><rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/></svg>`,
    tablet: `<svg ${STROKE}><rect x="4.5" y="3" width="15" height="18" rx="2.5"/><path d="M11 18h2"/></svg>`,
    desktop: `<svg ${STROKE}><rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M9 20h6M12 16.5V20"/></svg>`,
    large: `<svg ${STROKE}><rect x="1.5" y="5" width="21" height="11" rx="2"/><path d="M8 20h8M12 16v4"/></svg>`,
    rotate: `<svg ${STROKE}><rect x="8" y="8" width="8" height="13" rx="2"/><path d="M4 9a8 8 0 0 1 8-6h2M12 1l2 2-2 2"/></svg>`,
  };

  const BLOCKED =
    'This site does not allow device preview, so you are inspecting it in place at your window size.';
  const SLOW =
    'This page did not load into the stage in time, so you are inspecting it in place at your window size.';
  const NOT_WEB = 'Device sizes need a page served over http or https. Inspecting this one in place.';

  let nodes = null;
  let callbacks = null;
  let size = { cls: 'fit', w: 0, h: 0 };
  let timer = 0;
  let poll = 0;
  // Interact is where the stage opens: the page works as usual until the user
  // asks to inspect it. Kept across navigations inside the frame.
  let interact = true;
  let currentDoc = null;
  let everLoaded = false;
  let pausedMedia = [];
  let priorOverflow = null;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function button(className, label, onClick, icon) {
    const node = el('button', className, icon ? null : label);
    node.type = 'button';
    if (icon) {
      // Static markup from the ICONS table above, never page content.
      node.innerHTML = icon;
      node.title = label;
      node.setAttribute('aria-label', label);
    }
    node.addEventListener('click', onClick);
    return node;
  }

  function clampSize(value, fallback) {
    const n = Math.round(Number(value));
    return Number.isFinite(n) && n > 0 ? Math.max(MIN, Math.min(MAX, n)) : fallback;
  }

  /** The class a typed width belongs to, so the right icon lights up. */
  function classFor(width) {
    return width <= 560 ? 'mobile' : width <= 1100 ? 'tablet' : width <= 1700 ? 'desktop' : 'large';
  }

  function choose(cls, index = 0) {
    size.cls = cls;
    if (cls !== 'fit') [size.w, size.h] = DEVICES[cls].sizes[index];
    commit();
    // A small settle, so a new size reads as a change and not a glitch. It is
    // opacity and a 1.5% scale on the wrapper: the frame itself jumps straight
    // to its new size, because tweening the width would reflow the page at
    // every width in between.
    overlay.motion(nodes?.turn, 'settle');
  }

  function commit() {
    prefs.set('device', { ...size });
    layout();
  }

  /**
   * Size the frame and scale it to fit.
   *
   * The iframe is always laid out at the true size and scaled with a
   * transform, so the page inside sees real pixels however small it is drawn.
   * Fit is the largest size the stage can show at 100%.
   */
  function layout() {
    if (!nodes) return;
    const { view, fit, frame, caption, list, width, height, rotate, zoomRead, deviceButtons } = nodes;
    const isFit = size.cls === 'fit';
    // Room around the frame, and above it for the caption.
    const availW = Math.max(MIN, view.clientWidth - 56);
    const availH = Math.max(MIN, view.clientHeight - 84);
    if (isFit) {
      size.w = availW;
      size.h = availH;
    }
    const { w, h } = size;
    const zoom = Math.min(1, availW / w, availH / h);

    fit.style.width = `${Math.round(w * zoom)}px`;
    fit.style.height = `${Math.round(h * zoom)}px`;
    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;
    frame.style.transform = zoom === 1 ? 'none' : `scale(${zoom})`;

    const percent = `${Math.round(zoom * 100)}%`;
    const sizes = isFit ? [] : DEVICES[size.cls].sizes;
    const match = sizes.findIndex(([sw, sh]) => (sw === w && sh === h) || (sw === h && sh === w));
    list.textContent = '';
    sizes.forEach(([sw, sh, label], index) => {
      list.add(new Option(`${label} · ${sw} × ${sh}`, String(index), false, index === match));
    });
    if (isFit) list.add(new Option('Fit to window', 'fit', true, true));
    else if (match === -1) list.add(new Option('Custom', 'custom', true, true));
    list.disabled = isFit;

    width.value = w;
    height.value = h;
    nodes.gripX.setAttribute('aria-valuenow', String(w));
    nodes.gripY.setAttribute('aria-valuenow', String(h));
    rotate.disabled = isFit;
    zoomRead.textContent = percent;
    caption.textContent = '';
    caption.append(el('b', null, isFit ? 'Fit' : DEVICES[size.cls].name), ` · ${w} × ${h} · ${percent}`);
    for (const node of deviceButtons) node.setAttribute('aria-pressed', String(node.dataset.device === size.cls));
  }

  function toolbar() {
    const bar = el('div', 'tb');

    const modes = el('div', 'seg');
    modes.setAttribute('role', 'group');
    modes.setAttribute('aria-label', 'Mode');
    const setMode = (next) => {
      interact = next;
      inspectBtn.setAttribute('aria-pressed', String(!interact));
      interactBtn.setAttribute('aria-pressed', String(interact));
      callbacks.onMode(interact);
    };
    const inspectBtn = button('mode-inspect', 'Inspect', () => setMode(false));
    const interactBtn = button('mode-interact', 'Interact', () => setMode(true));
    inspectBtn.title = 'Hover and click to inspect';
    interactBtn.title = 'Use the page normally: open menus, follow links';
    inspectBtn.setAttribute('aria-pressed', String(!interact));
    interactBtn.setAttribute('aria-pressed', String(interact));
    modes.append(interactBtn, inspectBtn);

    const devices = el('div', 'seg dev');
    devices.setAttribute('role', 'group');
    devices.setAttribute('aria-label', 'Device');
    const deviceButtons = Object.keys(DEVICES).map((key) => {
      const node = button('', DEVICES[key].name, () => choose(key), ICONS[key]);
      node.dataset.device = key;
      return node;
    });
    const fitBtn = button('fit-btn', 'Fit', () => choose('fit'));
    fitBtn.dataset.device = 'fit';
    fitBtn.title = 'Fill the stage at 100%';
    deviceButtons.push(fitBtn);
    devices.append(...deviceButtons);

    const list = el('select', 'field size-list');
    list.setAttribute('aria-label', 'Size');
    list.addEventListener('change', () => {
      if (list.value !== 'custom' && list.value !== 'fit') choose(size.cls, Number(list.value));
    });

    const dims = el('span', 'wh');
    const makeField = (key, label) => {
      const input = el('input', `field size-${key}`);
      input.type = 'number';
      input.min = String(MIN);
      input.max = String(MAX);
      input.setAttribute('aria-label', label);
      input.addEventListener('change', () => {
        const next = clampSize(input.value, size[key]);
        // Typing a size from Fit means "I want this size", so leave Fit.
        if (size.cls === 'fit') size.cls = classFor(key === 'w' ? next : size.w);
        size[key] = next;
        commit();
      });
      return input;
    };
    const width = makeField('w', 'Width');
    const height = makeField('h', 'Height');
    dims.append(width, '×', height);

    const rotate = button('ibtn rotate', 'Rotate', () => {
      [size.w, size.h] = [size.h, size.w];
      commit();
      // The frame is already in its new orientation. Turned back a quarter it
      // has exactly the outline it had a moment ago, so playing that turn
      // forward reads as the device being rotated in the hand.
      //
      // The caption and the handles belong to the frame's edges, and those
      // edges are mid-air for the length of the turn. Left where they were,
      // they sat on empty canvas beside a spinning frame. They step out for
      // the turn and come back once it has landed.
      const stageNode = nodes?.stage;
      const turning = overlay.motion(nodes?.turn, 'turn');
      if (turning && stageNode) {
        stageNode.setAttribute('data-turning', '');
        turning.finished.catch(() => {}).then(() => stageNode.removeAttribute('data-turning'));
      }
    }, ICONS.rotate);

    const zoomRead = el('span', 'read');
    zoomRead.title = 'How much the page is scaled down to fit';

    bar.append(modes, devices, list, dims, rotate, el('span', 'grow'), zoomRead);
    return { bar, list, width, height, rotate, zoomRead, deviceButtons };
  }

  /**
   * A desktop scrollbar takes about 15px out of the frame, so a 390px frame
   * lays the page out at 375. Phones draw theirs over the content. Hiding it
   * gives the page the width the toolbar says it has; the wheel and trackpad
   * still scroll.
   */
  function hideScrollbar(doc) {
    try {
      const style = doc.createElement('style');
      style.id = 'designtool-frame';
      style.textContent =
        'html{scrollbar-width:none!important}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none!important}';
      (doc.head || doc.documentElement).appendChild(style);
    } catch {
      // A document that will not take a style element keeps its scrollbar.
    }
  }

  /**
   * A handle on the frame's edge: drag to set that dimension, the way
   * DevTools does it. One on the right edge for width, one on the bottom for
   * height.
   *
   * The frame is centred on both axes, so an edge moves half as far as the
   * dimension changes: the size takes twice the pointer's travel, divided by
   * the zoom, and the handle stays under the cursor. Pointer capture keeps the
   * drag alive over the iframe, which would otherwise swallow every move.
   * @param {'w'|'h'} key
   */
  function resizeGrip(key) {
    const wide = key === 'w';
    const grip = el('div', wide ? 'grip grip-x' : 'grip grip-y');
    grip.title = 'Drag to resize';
    grip.tabIndex = 0;
    grip.setAttribute('role', 'separator');
    grip.setAttribute('aria-orientation', wide ? 'vertical' : 'horizontal');
    grip.setAttribute('aria-label', wide ? 'Frame width' : 'Frame height');
    let from = null;

    const setSize = (next) => {
      const value = clampSize(next, size[key]);
      if (value === size[key]) return;
      // Dragging from Fit means "I want this size", so leave Fit.
      if (size.cls === 'fit') size.cls = classFor(wide ? value : size.w);
      size[key] = value;
      layout();
    };

    grip.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const box = nodes.frame.getBoundingClientRect();
      from = {
        at: wide ? event.clientX : event.clientY,
        size: size[key],
        zoom: box.width / nodes.frame.offsetWidth || 1,
      };
      try {
        grip.setPointerCapture(event.pointerId);
      } catch {
        // Without capture the drag ends when the pointer crosses the frame.
      }
      nodes.stage.setAttribute('data-dragging', key);
    });
    grip.addEventListener('pointermove', (event) => {
      if (!from) return;
      const travel = (wide ? event.clientX : event.clientY) - from.at;
      setSize(from.size + (travel * 2) / from.zoom);
    });
    const end = () => {
      if (!from) return;
      from = null;
      nodes?.stage.removeAttribute('data-dragging');
      prefs.set('device', { ...size });
    };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
    grip.addEventListener('lostpointercapture', end);

    grip.addEventListener('keydown', (event) => {
      const step = event.shiftKey ? 50 : 10;
      const more = wide ? 'ArrowRight' : 'ArrowDown';
      const less = wide ? 'ArrowLeft' : 'ArrowUp';
      if (event.key === more) setSize(size[key] + step);
      else if (event.key === less) setSize(size[key] - step);
      else return;
      event.preventDefault();
      prefs.set('device', { ...size });
    });
    return grip;
  }

  /** The page under the stage keeps running. Quiet it while it is covered. */
  function quietOriginal() {
    priorOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    pausedMedia = [];
    for (const media of document.querySelectorAll('video, audio')) {
      if (media.paused) continue;
      try {
        media.pause();
        pausedMedia.push(media);
      } catch {
        // A player that refuses to pause is not worth failing over.
      }
    }
  }

  function restoreOriginal() {
    if (priorOverflow !== null) document.documentElement.style.overflow = priorOverflow;
    priorOverflow = null;
    for (const media of pausedMedia) media.play?.().catch(() => {});
    pausedMedia = [];
  }

  function teardown() {
    clearTimeout(timer);
    clearInterval(poll);
    timer = 0;
    poll = 0;
    currentDoc = null;
    window.removeEventListener('resize', layout);
    if (nodes) {
      nodes.stage.remove();
      restoreOriginal();
      overlay.setMode('inplace');
    }
    nodes = null;
  }

  /** Give up on the frame and hand the top window back to the inspector. */
  function fallBack(notice) {
    teardown();
    callbacks?.onTarget(window, document, { notice, framed: false, interact: false });
  }

  /**
   * What the frame holds right now.
   *
   * - A refused frame holds an error page from another origin: asking for its
   *   document throws or hands back nothing.
   * - A frame that has not got a response yet still holds about:blank.
   * - Anything else is the page.
   * @returns {Document|'refused'|'pending'}
   */
  function frameState() {
    let doc = null;
    try {
      doc = nodes.frame.contentDocument;
    } catch {
      doc = null;
    }
    if (!doc) return 'refused';
    if (doc.body && /^https?:$/.test(doc.location?.protocol || '')) return doc;
    return 'pending';
  }

  /** Hand a document to the inspector, once per document. */
  function adopt(doc) {
    if (doc === currentDoc) return;
    currentDoc = doc;
    clearTimeout(timer);
    clearInterval(poll);
    const win = nodes.frame.contentWindow;
    if (!everLoaded) {
      everLoaded = true;
      // Pick up where the original page was scrolled to.
      try {
        win.scrollTo(0, window.scrollY);
      } catch {
        // Not worth more than a try.
      }
    }
    win.addEventListener('resize', () => callbacks?.onResize());
    hideScrollbar(doc);
    nodes.stage.removeAttribute('data-loading');
    callbacks.onTarget(win, doc, { notice: null, framed: true, interact });
  }

  /**
   * Watch for the page rather than wait for its load event.
   *
   * `load` waits for every image, video and font. On a media-heavy page that
   * can take longer than any sensible timeout, and the stage used to give up
   * and report the site as refusing to be framed when it was only slow. The
   * document is readable long before that, so it is taken as soon as it
   * exists, and a refusal is recognised as soon as it happens.
   */
  function watch() {
    if (!nodes) return;
    const state = frameState();
    if (state === 'refused') fallBack(BLOCKED);
    else if (state !== 'pending') adopt(state);
  }

  /**
   * Fires when a document finishes loading, including every later navigation
   * inside the frame, which is what lets Interact mode follow a link.
   */
  function onLoad() {
    if (!nodes) return;
    const state = frameState();
    // Finished loading and still not a web page: refused, or a dead end.
    if (state === 'refused' || state === 'pending') {
      fallBack(BLOCKED);
      return;
    }
    adopt(state);
    // Stylesheets that arrived after the document was adopted may define
    // tokens the first pass could not see.
    callbacks?.onResize();
  }

  DT.stage = {
    DEVICES,

    get active() {
      return nodes !== null;
    },

    /**
     * Frame the page, or report that it has to be inspected in place.
     * @param {{onTarget:Function, onResize:Function, onMode:Function}} cb
     *   onTarget(win, doc, {notice, framed}) fires once there is something to
     *   inspect, and again whenever the frame navigates.
     */
    open(cb) {
      callbacks = cb;
      everLoaded = false;
      interact = true;

      if (!/^https?:$/.test(location.protocol)) {
        fallBack(NOT_WEB);
        return;
      }

      const stored = prefs.get('device');
      size = stored?.cls && (stored.cls === 'fit' || DEVICES[stored.cls])
        ? { cls: stored.cls, w: clampSize(stored.w, 390), h: clampSize(stored.h, 844) }
        : { cls: 'fit', w: 0, h: 0 };

      const stage = el('div', 'stage');
      stage.setAttribute('data-loading', '');
      const controls = toolbar();
      const view = el('div', 'view');
      const fit = el('div', 'fit');
      const caption = el('div', 'caption');
      const frame = el('iframe', 'frame');
      frame.title = 'The page being inspected';
      // Before it is attached: a frame attached with no src loads about:blank
      // first, and that load event looks exactly like a refusal.
      frame.src = location.href;
      frame.addEventListener('load', onLoad);
      // Rotation and the settle animate this wrapper, never the iframe: the
      // iframe's own transform is its zoom.
      const turn = el('div', 'turn');
      turn.appendChild(frame);
      const gripX = resizeGrip('w');
      const gripY = resizeGrip('h');
      fit.append(caption, turn, gripX, gripY);
      view.appendChild(fit);
      stage.append(controls.bar, view);

      nodes = { stage, view, fit, frame, caption, turn, gripX, gripY, ...controls };
      overlay.setMode('arena');
      quietOriginal();
      overlay.layer.insertBefore(stage, overlay.panel);
      layout();
      window.addEventListener('resize', layout);

      timer = setTimeout(() => fallBack(SLOW), LOAD_TIMEOUT);
      poll = setInterval(watch, 100);
    },

    close() {
      teardown();
      callbacks = null;
    },
  };
})();
