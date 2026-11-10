/**
 * The window and document being inspected.
 *
 * It used to be whatever `window` and `document` were. With the stage, the
 * page being inspected lives in a frame beside the panel, so the inspector
 * reads through this instead. When there is no frame it points at the top
 * window and everything behaves as it always did.
 */
(() => {
  const DT = (window.__designtool = window.__designtool || {});

  let win = window;
  let doc = document;

  DT.target = {
    get win() {
      return win;
    },
    get doc() {
      return doc;
    },

    /** True when the page being inspected is in the stage's frame. */
    get framed() {
      return win !== window;
    },

    set(nextWin, nextDoc) {
      win = nextWin;
      doc = nextDoc;
    },

    reset() {
      win = window;
      doc = document;
    },

    /**
     * Computed style, asked of the element's own window. A style read through
     * the wrong window resolves media queries and viewport units against the
     * wrong viewport, which is the one thing a device frame must not do.
     */
    cs(el) {
      return (el.ownerDocument?.defaultView || window).getComputedStyle(el);
    },
  };
})();
