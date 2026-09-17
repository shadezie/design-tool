/**
 * Design token resolution.
 *
 * A designer checking a page against a design system does not want `#2A51FD`,
 * they want `--color-primary`. The hex is the implementation detail; the token
 * is the decision. This module answers "which token is this value?" two ways,
 * because neither alone covers a real page:
 *
 *   1. Exact: find the CSS rule that styles this element and see whether the
 *      declaration literally says `var(--token)`. Unambiguous when it works,
 *      but `.cssRules` throws on cross-origin stylesheets, so a page serving
 *      its CSS from a CDN gives us nothing.
 *
 *   2. Reverse lookup: collect every custom property the page defines, resolve
 *      each to its computed value, and match by value. Works regardless of
 *      where the CSS came from, at the cost of being a guess when two tokens
 *      share a value.
 *
 * Exact wins when available. When neither hits, the caller shows the raw value,
 * which is what the tool did before tokens existed.
 */
(() => {
  const DT = (window.__designtool = window.__designtool || {});

  // Walking every stylesheet is not free, so the maps are built once per
  // activation and the per-element answers are memoised.
  let byValue = null;
  let names = null;
  const exactCache = new WeakMap();

  const MAX_RULES = 20000;

  /**
   * Values too common for a match to mean anything.
   *
   * Almost every system defines a token that happens to be pure white or pure
   * black, so every white label on the page would claim --color-surface and be
   * wrong. A value match is only evidence when the value is distinctive; an
   * exact var() read still reports these, because there the page said so.
   */
  const TOO_COMMON = new Set(['c:#FFFFFF', 'c:#000000', 'l:0']);

  /**
   * Recursively collect custom property names from a stylesheet or group.
   *
   * A rule can both declare properties and contain rules: since CSS nesting,
   * CSSStyleRule is itself a grouping rule, so every plain rule now reports a
   * (usually empty) cssRules list. Treating that as "this is a group, skip its
   * declarations" silently found zero tokens on every page.
   */
  function collectNames(rules, found, budget) {
    for (const rule of rules) {
      if (budget.n++ > MAX_RULES) return;

      const style = rule.style;
      if (style) {
        for (let i = 0; i < style.length; i++) {
          const prop = style[i];
          if (prop.charCodeAt(0) === 45 && prop.charCodeAt(1) === 45) found.add(prop);
        }
      }

      // @media, @supports, @layer, and nested rules.
      if (rule.cssRules && rule.cssRules.length) collectNames(rule.cssRules, found, budget);
    }
  }

  function eachSheet(fn) {
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        // Cross-origin stylesheet. Nothing readable here, and that is exactly
        // why the reverse-lookup path exists.
        continue;
      }
      if (rules) fn(rules);
    }
  }

  /** "#2a51fd" / "rgb(42 81 253)" / "42 81 253" -> "#2A51FD", else null. */
  function toHex(value) {
    const raw = String(value).trim();
    if (!raw) return null;

    const hex = /^#([0-9a-f]{3,8})$/i.exec(raw);
    if (hex) {
      let h = hex[1];
      if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
      return `#${h.slice(0, 6).toUpperCase()}`;
    }

    const fn = /^(rgba?|hsla?)\(([^)]+)\)$/i.exec(raw);
    const body = fn ? fn[2] : raw;
    const nums = body.split(/[\s,/]+/).filter(Boolean);

    if (fn && /^hsl/i.test(fn[1])) {
      const h = parseFloat(nums[0]);
      const s = parseFloat(nums[1]) / 100;
      const l = parseFloat(nums[2]) / 100;
      if ([h, s, l].some(Number.isNaN)) return null;
      return hslToHex(h, s, l);
    }

    // Bare channel triplets are the Tailwind/shadcn convention: the token holds
    // "42 81 253" and the rule says rgb(var(--token) / <alpha>).
    if (nums.length < 3) return null;
    const [r, g, b] = nums.slice(0, 3).map((n) => parseFloat(n));
    if ([r, g, b].some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
    return (
      '#' +
      [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase()
    );
  }

  function hslToHex(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const seg = Math.floor(((h % 360) + 360) % 360 / 60);
    const table = [
      [c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x],
    ][seg] || [0, 0, 0];
    return (
      '#' +
      table
        .map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
    );
  }

  /** A stable key for a token value, so lookups can match on it. */
  function keyFor(value) {
    const hex = toHex(value);
    if (hex) return `c:${hex}`;
    const px = /^(-?[\d.]+)px$/.exec(String(value).trim());
    if (px) return `l:${Math.round(parseFloat(px[1]) * 100) / 100}`;
    const rem = /^(-?[\d.]+)rem$/.exec(String(value).trim());
    if (rem) {
      const root = DT.units?.rootFontSize || 16;
      return `l:${Math.round(parseFloat(rem[1]) * root * 100) / 100}`;
    }
    return null;
  }

  /**
   * Build the value -> token map.
   *
   * Names come from the stylesheets, but values come from getComputedStyle on
   * the root: that is the value actually in effect, so a page in dark mode
   * reports its dark palette rather than whatever the light rule declared.
   */
  function build() {
    names = new Set();
    byValue = new Map();

    const budget = { n: 0 };
    eachSheet((rules) => collectNames(rules, names, budget));

    // Frameworks that write tokens at runtime put them on the root's style
    // attribute, where no stylesheet rule mentions them.
    for (const host of [document.documentElement, document.body]) {
      const inline = host?.style;
      if (!inline) continue;
      for (let i = 0; i < inline.length; i++) {
        const prop = inline[i];
        if (prop.startsWith('--')) names.add(prop);
      }
    }

    if (!names.size) return;

    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = document.body ? getComputedStyle(document.body) : null;

    for (const name of names) {
      const value =
        rootStyle.getPropertyValue(name).trim() ||
        bodyStyle?.getPropertyValue(name).trim() ||
        '';
      if (!value) continue;
      const key = keyFor(value);
      if (!key) continue;
      let list = byValue.get(key);
      if (!list) byValue.set(key, (list = []));
      // Shorter names tend to be the semantic ones (--bg over --color-bg-raw-2).
      list.push({ name, value });
    }
    for (const list of byValue.values()) {
      list.sort((a, b) => a.name.length - b.name.length);
    }
  }

  function ensure() {
    if (!byValue) build();
  }

  /** The var(--x) a rule used for this property, when we can read the rule. */
  function exact(el, prop) {
    if (!el || !prop) return null;

    let perElement = exactCache.get(el);
    if (perElement && prop in perElement) return perElement[prop];
    if (!perElement) exactCache.set(el, (perElement = {}));

    let hit = null;

    // Inline styles beat every stylesheet rule, so they are checked first.
    const inlineValue = el.style?.getPropertyValue(prop);
    if (inlineValue && inlineValue.includes('var(')) {
      hit = nameFromVar(inlineValue);
    }

    if (!hit) {
      const budget = { n: 0 };
      eachSheet((rules) => {
        const found = scanRules(rules, el, prop, budget);
        // Later rules win, which approximates the cascade well enough for a
        // readout. Specificity ties are rare and cost only a token name.
        if (found) hit = found;
      });
    }

    perElement[prop] = hit;
    return hit;
  }

  function scanRules(rules, el, prop, budget) {
    let found = null;
    for (const rule of rules) {
      if (budget.n++ > MAX_RULES) return found;

      // Same as collectNames: a rule can declare and contain at once.
      if (rule.style && rule.selectorText) {
        const declared = rule.style.getPropertyValue(prop);
        if (declared && declared.includes('var(')) {
          try {
            if (el.matches(rule.selectorText)) found = nameFromVar(declared) || found;
          } catch {
            // Selectors with pseudo-elements or vendor syntax that matches()
            // will not parse. Skipping one rule beats abandoning the sheet.
          }
        }
      }

      if (rule.cssRules && rule.cssRules.length) {
        const nested = scanRules(rule.cssRules, el, prop, budget);
        if (nested) found = nested;
      }
    }
    return found;
  }

  function nameFromVar(declaration) {
    const match = /var\(\s*(--[\w-]+)/.exec(declaration);
    return match ? { name: match[1], exact: true } : null;
  }

  DT.tokens = {
    /** Rebuild on the next lookup. Called when the page's CSS may have changed. */
    invalidate() {
      byValue = null;
      names = null;
    },

    /** Whether this page defines custom properties at all. */
    get any() {
      ensure();
      return !!(names && names.size);
    },

    /**
     * @param {Element} el
     * @param {string} prop CSS property name, e.g. "color"
     * @param {string} computed the computed value, for the fallback match
     * @returns {{name: string, exact: boolean, ambiguous: boolean}|null}
     */
    lookup(el, prop, computed) {
      ensure();
      if (!names || !names.size) return null;

      const precise = exact(el, prop);
      if (precise) return { ...precise, ambiguous: false };

      const key = keyFor(computed);
      if (!key || TOO_COMMON.has(key)) return null;
      const list = byValue.get(key);
      if (!list || !list.length) return null;
      return { name: list[0].name, exact: false, ambiguous: list.length > 1 };
    },
  };
})();
