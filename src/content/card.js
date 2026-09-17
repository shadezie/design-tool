/**
 * The inspection card.
 *
 * Ordered the way a designer reads a spec: what am I looking at, what is the
 * type, how is it spaced, how is it laid out, what is it filled with. Sections
 * with nothing to say are omitted rather than shown empty, so the card stays
 * short on simple elements.
 */
(() => {
  const DT = (window.__designtool = window.__designtool || {});
  const { units, styles, spacingBox, prefs, overlay } = DT;

  const MARGIN = 14;
  const CARD_WIDTH = 330;

  const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const DEEP_KEY = IS_MAC ? 'Cmd' : 'Ctrl';

  const ICONS = {
    grip:
      '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
      '<circle cx="6" cy="3" r="1.35"/><circle cx="10" cy="3" r="1.35"/>' +
      '<circle cx="6" cy="8" r="1.35"/><circle cx="10" cy="8" r="1.35"/>' +
      '<circle cx="6" cy="13" r="1.35"/><circle cx="10" cy="13" r="1.35"/></svg>',
    moon:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
      'stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    sun:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2' +
      'M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>',
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

  /** Make any node click-to-copy with a brief confirmation flash. */
  function copyable(node, text) {
    node.classList.add('copy');
    node.title = `Copy "${text}"`;
    node.addEventListener('click', async (event) => {
      event.stopPropagation();
      event.preventDefault();
      if (!(await writeClipboard(text))) return;
      node.classList.add('is-copied');
      setTimeout(() => node.classList.remove('is-copied'), 420);
    });
    return node;
  }

  function section(title) {
    const node = el('section', 'sec');
    if (title) node.appendChild(el('h2', 'sec-title', title));
    return node;
  }

  function row(parent, label, value, { copy = true, swatch = null, token = null, wrap = false } = {}) {
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
    const line = el('div', 'card-title');
    line.appendChild(el('span', 't-tag', identity.tag));
    if (identity.id) line.appendChild(el('span', 't-id', identity.id));
    if (identity.classes) line.appendChild(el('span', 't-class', identity.classes));
    if (identity.extraClasses) line.appendChild(el('span', 't-class', ` +${identity.extraClasses}`));
    return line;
  }

  function iconButton(className, icon, title, onClick) {
    const button = el('button', `icon-btn ${className}`);
    button.type = 'button';
    button.title = title;
    button.setAttribute('aria-label', title);
    // Static markup from the ICONS table above, never page content.
    button.innerHTML = icon;
    if (onClick) {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();
        onClick();
      });
    }
    return button;
  }

  function themeToggle(onChange) {
    const light = prefs.get('theme') === 'light';
    return iconButton(
      'theme',
      light ? ICONS.moon : ICONS.sun,
      light ? 'Switch to dark' : 'Switch to light',
      () => {
        const next = prefs.get('theme') === 'light' ? 'dark' : 'light';
        prefs.set('theme', next);
        overlay.setTheme(next);
        onChange();
      }
    );
  }

  function unitToggle(onChange) {
    const wrap = el('div', 'units');
    for (const mode of units.MODES) {
      const button = el('button', null, mode);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(units.mode === mode));
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        units.mode = mode;
        onChange();
      });
      wrap.appendChild(button);
    }
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
      return buildHero(tiles);
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

  function buildHero(tiles) {
    const wrap = el('div', `hero is-${tiles.length}up`);
    for (const [label, value, sub, subClass] of tiles) {
      // The unit moves into the label so the number itself gets the width. It
      // is the same unit for every tile anyway, and a truncated "123.…" is
      // worse than useless during QA.
      const [number, unit] = splitUnit(value);
      const tile = el('div', 'tile');

      const caption = el('span', 'tile-label', label);
      if (unit) caption.appendChild(el('span', 'tile-unit', unit));
      tile.appendChild(caption);

      const line = el('span', 'tile-value', number);
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

  DT.card = {
    copyable,

    /**
     * Rebuild the card contents.
     * @param {HTMLElement} card the card element from the overlay
     * @param {object} data DT.styles.read() result
     * @param {object} opts { measurement, state, onUnitChange }
     */
    render(card, data, opts) {
      const fmt = (px) => units.format(px, data.typography.size);
      const ctx = { fmt, copyable };

      card.textContent = '';

      const head = el('div', 'card-head');
      head.appendChild(dragGrip(card, opts.onUnitChange));
      head.appendChild(identityLine(data.identity));
      head.appendChild(themeToggle(opts.onUnitChange));
      head.appendChild(unitToggle(opts.onUnitChange));
      head.appendChild(iconButton('close', ICONS.close, 'Stop Design Tool (Esc)', opts.onClose));
      card.appendChild(head);

      card.classList.toggle('is-pinned', !!pin);

      card.appendChild(heroTiles(data, fmt, opts.measurement));

      if (data.media) card.appendChild(mediaSection(data.media, fmt));

      if (opts.measurement) {
        card.appendChild(measurementSection(opts.measurement, fmt, opts.pair));
      }

      const type = data.typography;
      if (type.showsType) {
        const sec = section('Typography');
        row(sec, 'Font', type.family);
        // Size, weight and line height are in the hero tiles when this element
        // renders text of its own; repeating them here would say it twice.
        if (!type.hasText) {
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
        card.appendChild(sec);
      }

      const spacing = section('Spacing');
      spacing.appendChild(spacingBox.render(data, ctx));
      card.appendChild(spacing);

      const layout = data.layout;
      const layoutSec = section('Layout');
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
      card.appendChild(layoutSec);

      const fill = data.fill;
      const fillSec = section('Fill & effects');
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
      if (hasFill) card.appendChild(fillSec);

      card.appendChild(shortcuts(opts.state));
    },
  };

  function measurementSection(measurement, _fmt, pair) {
    const sec = section('Measurement');

    // The numbers are in the hero row above. What is left to say is which two
    // elements they span, and for the multi-value cases, what kind of
    // measurement it is, since the tile labels alone do not carry that.
    if (measurement.values.length > 1) {
      sec.appendChild(el('p', 'mlead-kind', measurement.note));
    }

    if (pair?.a && pair?.b) sec.appendChild(pairSummary(pair));
    return sec;
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
      head.appendChild(el('span', `pair-badge is-${key}`, key.toUpperCase()));
      head.appendChild(el('span', 'pair-name', shortIdentity(data.identity)));
      col.appendChild(head);

      // Same rule as the hero tiles: text gets its type spec, anything else
      // gets its box, because that is what you are comparing in each case.
      const fmt = (px) => units.format(px, data.typography.size);
      const facts = data.typography.hasText
        ? [
            ['Size', fmt(data.typography.size)],
            ['Weight', `${data.typography.weight} ${data.typography.weightName}`],
            [
              'Line',
              data.typography.lineHeightPx ? fmt(data.typography.lineHeightPx) : 'auto',
            ],
          ]
        : [
            ['W', fmt(data.box.width)],
            ['H', fmt(data.box.height)],
            ...(data.layout.isContainer ? [['Gap', fmt(data.layout.rowGap)]] : []),
          ];

      // Stacked full-width, so the facts run inline rather than as one
      // key-value row each: a card-wide row with two words in it is mostly
      // empty space, and stacking cost us the vertical room to waste.
      const list = el('div', 'pair-facts');
      for (const [label, value] of facts) {
        const fact = el('span', 'pair-fact');
        fact.appendChild(el('span', 'pair-key', label));
        const val = el('span', 'pair-val', value);
        copyable(val, value);
        fact.appendChild(val);
        list.appendChild(fact);
      }

      if (data.media) {
        const fact = el('span', 'pair-fact');
        fact.appendChild(el('span', 'pair-key', 'Media'));
        fact.appendChild(el('span', 'pair-val', data.media.format || data.media.kind));
        list.appendChild(fact);
      }
      col.appendChild(list);

      wrap.appendChild(col);
    }
    return wrap;
  }

  function shortIdentity(identity) {
    return `${identity.tag}${identity.id}${identity.classes}`;
  }

  /**
   * Media, stated the way you would ask about it.
   *
   * Format first, because "is this still a 2MB PNG" is the question. Then the
   * asset's own size against the size it is drawn at, since a 3x asset in a 1x
   * slot and a blurry 0.5x one are both bugs and neither is visible in the DOM.
   */
  function mediaSection(media, fmt) {
    const sec = section('Media');

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
    }
    if (media.density) {
      // Under 1x is upscaling, which is the one that actually looks broken.
      const label = media.density < 0.95 ? ' upscaled' : media.density >= 1.9 ? ' retina' : '';
      row(sec, 'Asset scale', `${round(media.density)}x${label}`, { copy: false });
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
      });
    }

    return sec;
  }

  const STATE_LINE = {
    armed: 'Click an element to lock it.',
    lockedA: 'Hover a second element to measure. Click to freeze it.',
    lockedAB: 'Click anywhere to start a new measurement.',
  };

  const SHORTCUTS = [
    [['Click'], 'Lock an element'],
    [['Click', 'Click'], 'Measure between two'],
    [[DEEP_KEY, 'hover'], 'Select through overlays'],
    [['Alt', 'scroll'], 'Walk the DOM tree'],
    [['U'], 'Cycle px / rem / em'],
    [['Esc'], 'Clear, then exit'],
  ];

  /**
   * The shortcuts were a paragraph of prose at the bottom of the card, which
   * nobody reads. As a keys-and-meaning table they are scannable, and the tool
   * teaches itself while you use it.
   */
  function shortcuts(state) {
    const sec = section('Shortcuts');

    const status = el('p', 'state-line', STATE_LINE[state] || STATE_LINE.armed);
    sec.appendChild(status);

    const list = el('div', 'sc');
    for (const [keys, meaning] of SHORTCUTS) {
      const row = el('div', 'sc-row');
      const chips = el('div', 'sc-keys');
      keys.forEach((key, index) => {
        if (index) chips.appendChild(el('span', 'sc-plus', key === 'Click' ? '' : '+'));
        chips.appendChild(el('kbd', null, key));
      });
      row.appendChild(chips);
      row.appendChild(el('div', 'sc-meaning', meaning));
      list.appendChild(row);
    }
    sec.appendChild(list);
    return sec;
  }

  function round(n) {
    return Math.round(n * 100) / 100;
  }

  function truncate(text, max) {
    return text.length > max ? `${text.slice(0, max - 1)}...` : text;
  }

  // Positioning.
  //
  // The card sits in the top-right corner and stays there. Earlier versions
  // chose a corner from the inspected element and re-chose it as you moved,
  // which meant the card wandered across the screen while you were just
  // hovering. One fixed home is calmer and easier to build a habit around.
  //
  // Dragging the grip pins it wherever you put it, and a pinned card never
  // moves on its own. Double-click the grip to send it home.

  let pin = null;
  let drag = null;

  /** Keep at least a corner of the card on screen whatever the viewport does. */
  function clamp(left, top, width, height) {
    return {
      left: Math.max(4, Math.min(left, window.innerWidth - width - 4)),
      top: Math.max(4, Math.min(top, window.innerHeight - Math.min(height, 120) - 4)),
    };
  }

  /**
   * The grip: drag to place the card anywhere, double-click to send it back to
   * the top-right corner. On a wide screen there is usually dead space that
   * beats any corner the tool could pick.
   *
   * Drag state uses pointer capture rather than window listeners. The capture
   * phase suppressor in inspect.js runs before anything registered later on the
   * same target, and it calls stopImmediatePropagation(), so a release that
   * landed on the page used to be swallowed and the card stayed glued to the
   * cursor. Captured pointer events retarget to the grip, which the suppressor
   * recognises as our own UI and leaves alone.
   */
  function dragGrip(card, onChange) {
    const grip = iconButton(
      'grip',
      ICONS.grip,
      pin ? 'Drag to move, double-click to send it home' : 'Drag to place the card'
    );
    let from = null;

    grip.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = card.getBoundingClientRect();
      from = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
      capture(grip, event.pointerId);
      overlay.dragging = true;
    });

    grip.addEventListener('pointermove', (event) => {
      if (!from) return;
      event.preventDefault();
      const rect = card.getBoundingClientRect();
      pin = clamp(event.clientX - from.dx, event.clientY - from.dy, rect.width, rect.height);
    });

    // pointerup covers the normal case; lostpointercapture and pointercancel
    // cover releasing outside the window, which never delivers a pointerup.
    const end = () => {
      if (!from) return;
      from = null;
      overlay.dragging = false;
      if (pin) prefs.set('pin', pin);
      onChange();
    };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
    grip.addEventListener('lostpointercapture', end);

    grip.addEventListener('dblclick', (event) => {
      event.preventDefault();
      event.stopPropagation();
      pin = null;
      prefs.set('pin', null);
      onChange();
    });

    return grip;
  }

  function capture(node, pointerId) {
    try {
      node.setPointerCapture(pointerId);
    } catch {
      // Pointer already released, or an environment without capture support.
      // The drag still works, it just cannot follow the cursor off the window.
    }
  }

  /**
   * Wire the resize handle. Called once per activation, since the handle lives
   * in the overlay rather than in the card's re-rendered contents.
   *
   * The limits are read from the stylesheet rather than repeated here: a JS
   * maximum wider than the CSS one silently ignores the last stretch of the
   * drag and persists a width the card will never render.
   */
  DT.card.attachResizer = function attachResizer(handle, card) {
    let from = null;

    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = card.getBoundingClientRect();
      const cs = getComputedStyle(card);
      from = {
        x: event.clientX,
        y: event.clientY,
        width: rect.width,
        height: rect.height,
        minWidth: parseFloat(cs.minWidth) || 260,
        maxWidth: parseFloat(cs.maxWidth) || 640,
        minHeight: parseFloat(cs.minHeight) || 160,
      };
      capture(handle, event.pointerId);
      overlay.dragging = true;
    });

    handle.addEventListener('pointermove', (event) => {
      if (!from) return;
      event.preventDefault();
      const width = clampRange(
        from.width + (event.clientX - from.x),
        from.minWidth,
        from.maxWidth
      );
      const height = Math.max(from.minHeight, from.height + (event.clientY - from.y));
      card.style.width = `${Math.round(width)}px`;
      card.style.height = `${Math.round(height)}px`;
    });

    const end = () => {
      if (!from) return;
      from = null;
      overlay.dragging = false;
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    handle.addEventListener('lostpointercapture', end);
  };

  function clampRange(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  /** Adopt the stored pin. Call after prefs.load(). */
  DT.card.adopt = function adopt() {
    pin = prefs.get('pin');
  };

  /** @param {HTMLElement} card */
  DT.card.position = function position(card) {
    const rect = card.getBoundingClientRect();
    const width = rect.width || CARD_WIDTH;
    if (pin) return clamp(pin.left, pin.top, width, rect.height);
    return { left: window.innerWidth - width - MARGIN, top: MARGIN };
  };
})();
