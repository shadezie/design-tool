/**
 * Element picking and event capture.
 *
 * While armed, the page must not react to the pointer: clicking a nav link to
 * measure it should not navigate away. Everything is captured at the window in
 * the capture phase and suppressed, except events from our own card.
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

  function pick(x, y) {
    const stack = stackAt(x, y);
    return stack[0] || document.body || null;
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
   * @param {{onMove:Function, onPick:Function, onWalk:Function, onEscape:Function, onLeave:Function}} handlers
   * @returns {Function} unbind
   */
  function bind(handlers) {
    let frame = 0;
    let pending = null;

    function onMouseMove(event) {
      if (overlay.ownsEvent(event)) return;
      pending = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (pending) handlers.onMove(pending.x, pending.y);
      });
    }

    function onMouseLeave(event) {
      if (event.relatedTarget === null) handlers.onLeave();
    }

    function suppress(event) {
      if (overlay.ownsEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (event.type === 'click') handlers.onPick(event.clientX, event.clientY);
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        handlers.onEscape();
        return;
      }
      if (overlay.ownsEvent(event)) return;
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
    window.addEventListener('mouseout', onMouseLeave, options);
    window.addEventListener('keydown', onKeyDown, options);
    window.addEventListener('wheel', onWheel, { capture: true, passive: false });
    for (const type of SUPPRESSED) window.addEventListener(type, suppress, options);

    return function unbind() {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('mousemove', onMouseMove, options);
      window.removeEventListener('mouseout', onMouseLeave, options);
      window.removeEventListener('keydown', onKeyDown, options);
      window.removeEventListener('wheel', onWheel, { capture: true });
      for (const type of SUPPRESSED) window.removeEventListener(type, suppress, options);
    };
  }

  DT.inspect = { pick, walk, bind };
})();
