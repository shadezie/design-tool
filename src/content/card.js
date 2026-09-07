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
  const CARD_WIDTH = 300;

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

      if (opts.measurement) card.appendChild(measurementSection(opts.measurement, fmt));

      const type = data.typography;
      if (type.hasText || type.family) {
        const sec = section('Typography');
        row(sec, 'Font', type.family);
        row(sec, 'Size', fmt(type.size));
        row(sec, 'Weight', `${type.weightName} ${type.weight}`);
        if (type.style !== 'normal') row(sec, 'Style', type.style);
        row(
          sec,
          'Line height',
          type.lineHeightPx
            ? `${fmt(type.lineHeightPx)}${type.lineHeightRatio ? `  (${round(type.lineHeightRatio)}x)` : ''}`
            : 'normal'
        );
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
    node.appendChild(document.createTextNode(' walks the DOM. '));
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

  // While hovering, the card behaves like a tooltip and follows the cursor.
  // Once an element is locked, it docks to a top corner instead: a card sitting
  // next to element A would cover exactly the element you want to measure
  // against. The corner only flips when the cursor gets close, so it does not
  // jump around while you work.
  let dockedLeft = false;

  DT.card.position = function position(card, docked, cursor) {
    const rect = card.getBoundingClientRect();
    const width = rect.width || CARD_WIDTH;
    const height = rect.height || 200;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (docked) {
      if (dockedLeft && cursor.x < width + MARGIN * 3) dockedLeft = false;
      else if (!dockedLeft && cursor.x > vw - width - MARGIN * 3) dockedLeft = true;
      return { left: dockedLeft ? MARGIN : vw - width - MARGIN, top: MARGIN };
    }

    let left = cursor.x + MARGIN;
    let top = cursor.y + MARGIN;
    if (left + width > vw - 4) left = cursor.x - width - MARGIN;
    if (top + height > vh - 4) top = Math.max(4, cursor.y - height - MARGIN);
    left = Math.max(4, Math.min(left, vw - width - 4));
    top = Math.max(4, top);
    return { left, top };
  };
})();
