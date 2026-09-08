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
  const { units, styles, spacingBox } = DT;

  const MARGIN = 14;
  const CARD_WIDTH = 330;

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
    const dd = el('dd');
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
      head.appendChild(identityLine(data.identity));
      head.appendChild(unitToggle(opts.onUnitChange));
      card.appendChild(head);

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

      card.appendChild(hint(opts.state));
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

  function hint(state) {
    const node = el('div', 'hint');
    const parts = {
      armed: 'Click an element to lock it, then hover or click a second one to measure.',
      lockedA: 'Hover to preview the gap. Click to freeze the measurement.',
      lockedAB: 'Click anywhere to start over.',
    };
    node.appendChild(document.createTextNode(parts[state] || parts.armed));
    node.appendChild(document.createTextNode(' '));
    const alt = el('kbd', null, 'Alt');
    const scroll = el('kbd', null, 'scroll');
    node.appendChild(alt);
    node.appendChild(document.createTextNode(' + '));
    node.appendChild(scroll);
    node.appendChild(document.createTextNode(' walks the DOM, '));
    node.appendChild(el('kbd', null, 'U'));
    node.appendChild(document.createTextNode(' cycles units, '));
    node.appendChild(el('kbd', null, 'Esc'));
    node.appendChild(document.createTextNode(' exits.'));
    return node;
  }

  function round(n) {
    return Math.round(n * 100) / 100;
  }

  function truncate(text, max) {
    return text.length > max ? `${text.slice(0, max - 1)}...` : text;
  }

  // The card is always docked to a top corner, never anchored to the cursor.
  //
  // Two earlier rules both made it unreachable: following the cursor at a fixed
  // offset means the pointer is never inside it, and flipping corners when the
  // cursor approached meant it jumped away as you reached for it. So the corner
  // is chosen from the inspected ELEMENT (stable while you move the mouse), and
  // the card freezes outright once the pointer comes near it.
  const APPROACH = 48; // freeze the card when the cursor gets this close
  const RELEASE = 160; // and let it move again only once the cursor is this far

  let dockedLeft = false;
  let frozen = false;

  /** Shortest distance from a point to a rect, 0 when inside. */
  function distanceTo(rect, point) {
    const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
    const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
    return Math.hypot(dx, dy);
  }

  /**
   * @param {HTMLElement} card
   * @param {DOMRect|null} subjectRect rect of the element being inspected
   * @param {{x:number,y:number}} cursor
   */
  DT.card.position = function position(card, subjectRect, cursor) {
    const rect = card.getBoundingClientRect();
    const width = rect.width || CARD_WIDTH;
    const vw = window.innerWidth;

    const distance = rect.width ? distanceTo(rect, cursor) : Infinity;
    if (distance <= APPROACH) frozen = true;
    else if (distance > RELEASE) frozen = false;

    if (!frozen && subjectRect) {
      // Sit on the side away from whatever is being inspected.
      const subjectCentre = (subjectRect.left + subjectRect.right) / 2;
      dockedLeft = subjectCentre > vw / 2;
    }

    return { left: dockedLeft ? MARGIN : vw - width - MARGIN, top: MARGIN };
  };
})();
