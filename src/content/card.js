/**
 * The panel's contents.
 *
 * Ordered the way a designer reads a spec: what am I looking at, what is the
 * type, how is it spaced, how is it laid out, what is it filled with. The
 * sections keep that order and remember whether they are folded, so the thing
 * you were reading stays where it was as you move between elements.
 *
 * The chrome (header, footer) is built once per activation. Only the body is
 * rebuilt when the selection changes.
 */
(() => {
  const DT = (window.__designtool = window.__designtool || {});
  const { units, styles, spacingBox, prefs, overlay } = DT;

  const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const MOD_KEY = IS_MAC ? 'Cmd' : 'Ctrl';

  const STROKE =
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const ICONS = {
    moon: `<svg ${STROKE}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`,
    close: `<svg ${STROKE}><path d="M6 6l12 12M18 6L6 18"/></svg>`,
    sun:
      `<svg ${STROKE}><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2` +
      'M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>',
    // A window with the panel on one side; the filled strip is where it goes.
    dockLeft: `<svg ${STROKE}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="M6 8v8" stroke-width="2.6"/></svg>`,
    dockRight: `<svg ${STROKE}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/><path d="M18 8v8" stroke-width="2.6"/></svg>`,
  };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  async function writeClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Clipboard API needs a secure context and focus; fall back for http://.
      try {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }

  /**
   * Make any node click-to-copy with a brief confirmation flash.
   *
   * These were spans with a click handler, which put every value on the panel
   * out of reach of the keyboard. They are focusable and answer Enter and
   * Space now.
   */
  function copyable(node, text) {
    node.classList.add('copy');
    node.title = `Copy "${text}"`;
    node.tabIndex = 0;
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', `Copy ${text}`);
    const copy = async (event) => {
      event.stopPropagation();
      event.preventDefault();
      if (!(await writeClipboard(text))) return;
      node.classList.add('is-copied');
      setTimeout(() => node.classList.remove('is-copied'), 420);
    };
    node.addEventListener('click', copy);
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') copy(event);
    });
    return node;
  }

  // Which sections are folded, by title. Adopted from prefs on activation.
  let folds = {};

  /**
   * A section whose title folds it. Returns the node to append and the body
   * to fill; a section with no title is always open.
   */
  function section(title, { closed = false } = {}) {
    const node = el('section', title ? 'sec' : 'sec is-plain');
    const body = el('div', 'sec-body');
    if (title) {
      const open = title in folds ? !folds[title] : !closed;
      const head = el('button', 'sec-title', title);
      head.type = 'button';
      head.setAttribute('aria-expanded', String(open));
      body.hidden = !open;
      head.addEventListener('click', (event) => {
        event.stopPropagation();
        const next = body.hidden;
        body.hidden = !next;
        if (next) overlay.motion(body, 'unfold');
        head.setAttribute('aria-expanded', String(next));
        folds = { ...folds, [title]: !next };
        prefs.set('folds', folds);
      });
      node.appendChild(head);
    }
    node.appendChild(body);
    return { node, body };
  }

  function row(parent, label, value, { copy = true, swatch = null, token = null, wrap = false, tone = null } = {}) {
    if (value == null || value === '') return;
    const line = el('div', 'row');
    line.appendChild(el('dt', null, label));

    // With a token, the name is the answer and the raw value is the evidence,
    // so the name leads and the value drops to a second line. Both copy
    // independently: you paste the token into code, the value into Figma.
    if (token) {
      const dd = el('dd', 'has-token');
      const name = el('span', `token${token.exact ? '' : ' is-guess'}`, token.name);
      name.title = token.exact
        ? `Copy "var(${token.name})"`
        : `Matched by value${token.ambiguous ? ', more than one token shares it' : ''}. ` +
          `Copy "var(${token.name})"`;
      copyable(name, `var(${token.name})`);
      dd.appendChild(name);

      const raw = el('span', 'token-raw');
      if (swatch) {
        const chip = el('span', 'swatch');
        chip.style.background = swatch;
        raw.appendChild(chip);
      }
      raw.appendChild(document.createTextNode(String(value)));
      copyable(raw, String(value));
      dd.appendChild(raw);

      line.appendChild(dd);
      parent.appendChild(line);
      return;
    }

    // A value longer than the column, like a list of playback flags, is worth
    // two lines. Truncating it to "paused, autoplay, loop, m..." says less
    // than nothing.
    const classes = [
      /^#[0-9A-F]{3,8}$/i.test(String(value)) ? 'is-hex' : null,
      wrap ? 'is-wrap' : null,
      tone ? `is-${tone}` : null,
    ].filter(Boolean).join(' ');
    const dd = el('dd', classes || null);
    if (swatch) {
      const chip = el('span', 'swatch');
      chip.style.background = swatch;
      dd.appendChild(chip);
    }
    dd.appendChild(document.createTextNode(String(value)));
    if (copy) copyable(dd, String(value));
    line.appendChild(dd);
    parent.appendChild(line);
  }

  /** Ask the token map about one property, tolerating a page with no tokens. */
  function tokenFor(target, prop, computedValue) {
    try {
      return DT.tokens?.lookup(target, prop, computedValue) || null;
    } catch {
      // A page can have stylesheets that throw in ways worth surviving; a
      // missing token name is never worth losing the whole card over.
      return null;
    }
  }

  function identityLine(identity) {
    const line = el('div', 'identity');
    line.appendChild(el('span', 't-tag', identity.tag));
    if (identity.id) line.appendChild(el('span', 't-id', identity.id));
    if (identity.classes) line.appendChild(el('span', 't-class', identity.classes));
    if (identity.extraClasses) line.appendChild(el('span', 't-class', ` +${identity.extraClasses}`));
    return line;
  }

  function iconButton(className, icon, title, onClick) {
    const button = el('button', `icon-btn ${className}`);
    button.type = 'button';
    setIcon(button, icon, title);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
      onClick();
    });
    return button;
  }

  function setIcon(button, icon, title) {
    button.title = title;
    button.setAttribute('aria-label', title);
    // Static markup from the ICONS table above, never page content.
    button.innerHTML = icon;
  }

  function shortName(node) {
    const tag = node.tagName.toLowerCase();
    if (node.id) return `${tag}#${node.id}`;
    const first = typeof node.className === 'string' ? node.className.trim().split(/\s+/)[0] : '';
    return first ? `${tag}.${first}` : tag;
  }

  /**
   * What is selected, and where it sits in the tree.
   *
   * The trail is the DOM walk made visible: the last few ancestors, each one a
   * button that selects it. Alt + scroll still works, but nobody finds it.
   */
  function selection(data, state, onSelect) {
    const wrap = el('div', 'sel');
    const line = el('div', 'sel-line');
    const locked = state !== 'armed';
    line.appendChild(el('span', `mark${locked ? '' : ' is-hover'}`, locked ? 'A' : ''));
    line.appendChild(identityLine(data.identity));
    wrap.appendChild(line);

    const chain = [];
    const rootEl = data.el.ownerDocument.documentElement;
    for (let node = data.el; node && node !== rootEl; node = node.parentElement) {
      chain.unshift(node);
    }
    const shown = chain.slice(-4);
    const trail = el('div', 'crumbs');
    if (chain.length > shown.length) trail.appendChild(el('span', null, '…'));
    shown.forEach((node, index) => {
      if (index || chain.length > shown.length) trail.appendChild(el('span', null, '›'));
      const current = node === data.el;
      const crumb = el('button', `crumb${current ? ' is-current' : ''}`, shortName(node));
      crumb.type = 'button';
      if (current) {
        crumb.setAttribute('aria-current', 'true');
        crumb.tabIndex = -1;
      } else {
        crumb.title = `Select ${shortName(node)}`;
        crumb.addEventListener('click', (event) => {
          event.stopPropagation();
          onSelect(node);
        });
      }
      trail.appendChild(crumb);
    });
    wrap.appendChild(trail);
    return wrap;
  }

  /**
   * The values you are actually checking during QA, at a size you can read at a
   * glance. Which three depends on what the element is: for text it is the type
   * spec, for a container it is the box.
   */
  function heroTiles(data, fmt, measurement) {
    const type = data.typography;
    const tiles = [];

    // While measuring, the distance is the thing being checked, so it takes
    // the hero row. The element's own spec is already stated per element in
    // the A/B block below, and showing it here as well said it twice.
    if (measurement) {
      const single = measurement.values.length === 1;
      for (const value of measurement.values) {
        const token = tokenForLength(value.px);
        tiles.push([
          single ? measurement.note : value.label,
          fmt(value.px),
          token ? token.name : null,
          token ? 'is-token' : null,
        ]);
      }
      return buildHero(tiles, true);
    }

    if (type.hasText) {
      tiles.push(['Size', fmt(type.size)]);
      tiles.push(['Weight', String(type.weight), type.weightName]);
      tiles.push([
        'Line height',
        type.lineHeightPx ? fmt(type.lineHeightPx) : 'auto',
        type.lineHeightRatio ? `${round(type.lineHeightRatio)}x` : null,
      ]);
    } else {
      tiles.push(['Width', fmt(data.box.width)]);
      tiles.push(['Height', fmt(data.box.height)]);
      if (data.layout.isContainer) {
        const { rowGap, columnGap } = data.layout;
        tiles.push(['Gap', fmt(rowGap), rowGap === columnGap ? null : `/ ${fmt(columnGap)}`]);
      }
    }

    return buildHero(tiles);
  }

  /** Look up a bare length, tolerating a page with no tokens. */
  function tokenForLength(px) {
    try {
      return DT.tokens?.forLength(px) || null;
    } catch {
      return null;
    }
  }

  function buildHero(tiles, isMeasure) {
    const wrap = el('div', `hero is-${tiles.length}up${isMeasure ? ' is-measure' : ''}`);
    for (const [label, value, sub, subClass] of tiles) {
      // The unit rides after the number, small and dim, so the figure itself
      // is what the eye lands on.
      const [number, unit] = splitUnit(value);
      const tile = el('div', 'tile');

      tile.appendChild(el('span', 'tile-label', label));

      const line = el('span', 'tile-value', number);
      if (unit) line.appendChild(el('span', 'tile-unit', unit));
      if (sub) line.appendChild(el('span', `tile-sub${subClass ? ` ${subClass}` : ''}`, sub));
      tile.appendChild(line);

      copyable(tile, value);
      wrap.appendChild(tile);
    }
    return wrap;
  }

  /** "38.4px" -> ["38.4", "px"]. Anything unitless comes back as-is. */
  function splitUnit(value) {
    const match = /^(-?[\d.]+)([a-z%]*)$/i.exec(value);
    return match ? [match[1], match[2]] : [value, ''];
  }

  let handlers = null;
  let nodes = null;

  DT.card = {
    copyable,

    /** Adopt stored fold state. Call after prefs.load(). */
    adopt() {
      folds = prefs.get('folds') || {};
    },

    /**
     * Build the header and footer. Called once per activation.
     * @param {{onChange:Function, onClose:Function, onClear:Function, onSelect:Function}} h
     */
    mount(h) {
      handlers = h;
      const { head, foot } = overlay;
      head.textContent = '';
      foot.textContent = '';

      const brand = el('div', 'brand');
      brand.appendChild(el('span', 'brand-mark'));
      brand.appendChild(el('span', null, 'Design Tool'));
      head.appendChild(brand);

      const unitWrap = el('div', 'units');
      unitWrap.setAttribute('role', 'group');
      unitWrap.setAttribute('aria-label', 'Units');
      for (const mode of units.MODES) {
        const button = el('button', null, mode);
        button.type = 'button';
        button.dataset.unit = mode;
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          units.mode = mode;
          handlers.onChange();
        });
        unitWrap.appendChild(button);
      }
      head.appendChild(unitWrap);

      // While the panel sits on the page rather than beside it, whatever is
      // under it cannot be hovered. Flipping sides is the way to reach it.
      const side = iconButton('side', '', '', () => {
        const next = prefs.get('side') === 'left' ? 'right' : 'left';
        prefs.set('side', next);
        overlay.setSide(next, true);
        syncChrome();
      });
      const theme = iconButton('theme', '', '', () => {
        const next = prefs.get('theme') === 'light' ? 'dark' : 'light';
        prefs.set('theme', next);
        overlay.setTheme(next);
        syncChrome();
      });
      head.appendChild(side);
      head.appendChild(theme);
      head.appendChild(iconButton('close', ICONS.close, 'Close Design Tool', () => handlers.onClose()));

      const dot = el('span', 'status-dot');
      const text = el('span', 'status-text');
      text.setAttribute('role', 'status');
      const clear = el('button', 'btn clear', 'Clear');
      clear.type = 'button';
      clear.title = 'Clear the selection (Esc)';
      clear.addEventListener('click', (event) => {
        event.stopPropagation();
        handlers.onClear();
      });
      foot.appendChild(dot);
      foot.appendChild(text);
      foot.appendChild(clear);

      nodes = { unitWrap, side, theme, dot, text, clear };
      syncChrome();
    },

    /**
     * Rebuild the body and bring the chrome up to date.
     * @param {object|null} data DT.styles.read() result, or null with nothing
     *   under the cursor
     * @param {{measurement:object|null, pair:object|null, state:string,
     *          measuring:boolean, mode?:'loading'|'interact'|null,
     *          notice?:string|null}} opts
     */
    render(data, opts) {
      const body = overlay.body;
      body.textContent = '';
      syncChrome();
      setStatus(opts);

      // Why device sizes are missing, when they are. Said once, at the top.
      if (opts.notice) body.appendChild(el('p', 'notice', opts.notice));

      // The steps describe inspecting. They wait until that is what is happening.
      if (!prefs.get('onboarded') && opts.mode !== 'interact') body.appendChild(guide(opts.state, !!data));

      if (!data) {
        if (prefs.get('onboarded') || opts.mode === 'interact') {
          body.appendChild(
            el(
              'p',
              'empty',
              opts.mode === 'interact'
                ? 'You are using the page as normal. Switch to Inspect to read styles and measure.'
                : 'Hover anything on the page to read its styles.'
            )
          );
        }
        return;
      }

      const fmt = (px) => units.format(px, data.typography.size);
      const ctx = { fmt, copyable };

      // While measuring, the A and B rows under the distance say what is
      // selected, so the selection block would only say it twice.
      if (!opts.measurement) body.appendChild(selection(data, opts.state, handlers.onSelect));
      body.appendChild(heroTiles(data, fmt, opts.measurement));

      if (opts.measurement) {
        body.appendChild(measurementSection(opts.measurement, fmt, opts.pair));
      }

      if (data.media) body.appendChild(mediaSection(data.media, fmt));

      const type = data.typography;
      if (type.showsType) {
        const { node, body: sec } = section('Typography');
        row(sec, 'Font', type.family);
        // Size, weight and line height are in the hero tiles when this element
        // renders text of its own; repeating them here would say it twice.
        // While measuring the tiles carry the distance, so they come back.
        if (!type.hasText || opts.measurement) {
          row(sec, 'Size', fmt(type.size));
          row(sec, 'Weight', `${type.weightName} ${type.weight}`);
          row(
            sec,
            'Line height',
            type.lineHeightPx
              ? `${fmt(type.lineHeightPx)}${type.lineHeightRatio ? `  (${round(type.lineHeightRatio)}x)` : ''}`
              : 'normal'
          );
        }
        if (type.style !== 'normal') row(sec, 'Style', type.style);
        row(
          sec,
          'Letter spacing',
          type.letterSpacingIsNormal
            ? 'normal'
            : `${fmt(type.letterSpacingPx)}  (${round(type.letterSpacingPct)}%)`
        );
        if (type.transform !== 'none') row(sec, 'Transform', type.transform);
        if (type.decoration && type.decoration !== 'none') row(sec, 'Decoration', type.decoration);
        row(sec, 'Align', type.align);
        if (type.color) {
          row(sec, 'Color', type.color.hex, {
            swatch: type.color.css,
            token: tokenFor(data.el, 'color', type.color.css),
          });
        }
        body.appendChild(node);
      }

      const spacing = section('Spacing');
      spacing.body.appendChild(spacingBox.render(data, ctx));
      body.appendChild(spacing.node);

      const layout = data.layout;
      const { node: layoutNode, body: layoutSec } = section('Layout');
      row(layoutSec, 'Display', layout.display);
      if (layout.direction) row(layoutSec, 'Direction', layout.direction);
      if (layout.wrap && layout.wrap !== 'nowrap') row(layoutSec, 'Wrap', layout.wrap);
      if (layout.isContainer) {
        row(layoutSec, 'Align', layout.alignItems);
        row(layoutSec, 'Justify', layout.justifyContent);
      }
      if (layout.gridColumns && layout.gridColumns !== 'none') {
        row(layoutSec, 'Columns', layout.gridColumns);
      }
      if (layout.position !== 'static') row(layoutSec, 'Position', layout.position);
      if (layout.zIndex) row(layoutSec, 'z-index', layout.zIndex);
      body.appendChild(layoutNode);

      const fill = data.fill;
      const { node: fillNode, body: fillSec } = section('Fill & effects');
      let hasFill = false;
      if (fill.background) {
        row(fillSec, 'Background', fill.background.hex, {
          swatch: fill.background.css,
          token: tokenFor(data.el, 'background-color', fill.background.css),
        });
        hasFill = true;
      }
      if (fill.backgroundImage) {
        row(fillSec, 'Image', truncate(fill.backgroundImage, 40));
        hasFill = true;
      }
      if (fill.opacity < 1) {
        row(fillSec, 'Opacity', `${round(fill.opacity * 100)}%`);
        hasFill = true;
      }
      if (fill.borderStyle !== 'none' && fill.borderWidth.top > 0) {
        row(
          fillSec,
          'Border',
          `${fmt(fill.borderWidth.top)} ${fill.borderStyle}${fill.borderColor ? ` ${fill.borderColor.hex}` : ''}`,
          {
            swatch: fill.borderColor?.css,
            token: fill.borderColor
              ? tokenFor(data.el, 'border-color', fill.borderColor.css)
              : null,
          }
        );
        hasFill = true;
      }
      for (const [index, shadow] of fill.shadows.entries()) {
        const parts = [fmt(shadow.x), fmt(shadow.y), fmt(shadow.blur)];
        if (shadow.spread) parts.push(fmt(shadow.spread));
        const value = `${parts.join(' ')}${shadow.color ? ` ${shadow.color.hex}` : ''}${shadow.inset ? ' inset' : ''}`;
        row(fillSec, fill.shadows.length > 1 ? `Shadow ${index + 1}` : 'Shadow', value, {
          swatch: shadow.color?.css,
        });
        hasFill = true;
      }
      if (hasFill) body.appendChild(fillNode);

      body.appendChild(shortcuts());
    },
  };

  /** Header controls and anything else that reflects a preference. */
  function syncChrome() {
    if (!nodes) return;
    for (const button of nodes.unitWrap.children) {
      button.setAttribute('aria-pressed', String(units.mode === button.dataset.unit));
    }
    const left = prefs.get('side') === 'left';
    setIcon(nodes.side, left ? ICONS.dockRight : ICONS.dockLeft, left ? 'Dock to the right' : 'Dock to the left');
    const light = prefs.get('theme') === 'light';
    setIcon(nodes.theme, light ? ICONS.moon : ICONS.sun, light ? 'Switch to dark' : 'Switch to light');
  }

  /** What the next click does. Lives in the footer, where it never moves. */
  function setStatus({ state, measuring, mode }) {
    const { dot, text, clear } = nodes;
    const key = mode || (state === 'lockedA' && measuring ? 'measuring' : state);
    dot.className = `status-dot is-${key}`;
    text.textContent = '';
    if (key === 'lockedA') {
      text.append('Hold ', el('kbd', null, MOD_KEY), ' and hover another element to measure.');
    } else if (key === 'measuring') {
      text.append('Click to keep this measurement.');
    } else if (key === 'loading') {
      text.append('Loading the page into the stage.');
    } else if (key === 'interact') {
      text.append('Interact mode. Switch to Inspect to read styles.');
    } else if (key === 'lockedAB') {
      text.append('Measurement kept. Click any element to start again.');
    } else {
      text.append('Click an element to lock it.');
    }
    clear.hidden = state === 'armed' || !!mode;
  }

  /**
   * The whole model in three lines, with the step you are on marked.
   *
   * Shown from the first frame until the first measurement is kept, or until
   * it is dismissed. The tool used to show nothing at all until the first
   * hover, so a new user had no sign it was on, let alone what to do.
   */
  function guide(state, hasTarget) {
    const wrap = el('div', 'guide');
    wrap.appendChild(el('div', 'guide-title', 'How it works'));
    wrap.appendChild(
      iconButton('guide-close', ICONS.close, 'Hide these steps', () => {
        prefs.set('onboarded', true);
        handlers.onChange();
      })
    );
    const now = state === 'armed' ? (hasTarget ? 1 : 0) : 2;
    const steps = [
      [['Hover'], ' anything on the page to read its styles.', 0],
      [['Click'], ' to lock it as A.', 1],
      [['Hold ', MOD_KEY], ' and hover another element to see the gap. Click to keep it.', 2],
    ];
    const list = el('ol');
    for (const [lead, rest, index] of steps) {
      const item = el('li', index === now ? 'is-now' : null);
      item.appendChild(el('span', 'guide-n', String(index + 1)));
      const copy = el('span');
      const strong = el('b');
      strong.append(lead[0]);
      if (lead[1]) strong.append(el('kbd', null, lead[1]));
      copy.append(strong, rest);
      item.appendChild(copy);
      list.appendChild(item);
    }
    wrap.appendChild(list);
    return wrap;
  }

  function measurementSection(measurement, _fmt, pair) {
    const multi = measurement.values.length > 1;
    const { node, body } = section(null);

    // A single gap is named by its tile. Four insets are named here, because
    // there the tiles are edges and the kind is not stated anywhere else.
    if (multi) body.appendChild(el('p', 'mlead-kind', measurement.note));
    if (pair?.a && pair?.b) body.appendChild(pairSummary(pair));
    return node;
  }

  /**
   * What the two measured elements actually are.
   *
   * The distance on its own is half an answer: "24px between what?" is the next
   * question every time, and scrubbing back and forth between A and B to read
   * each one's spec is how the measurement gets lost. Both specs sit under the
   * number instead, in the same A/B colours as the on-page highlights.
   */
  function pairSummary(pair) {
    const wrap = el('div', 'pair');
    for (const [key, data] of [['a', pair.a], ['b', pair.b]]) {
      const col = el('div', `pair-col is-${key}`);

      const head = el('div', 'pair-head');
      head.appendChild(el('span', `mark is-${key}`, key.toUpperCase()));
      head.appendChild(el('span', 'pair-name', shortIdentity(data.identity)));
      col.appendChild(head);

      // Same rule as the hero values: text is identified by its type, anything
      // else by its box. One fact, on the same line as the name: the full
      // spec of either element is a click away, and stating it here as well
      // made the measurement the longest thing on the panel.
      const fmt = (px) => units.format(px, data.typography.size);
      const plain = (px) => String(Math.round(px * 100) / 100);
      const summary = data.typography.hasText
        ? `${fmt(data.typography.size)} · ${data.typography.weight}`
        : units.mode === 'px'
          ? `${plain(data.box.width)} × ${plain(data.box.height)}`
          : `${fmt(data.box.width)} × ${fmt(data.box.height)}`;
      const sum = el('span', 'pair-sum', summary);
      copyable(sum, summary);
      head.appendChild(sum);

      wrap.appendChild(col);
    }
    return wrap;
  }

  function shortIdentity(identity) {
    return `${identity.tag}${identity.id}${identity.classes}`;
  }

  // Ratios a designer names out loud. Anything close enough to one of these
  // reads better as "16:9" than as the honest "1.78:1".
  const NAMED_RATIOS = [
    [1, 1], [4, 3], [3, 4], [3, 2], [2, 3], [16, 9], [9, 16],
    [16, 10], [5, 4], [21, 9], [2, 1], [1, 2], [7, 5], [5, 3],
  ];

  /** Greatest common divisor, for reducing a ratio nobody has a name for. */
  function gcd(a, b) {
    return b < 1 ? a : gcd(b, a % b);
  }

  /**
   * "1920 x 1080" -> "16:9".
   *
   * Real boxes are rarely exact: a 1200x675 hero is 16:9, and so is one that
   * came out 1199.5 wide after a flex division. A 0.5% tolerance covers
   * subpixel layout without letting genuinely different ratios collapse
   * together.
   */
  function ratioLabel(width, height) {
    if (!(width > 0) || !(height > 0)) return null;
    const value = width / height;

    for (const [w, h] of NAMED_RATIOS) {
      if (Math.abs(value - w / h) / (w / h) < 0.005) return `${w}:${h}`;
    }

    // Integer pixel sizes usually reduce to something readable.
    const w = Math.round(width);
    const h = Math.round(height);
    const divisor = gcd(Math.max(w, h), Math.min(w, h));
    if (divisor > 1) {
      const rw = w / divisor;
      const rh = h / divisor;
      if (rw <= 40 && rh <= 40) return `${rw}:${rh}`;
    }
    return `${round(value)}:1`;
  }

  /** What a rendered box does to an asset of a different shape. */
  function fitNote(fit) {
    if (fit === 'cover') return 'cropped to fit';
    if (fit === 'contain') return 'letterboxed';
    if (fit === 'scale-down') return 'letterboxed';
    if (fit === 'none') return 'clipped';
    return 'stretched';
  }

  /**
   * Media, stated the way you would ask about it.
   *
   * Format first, because "is this still a 2MB PNG" is the question. Then the
   * asset's own size against the size it is drawn at, since a 3x asset in a 1x
   * slot and a blurry 0.5x one are both bugs and neither is visible in the DOM.
   */
  function mediaSection(media, fmt) {
    const { node, body: sec } = section('Media');

    const head = el('div', 'media-head');
    head.appendChild(el('span', 'media-kind', media.kind));
    if (media.format) {
      const chip = el('span', 'media-format', media.format);
      copyable(chip, media.format);
      head.appendChild(chip);
    }
    sec.appendChild(head);

    if (media.source) row(sec, 'File', truncate(media.source, 30));

    if (media.natural && media.natural.width > 0) {
      row(sec, 'Intrinsic', `${Math.round(media.natural.width)} x ${Math.round(media.natural.height)}`);
    }
    if (media.rendered && media.rendered.width > 0) {
      row(sec, 'Rendered', `${fmt(media.rendered.width)} x ${fmt(media.rendered.height)}`);

      // The ratio of the box on screen, which is the one being checked against
      // the design.
      const shown = ratioLabel(media.rendered.width, media.rendered.height);
      if (shown) row(sec, 'Ratio', shown);

      // When the asset's own ratio differs, the box is doing something to it,
      // and which something depends on object-fit. This is the check: a 4:3
      // photo in a 16:9 slot is either a deliberate crop or a bug, and the
      // page never says which.
      const source = media.natural && media.natural.width > 0
        ? ratioLabel(media.natural.width, media.natural.height)
        : null;
      if (source && source !== shown) {
        row(sec, 'Asset ratio', `${source}, ${fitNote(media.fitRaw)}`, { wrap: true });
      }
    }
    if (media.density) {
      // Under 1x is upscaling, which is the one that actually looks broken.
      const label = media.density < 0.95 ? ' upscaled' : media.density >= 1.9 ? ' retina' : '';
      row(sec, 'Asset scale', `${round(media.density)}x${label}`, {
        copy: false,
        tone: media.density < 0.95 ? 'warn' : null,
      });
    }

    if (media.duration != null) row(sec, 'Duration', `${round(media.duration)}s`);
    if (media.kind && media.kind.startsWith('Video')) {
      const flags = [];
      if (media.autoplay) flags.push('autoplay');
      if (media.loop) flags.push('loop');
      if (media.muted) flags.push('muted');
      if (media.controls) flags.push('controls');
      row(sec, 'Playback', `${media.playing ? 'playing' : 'paused'}${flags.length ? `, ${flags.join(', ')}` : ''}`, {
        copy: false,
        wrap: true,
      });
      if (media.poster) row(sec, 'Poster', truncate(media.poster, 24));
    }

    if (media.fit) row(sec, 'Fit', media.fit, { copy: false });
    if (media.responsive) row(sec, 'Responsive', 'srcset', { copy: false });
    if (media.lazy) row(sec, 'Loading', 'lazy', { copy: false });
    if (media.kind === 'Image' || media.kind === 'Image (picture)') {
      row(sec, 'Alt text', media.hasAlt ? media.alt || 'empty (decorative)' : 'missing', {
        copy: false,
        wrap: true,
        tone: media.hasAlt ? null : 'danger',
      });
    }

    return node;
  }

  const SHORTCUTS = [
    [['Click'], 'Lock an element as A'],
    [[MOD_KEY, 'hover'], 'With A locked: show the gap'],
    [[MOD_KEY, 'Click'], 'Keep the measurement'],
    [[MOD_KEY, 'hover'], 'Nothing locked: select through overlays'],
    [['Alt', 'scroll'], 'Walk the DOM tree'],
    [['U'], 'Cycle px / rem / em'],
    [['Esc'], 'Clear the selection'],
  ];

  /** Reference material, folded by default: learned once, then in the way. */
  function shortcuts() {
    const { node, body } = section('Shortcuts', { closed: true });
    const list = el('div', 'sc');
    for (const [keys, meaning] of SHORTCUTS) {
      const line = el('div', 'sc-row');
      const chips = el('div', 'sc-keys');
      keys.forEach((key, index) => {
        if (index) chips.appendChild(el('span', 'sc-plus', '+'));
        chips.appendChild(el('kbd', null, key));
      });
      line.appendChild(chips);
      line.appendChild(el('div', 'sc-meaning', meaning));
      list.appendChild(line);
    }
    body.appendChild(list);
    return node;
  }

  function round(n) {
    return Math.round(n * 100) / 100;
  }

  function truncate(text, max) {
    return text.length > max ? `${text.slice(0, max - 1)}...` : text;
  }
})();
