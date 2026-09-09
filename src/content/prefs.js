/**
 * Persisted preferences: unit, card theme, pinned position, card size.
 *
 * One storage key, loaded once when the tool is armed, written back with a
 * short debounce so a drag or a resize does not hammer storage.
 */
(() => {
  const DT = (window.__designtool = window.__designtool || {});

  const KEY = 'designtool.prefs';
  const DEFAULTS = {
    unit: 'px',
    theme: 'dark',
    /** {left, top} once the user has placed the card themselves, else null */
    pin: null,
    /** {width, height} once the user has resized it, else null */
    size: null,
  };

  let state = { ...DEFAULTS };
  let timer = 0;

  function save() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        chrome.storage?.local?.set({ [KEY]: state });
      } catch {
        // Storage is unavailable in some sandboxed frames. Preferences still
        // work for the session, they just do not survive a reload.
      }
    }, 250);
  }

  DT.prefs = {
    get(key) {
      return state[key];
    },

    set(key, value) {
      state[key] = value;
      save();
    },

    async load() {
      try {
        const stored = await chrome.storage?.local?.get(KEY);
        if (stored?.[KEY]) state = { ...DEFAULTS, ...stored[KEY] };
      } catch {
        // Keep the defaults.
      }
      return state;
    },
  };
})();
