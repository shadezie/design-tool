/**
 * Unit conversion. Every number the UI shows goes through here.
 *
 * rem is resolved against the page's real root font-size, not an assumed 16px:
 * sites that set `html { font-size: 62.5% }` are exactly where design QA bugs
 * hide, and a hardcoded base would report confidently wrong values there.
 */
(() => {
  const DT = (window.__designtool = window.__designtool || {});
  const { prefs } = DT;

  const MODES = ['px', 'rem', 'em'];

  let mode = 'px';
  let rootFontSize = 16;

  /** Trim float noise: 1.33333 -> 1.33, 16.00 -> 16. Two decimals is where
   *  subpixel layout stops being useful and starts being noise. */
  function round(n) {
    return String(Math.round(n * 100) / 100);
  }

  const units = {
    MODES,

    get mode() {
      return mode;
    },

    set mode(next) {
      if (!MODES.includes(next)) return;
      mode = next;
      prefs.set('unit', next);
    },

    get rootFontSize() {
      return rootFontSize;
    },

    /** Re-read on activation and on resize: root size is often responsive. */
    refreshRoot() {
      const size = parseFloat(getComputedStyle(document.documentElement).fontSize);
      if (Number.isFinite(size) && size > 0) rootFontSize = size;
      return rootFontSize;
    },

    /** Adopt the stored unit. Call after prefs.load(). */
    adopt() {
      const stored = prefs.get('unit');
      if (MODES.includes(stored)) mode = stored;
      return mode;
    },

    /**
     * Format a pixel length in the active unit.
     * @param {number} px
     * @param {number} [elFontSize] the element's own font-size, the base for em
     */
    format(px, elFontSize) {
      if (!Number.isFinite(px)) return '-';
      if (px === 0) return '0';
      if (mode === 'rem') return `${round(px / rootFontSize)}rem`;
      if (mode === 'em') {
        const base = Number.isFinite(elFontSize) && elFontSize > 0 ? elFontSize : rootFontSize;
        return `${round(px / base)}em`;
      }
      return `${round(px)}px`;
    },

    /** Same as format() but always keeps the unit suffix, even for zero. */
    formatStrict(px, elFontSize) {
      if (!Number.isFinite(px)) return '-';
      if (px === 0) return mode === 'px' ? '0px' : `0${mode}`;
      return units.format(px, elFontSize);
    },

    /** Parse a computed CSS length ("12px", "normal", "") to a number or null. */
    parse(value) {
      const n = parseFloat(value);
      return Number.isFinite(n) ? n : null;
    },
  };

  DT.units = units;
})();
