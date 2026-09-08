/**
 * Computed-style reader.
 *
 * Turns one getComputedStyle() call into the four blocks the card shows, in
 * designer vocabulary rather than CSS vocabulary: weights get names, letter
 * spacing gets a percentage, colors get hex.
 */
(() => {
  const DT = (window.__designtool = window.__designtool || {});
  const { parse } = DT.units;

  const WEIGHT_NAMES = {
    100: 'Thin',
    200: 'ExtraLight',
    300: 'Light',
    400: 'Regular',
    500: 'Medium',
    600: 'SemiBold',
    700: 'Bold',
    800: 'ExtraBold',
    900: 'Black',
  };

  /** "rgb(20, 22, 26)" / "rgba(...)" -> { hex, alpha, css } */
  function parseColor(value) {
    if (!value || value === 'transparent') return null;
    const nums = value.match(/[\d.]+/g);
    if (!nums || nums.length < 3) return { hex: value, alpha: 1, css: value };
    const [r, g, b] = nums.slice(0, 3).map(Number);
    const alpha = nums.length > 3 ? Number(nums[3]) : 1;
    if (alpha === 0) return null;
    const hex =
      '#' +
      [r, g, b]
        .map((c) => Math.round(c).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    return { hex, alpha, css: value };
  }

  /** Split a multi-value CSS list on top-level commas (colors contain commas). */
  function splitTopLevel(value) {
    const out = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < value.length; i++) {
      const ch = value[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ',' && depth === 0) {
        out.push(value.slice(start, i).trim());
        start = i + 1;
      }
    }
    const tail = value.slice(start).trim();
    if (tail) out.push(tail);
    return out;
  }

  /** "rgba(0,0,0,.2) 0px 4px 12px 0px" -> { color, x, y, blur, spread, inset } */
  function parseShadow(shadow) {
    const inset = /\binset\b/.test(shadow);
    let rest = shadow.replace(/\binset\b/, '').trim();
    const colorMatch = rest.match(/(rgba?\([^)]*\)|#[0-9a-f]{3,8})/i);
    const color = colorMatch ? parseColor(colorMatch[0]) : null;
    if (colorMatch) rest = rest.replace(colorMatch[0], ' ');
    const lengths = (rest.match(/-?[\d.]+px/g) || []).map(parseFloat);
    const [x = 0, y = 0, blur = 0, spread = 0] = lengths;
    return { color, x, y, blur, spread, inset, raw: shadow };
  }

  function firstFamily(fontFamily) {
    const first = splitTopLevel(fontFamily)[0] || fontFamily;
    return first.replace(/^["']|["']$/g, '');
  }

  /** A short, readable identity: div#hero.card */
  function describe(el) {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [];
    return {
      tag,
      id,
      classes: cls.slice(0, 2).map((c) => `.${c}`).join(''),
      extraClasses: Math.max(0, cls.length - 2),
    };
  }

  function sides(cs, prop, suffix = '') {
    return {
      top: parse(cs[`${prop}Top${suffix}`]) || 0,
      right: parse(cs[`${prop}Right${suffix}`]) || 0,
      bottom: parse(cs[`${prop}Bottom${suffix}`]) || 0,
      left: parse(cs[`${prop}Left${suffix}`]) || 0,
    };
  }

  function uniform(box) {
    return box.top === box.right && box.right === box.bottom && box.bottom === box.left;
  }

  /** True when the element renders text of its own, not just child boxes. */
  function hasOwnText(el) {
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) return true;
    }
    return false;
  }

  const REPLACED = new Set(['img', 'svg', 'video', 'canvas', 'iframe', 'object', 'embed', 'picture']);

  /**
   * Whether type styles are worth reporting. Every element inherits a font, but
   * on an image or a layout container that is noise, not a spec.
   */
  function showsType(el) {
    const tag = el.tagName.toLowerCase();
    if (REPLACED.has(tag)) return false;
    if (hasOwnText(el)) return true;
    // Form controls render text from a value rather than a child text node.
    return el.children.length === 0 && ['input', 'textarea', 'select', 'option'].includes(tag);
  }

  DT.styles = {
    describe,
    parseColor,
    parseShadow,
    splitTopLevel,
    uniform,

    /** @param {Element} el */
    read(el) {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const fontSize = parse(cs.fontSize) || 16;

      const lineHeightPx = parse(cs.lineHeight);
      const letterSpacingPx = parse(cs.letterSpacing);
      const weight = Number(cs.fontWeight) || 400;

      const display = cs.display;
      const isFlex = display.includes('flex');
      const isGrid = display.includes('grid');

      const border = sides(cs, 'border', 'Width');
      const radius = {
        topLeft: parse(cs.borderTopLeftRadius) || 0,
        topRight: parse(cs.borderTopRightRadius) || 0,
        bottomRight: parse(cs.borderBottomRightRadius) || 0,
        bottomLeft: parse(cs.borderBottomLeftRadius) || 0,
      };

      const shadows =
        cs.boxShadow && cs.boxShadow !== 'none' ? splitTopLevel(cs.boxShadow).map(parseShadow) : [];

      return {
        el,
        rect,
        identity: describe(el),

        typography: {
          hasText: hasOwnText(el),
          showsType: showsType(el),
          family: firstFamily(cs.fontFamily),
          familyStack: cs.fontFamily,
          size: fontSize,
          weight,
          weightName: WEIGHT_NAMES[weight] || String(weight),
          style: cs.fontStyle,
          lineHeightPx,
          lineHeightRatio: lineHeightPx ? lineHeightPx / fontSize : null,
          letterSpacingPx: letterSpacingPx ?? 0,
          letterSpacingPct: letterSpacingPx ? (letterSpacingPx / fontSize) * 100 : 0,
          letterSpacingIsNormal: letterSpacingPx === null,
          transform: cs.textTransform,
          align: cs.textAlign,
          decoration: cs.textDecorationLine,
          color: parseColor(cs.color),
        },

        box: {
          width: rect.width,
          height: rect.height,
          padding: sides(cs, 'padding'),
          margin: sides(cs, 'margin'),
          border,
          radius,
          radiusUniform:
            radius.topLeft === radius.topRight &&
            radius.topRight === radius.bottomRight &&
            radius.bottomRight === radius.bottomLeft,
          sizing: cs.boxSizing,
        },

        fill: {
          background: parseColor(cs.backgroundColor),
          backgroundImage: cs.backgroundImage !== 'none' ? cs.backgroundImage : null,
          opacity: Number(cs.opacity),
          borderColor: parseColor(cs.borderTopColor),
          borderStyle: cs.borderTopStyle,
          borderWidth: border,
          shadows,
        },

        layout: {
          display,
          isContainer: isFlex || isGrid,
          position: cs.position,
          direction: isFlex ? cs.flexDirection : null,
          wrap: isFlex ? cs.flexWrap : null,
          rowGap: parse(cs.rowGap) || 0,
          columnGap: parse(cs.columnGap) || 0,
          hasGap: (parse(cs.rowGap) || 0) > 0 || (parse(cs.columnGap) || 0) > 0,
          alignItems: cs.alignItems,
          justifyContent: cs.justifyContent,
          gridColumns: isGrid ? cs.gridTemplateColumns : null,
          zIndex: cs.zIndex !== 'auto' ? cs.zIndex : null,
          overflow: cs.overflow,
        },
      };
    },
  };
})();
