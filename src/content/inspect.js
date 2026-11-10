/**
 * Element picking and event capture.
 *
 * While armed, the page must not react to the pointer: clicking a nav link to
 * measure it should not navigate away. Everything is captured at the window in
 * the capture phase and suppressed, except events from our own panel.
 */
(() => {
  const DT = (window.__designtool = window.__designtool || {});
  const { overlay } = DT;

  const SUPPRESSED = [
    'click',
    'auxclick',
    'dblclick',
    'mousedown',
    'mouseup',
    'pointerdown',
    'pointerup',
    'contextmenu',
    'submit',
  ];

  /**
   * The element stack under a point, innermost first, with our own overlay and
   * the document scaffolding removed.
   */
  function stackAt(x, y) {
    return document
      .elementsFromPoint(x, y)
      .filter((node) => node.id !== 'designtool-root' && node !== document.documentElement);
  }

  /**
   * An element that paints nothing is never what you are pointing at. Sites
   * cover whole cards with `position: absolute; inset: 0; opacity: 0` link
   * overlays, and those were winning every hover.
   */
  function paints(el) {
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && Number(cs.opacity) !== 0;
  }

  function depth(el) {
    let d = 0;
    for (let node = el.parentElement; node; node = node.parentElement) d++;
    return d;
  }

  function area(el) {
    const rect = el.getBoundingClientRect();
    return rect.width * rect.height;
  }

  /**
   * @param {boolean} deep reach the most specific thing under the cursor
   *   rather than the topmost painted one, the way Figma lets you select
   *   through a group.
   */
  function pick(x, y, deep) {
    const visible = stackAt(x, y).filter(paints);
    if (!visible.length) return document.body || null;
    if (!deep) return visible[0];

    // Smallest box wins, deeper node breaks the tie. DOM depth alone is not
    // enough: a full-bleed scrim is usually a SIBLING of the heading it covers,
    // so both sit at the same depth and paint order hands you the scrim.
    return visible.reduce((best, el) => {
      const d = area(el) - area(best);
      if (d < -0.5) return el;
      if (d > 0.5) return best;
      return depth(el) > depth(best) ? el : best;
    }, visible[0]);
  }

  /**
   * Step through the ancestor stack under the cursor.
   * @param {Element} current
   * @param {number} delta +1 walks out to the parent, -1 walks back in
   */
  function walk(current, delta, x, y) {
    const stack = stackAt(x, y);
    const index = stack.indexOf(current);
    if (index === -1) return stack[0] || current;
    const next = stack[index + delta];
    return next || current;
  }

  /**
   * @param {{onMove:Function, onPick:Function, onWalk:Function, onEscape:Function,
   *          onLeave:Function, onCycleUnits:Function, onModifier:Function}} handlers
   *   onMove and onPick receive (x, y, mod), where mod is Cmd (macOS) or Ctrl
   *   being held. What the modifier means is the state machine's business:
   *   select-through with nothing locked, measure once A is.
   * @returns {Function} unbind
   */
  function bind(handlers) {
    let frame = 0;
    let pending = null;
    let mod = false;

    function schedule() {
      if (frame || !pending) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (pending) handlers.onMove(pending.x, pending.y, mod);
      });
    }

    function onMouseMove(event) {
      setMod(event.metaKey || event.ctrlKey);
      if (overlay.ownsEvent(event)) return;
      pending = { x: event.clientX, y: event.clientY };
      schedule();
    }

    /** Pressing or releasing the modifier re-picks without needing a move. */
    function onModifier(event) {
      setMod(event.metaKey || event.ctrlKey);
    }

    function setMod(next) {
      if (next === mod) return;
      mod = next;
      handlers.onModifier(mod);
      schedule();
    }

    // Cmd+Tab away and the keyup lands in another window. Without this the
    // tool would come back still believing the key is down.
    function onBlur() {
      setMod(false);
    }

    function onMouseLeave(event) {
      if (event.relatedTarget === null) handlers.onLeave();
    }

    // A press that starts on the panel and is released over the page ends with
    // a click whose target is the page. Without this the release would lock
    // whatever happened to be under the pointer.
    let pressedOnUI = false;

    function suppress(event) {
      const isPress = event.type === 'mousedown' || event.type === 'pointerdown';
      if (overlay.ownsEvent(event)) {
        if (isPress) pressedOnUI = true;
        return;
      }
      if (isPress) pressedOnUI = false;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (event.type === 'click') {
        if (!pressedOnUI) handlers.onPick(event.clientX, event.clientY, event.metaKey || event.ctrlKey);
        pressedOnUI = false;
      }
    }

    function onKeyDown(event) {
      onModifier(event);
      if (event.key === 'Escape') {
        // Only swallow it when there is a selection to clear. With nothing
        // locked, Esc belongs to the page again.
        if (handlers.onEscape()) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
      // These work wherever focus is. Clicking a control on the panel leaves
      // focus inside it, and the panel has no text fields to protect, so
      // ignoring keys from our own UI just made U stop working after a click.
      // Let the browser keep its own chords: Cmd+U, Ctrl+U and friends.
      if ((event.key === 'u' || event.key === 'U') && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        handlers.onCycleUnits();
        return;
      }
      if (event.key === '[') {
        event.preventDefault();
        handlers.onWalk(1);
      } else if (event.key === ']') {
        event.preventDefault();
        handlers.onWalk(-1);
      }
    }

    function onWheel(event) {
      if (!event.altKey || overlay.ownsEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      handlers.onWalk(event.deltaY > 0 ? 1 : -1);
    }

    const options = { capture: true };
    window.addEventListener('mousemove', onMouseMove, options);
    window.addEventListener('keyup', onModifier, options);
    window.addEventListener('blur', onBlur);
    window.addEventListener('mouseout', onMouseLeave, options);
    window.addEventListener('keydown', onKeyDown, options);
    window.addEventListener('wheel', onWheel, { capture: true, passive: false });
    for (const type of SUPPRESSED) window.addEventListener(type, suppress, options);

    return function unbind() {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('mousemove', onMouseMove, options);
      window.removeEventListener('keyup', onModifier, options);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('mouseout', onMouseLeave, options);
      window.removeEventListener('keydown', onKeyDown, options);
      window.removeEventListener('wheel', onWheel, { capture: true });
      for (const type of SUPPRESSED) window.removeEventListener(type, suppress, options);
    };
  }

  DT.inspect = { pick, walk, bind };
})();
