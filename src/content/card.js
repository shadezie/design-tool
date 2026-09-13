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

  function row(parent, label, value, { copy = true, swatch = null } = {}) {
    if (value == null || value === '') return;
    const wrap = el('div', 'row');
    wrap.appendChild(el('dt', null, label));
    const dd = el('dd', /^#[0-9A-F]{3,8}$/i.test(String(value)) ? 'is-hex' : null);
    if (swatch) {
      const chip = el('span', 'swatch');
      chip.style.background = swatch;
      dd.appendChild(chip);
    }
    dd.appendChild(document.createTextNode(String(value)));
    if (copy) copyable(dd, String(value));
    wrap.appendChild(dd);
    parent.appendChild(wrap);
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
  function heroTiles(data, fmt) {
    const type = data.typography;
    const tiles = [];

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

    const wrap = el('div', `hero is-${tiles.length}up`);
    for (const [label, value, sub] of tiles) {
      // The unit moves into the label so the number itself gets the width. It
      // is the same unit for every tile anyway, and a truncated "123.…" is
      // worse than useless during QA.
      const [number, unit] = splitUnit(value);
      const tile = el('div', 'tile');

      const caption = el('span', 'tile-label', label);
      if (unit) caption.appendChild(el('span', 'tile-unit', unit));
      tile.appendChild(caption);

      const line = el('span', 'tile-value', number);
      if (sub) line.appendChild(el('span', 'tile-sub', sub));
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

      card.appendChild(heroTiles(data, fmt));

      if (opts.measurement) card.appendChild(measurementSection(opts.measurement, fmt));

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
        if (type.color) row(sec, 'Color', type.color.hex, { swatch: type.color.css });
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
        row(fillSec, 'Background', fill.background.hex, { swatch: fill.background.css });
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
          { swatch: fill.borderColor?.css }
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

  function measurementSection(measurement, fmt) {
    const sec = section('Measurement');
    sec.appendChild(el('p', 'mkind', measurement.note));
    for (const value of measurement.values) {
      const wrap = el('div', 'row');
      wrap.appendChild(el('dt', null, value.label));
      const dd = el('dd', 'mval', fmt(value.px));
      copyable(dd, fmt(value.px));
      wrap.appendChild(dd);
      sec.appendChild(wrap);
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
   */
  function dragGrip(card, onChange) {
    const grip = iconButton(
      'grip',
      ICONS.grip,
      pin ? 'Drag to move, double-click to send it home' : 'Drag to place the card'
    );

    grip.addEventListener('mousedown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = card.getBoundingClientRect();
      drag = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
      overlay.dragging = true;
      window.addEventListener('mousemove', onDrag, true);
      window.addEventListener('mouseup', endDrag, true);
    });

    grip.addEventListener('dblclick', (event) => {
      event.preventDefault();
      event.stopPropagation();
      pin = null;
      prefs.set('pin', null);
      onChange();
    });

    function onDrag(event) {
      if (!drag) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = card.getBoundingClientRect();
      pin = clamp(event.clientX - drag.dx, event.clientY - drag.dy, rect.width, rect.height);
    }

    function endDrag(event) {
      event.stopPropagation();
      drag = null;
      overlay.dragging = false;
      window.removeEventListener('mousemove', onDrag, true);
      window.removeEventListener('mouseup', endDrag, true);
      if (pin) prefs.set('pin', pin);
      onChange();
    }

    return grip;
  }

  const MIN_W = 260;
  const MAX_W = 680;
  const MIN_H = 160;

  /**
   * Wire the resize handle. Called once per activation, since the handle lives
   * in the overlay rather than in the card's re-rendered contents.
   */
  DT.card.attachResizer = function attachResizer(handle, card) {
    let from = null;

    handle.addEventListener('mousedown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = card.getBoundingClientRect();
      from = { x: event.clientX, y: event.clientY, width: rect.width, height: rect.height };
      overlay.dragging = true;
      window.addEventListener('mousemove', onResize, true);
      window.addEventListener('mouseup', endResize, true);
    });

    function onResize(event) {
      if (!from) return;
      event.preventDefault();
      event.stopPropagation();
      const width = clampRange(from.width + (event.clientX - from.x), MIN_W, MAX_W);
      const height = Math.max(MIN_H, from.height + (event.clientY - from.y));
      card.style.width = `${Math.round(width)}px`;
      card.style.height = `${Math.round(height)}px`;
    }

    function endResize(event) {
      event.stopPropagation();
      from = null;
      overlay.dragging = false;
      window.removeEventListener('mousemove', onResize, true);
      window.removeEventListener('mouseup', endResize, true);
    }
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
