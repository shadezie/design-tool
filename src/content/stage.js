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
  /** How long a frame gets to produce a readable document. */
  const LOAD_TIMEOUT = 10000;

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
  const NOT_WEB = 'Device sizes need a page served over http or https. Inspecting this one in place.';

  let nodes = null;
  let callbacks = null;
  let size = { cls: 'fit', w: 0, h: 0 };
  let timer = 0;
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
    const availH = Math.max(MIN, view.clientHeight - 72);
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
    const setMode = (interact) => {
      inspectBtn.setAttribute('aria-pressed', String(!interact));
      interactBtn.setAttribute('aria-pressed', String(interact));
      callbacks.onMode(interact);
    };
    const inspectBtn = button('mode-inspect', 'Inspect', () => setMode(false));
    const interactBtn = button('mode-interact', 'Interact', () => setMode(true));
    inspectBtn.title = 'Hover and click to inspect';
    interactBtn.title = 'Use the page normally: open menus, follow links';
    inspectBtn.setAttribute('aria-pressed', 'true');
    interactBtn.setAttribute('aria-pressed', 'false');
    modes.append(inspectBtn, interactBtn);

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
    }, ICONS.rotate);

    const zoomRead = el('span', 'read');
    zoomRead.title = 'How much the page is scaled down to fit';

    bar.append(modes, devices, list, dims, rotate, el('span', 'grow'), zoomRead);
    return { bar, list, width, height, rotate, zoomRead, deviceButtons };
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
    timer = 0;
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
    callbacks?.onTarget(window, document, { notice, framed: false });
  }

  function onLoad() {
    if (!nodes) return;
    clearTimeout(timer);
    const { frame } = nodes;

    // A refused frame holds an error page from another origin: asking for its
    // document either throws or hands back nothing.
    let doc = null;
    try {
      doc = frame.contentDocument;
    } catch {
      doc = null;
    }
    const readable =
      !!doc?.documentElement && !!doc.body && /^https?:$/.test(doc.location?.protocol || '');
    if (!readable) {
      fallBack(BLOCKED);
      return;
    }

    // Fires again on every navigation inside the frame, which is what lets
    // Interact mode follow a link and carry on inspecting the next page.
    const win = frame.contentWindow;
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
    nodes.stage.removeAttribute('data-loading');
    callbacks.onTarget(win, doc, { notice: null, framed: true });
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
      fit.append(caption, frame);
      view.appendChild(fit);
      stage.append(controls.bar, view);

      nodes = { stage, view, fit, frame, caption, ...controls };
      overlay.setMode('arena');
      quietOriginal();
      overlay.layer.insertBefore(stage, overlay.panel);
      layout();
      window.addEventListener('resize', layout);

      timer = setTimeout(() => fallBack(BLOCKED), LOAD_TIMEOUT);
    },

    close() {
      teardown();
      callbacks = null;
    },
  };
})();
