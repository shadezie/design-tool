/**
 * Design Tool - content script entry.
 *
 * Owns the state machine (idle -> armed -> lockedA -> lockedAB) and the paint
 * loop. Rects are re-read every frame while armed, which is what keeps the
 * measurement attached through scrolling, sticky headers and layout shifts.
 */
(() => {
  const DT = (window.__designtool = window.__designtool || {});
  if (DT.booted) return;
  DT.booted = true;

  const { units, styles, overlay, card, inspect, measure, prefs } = DT;

  let state = 'idle';
  let unbind = null;
  let rafId = 0;

  let elA = null;
  let elB = null;
  let hoverEl = null;
  let cursor = { x: 0, y: 0 };
  let cardSignature = '';
  let lastMeasureKey = '';
  let armToken = 0;

  const ids = new WeakMap();
  let nextId = 1;
  function idOf(el) {
    if (!el) return '0';
    if (!ids.has(el)) ids.set(el, nextId++);
    return String(ids.get(el));
  }

  /** The element whose styles the card is describing. */
  function subject() {
    if (state === 'lockedA' || state === 'lockedAB') return elA;
    return hoverEl;
  }

  function alive(el) {
    return el && el.isConnected;
  }

  function setState(next) {
    state = next;
    cardSignature = '';
    lastMeasureKey = '';
  }

  // ---------------------------------------------------------------- painting

  function paint() {
    rafId = requestAnimationFrame(paint);
    if (state === 'idle') return;

    overlay.reassert();

    // Elements can be removed by the page (SPA re-render) while locked.
    if (elA && !alive(elA)) reset();
    if (elB && !alive(elB)) {
      // The page removed B (an SPA re-render, usually). Dropping it without
      // dropping the state left the card frozen with no measurement and no
      // live preview until the next click.
      elB = null;
      if (state === 'lockedAB') setState('lockedA');
    }
    if (hoverEl && !alive(hoverEl)) hoverEl = null;

    const target = subject();
    if (!target) {
      overlay.clearHighlights();
      lastMeasureKey = 'none';
      overlay.setMeasurement(null, () => '');
      overlay.showCard(false);
      return;
    }

    const rectA = elA ? elA.getBoundingClientRect() : null;
    const rectB = elB ? elB.getBoundingClientRect() : null;
    const rectHover = hoverEl ? hoverEl.getBoundingClientRect() : null;

    overlay.clearHighlights();
    if (state === 'armed') {
      overlay.setHighlight('hover', rectHover, label(hoverEl, rectHover));
    } else {
      overlay.setHighlight('a', rectA, label(elA, rectA));
      const other = state === 'lockedAB' ? elB : hoverEl !== elA ? hoverEl : null;
      const otherRect = state === 'lockedAB' ? rectB : hoverEl !== elA ? rectHover : null;
      if (otherRect) overlay.setHighlight('b', otherRect, label(other, otherRect));
    }

    // The measurement follows the live rects, so it stays true while scrolling.
    let result = null;
    let partner = null;
    if (rectA) {
      const otherEl = state === 'lockedAB' ? elB : hoverEl !== elA ? hoverEl : null;
      const against = state === 'lockedAB' ? rectB : hoverEl && hoverEl !== elA ? rectHover : null;
      if (against) {
        const [outerRect, innerRect] = insetForBorder(elA, rectA, otherEl, against);
        result = measure(outerRect, innerRect);
        partner = otherEl;
      }
    }

    const data = styles.read(target);
    const fmt = (px) => units.format(px, data.typography.size);

    // Measurement lines rebuild DOM, so only redraw when the geometry moved.
    const measureKey = result
      ? `${units.mode}|${result.kind}|${result.segments
          .map((s) => [s.x1, s.y1, s.x2, s.y2].map(Math.round).join(','))
          .join(';')}`
      : 'none';
    if (measureKey !== lastMeasureKey) {
      lastMeasureKey = measureKey;
      overlay.setMeasurement(result, fmt);
    }

    renderCard(data, result, partner);
    overlay.showCard(true);

    const { left, top } = card.position(overlay.card);
    overlay.setCardPosition(left, top);
  }

  /**
   * getBoundingClientRect() returns the border box, so measuring a child
   * against its container counts the container's border: a 12px padding with a
   * 1px border reads as 13px, which is not the number anyone is checking.
   *
   * When one element really is an ancestor of the other, measure from the
   * container's padding box instead. Then the inset matches the padding the
   * page actually declares, and the border stays reported on its own in the
   * spacing box.
   */
  function insetForBorder(elOne, rectOne, elTwo, rectTwo) {
    if (!elOne || !elTwo || elOne === elTwo) return [rectOne, rectTwo];
    const oneIsOuter = elOne.contains(elTwo);
    if (!oneIsOuter && !elTwo.contains(elOne)) return [rectOne, rectTwo];

    const outerEl = oneIsOuter ? elOne : elTwo;
    const outerRect = oneIsOuter ? rectOne : rectTwo;
    const cs = getComputedStyle(outerEl);
    const shrunk = {
      top: outerRect.top + (parseFloat(cs.borderTopWidth) || 0),
      right: outerRect.right - (parseFloat(cs.borderRightWidth) || 0),
      bottom: outerRect.bottom - (parseFloat(cs.borderBottomWidth) || 0),
      left: outerRect.left + (parseFloat(cs.borderLeftWidth) || 0),
    };
    shrunk.width = shrunk.right - shrunk.left;
    shrunk.height = shrunk.bottom - shrunk.top;

    return oneIsOuter ? [shrunk, rectTwo] : [rectOne, shrunk];
  }

  function label(el, rect) {
    if (!el || !rect) return '';
    const { tag, id, classes } = styles.describe(el);
    const size = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
    return `${tag}${id}${classes}  ${size}`;
  }

  /** Rebuild the card only when something it displays actually changed. */
  function renderCard(data, result, partner) {
    const measurementKey = result
      ? `${result.kind}:${result.values.map((v) => Math.round(v.px * 10)).join(',')}`
      : '';
    // The partner's identity is part of the signature now that the card
    // describes it: two different elements can sit the same distance away.
    const signature = `${state}|${idOf(data.el)}|${idOf(partner)}|${units.mode}|${measurementKey}|${Math.round(
      data.box.width
    )}x${Math.round(data.box.height)}`;
    if (signature === cardSignature) return;
    cardSignature = signature;

    // Reading the partner's styles is only worth it when there is something to
    // compare against, which is why it happens here and not in the paint loop.
    const pair = result && partner ? { a: data, b: styles.read(partner) } : null;

    card.render(overlay.card, data, {
      measurement: result,
      pair,
      state,
      onUnitChange: () => {
        cardSignature = '';
      },
      onClose: () => disarm(true),
    });
  }

  // ------------------------------------------------------------ interactions

  function onMove(x, y, deep) {
    cursor = { x, y };
    const found = inspect.pick(x, y, deep);
    if (found && found !== hoverEl) hoverEl = found;
  }

  function onPick(x, y) {
    const target = hoverEl || inspect.pick(x, y);
    if (!target) return;

    if (state === 'armed') {
      elA = target;
      elB = null;
      setState('lockedA');
      return;
    }

    if (state === 'lockedA') {
      // Clicking the locked element again releases it.
      if (target === elA) {
        elA = null;
        setState('armed');
        return;
      }
      elB = target;
      setState('lockedAB');
      return;
    }

    // A third click starts a fresh measurement from whatever was clicked,
    // which is the fastest flow when checking a row of elements in turn.
    elA = target;
    elB = null;
    setState('lockedA');
  }

  function onWalk(delta) {
    const current = state === 'armed' ? hoverEl : state === 'lockedA' ? elA : elB;
    if (!current) return;
    const next = inspect.walk(current, delta, cursor.x, cursor.y);
    if (next === current) return;
    if (state === 'armed') hoverEl = next;
    else if (state === 'lockedA') elA = next;
    else elB = next;
    cardSignature = '';
  }

  function onCycleUnits() {
    const next = units.MODES[(units.MODES.indexOf(units.mode) + 1) % units.MODES.length];
    units.mode = next;
    cardSignature = '';
    lastMeasureKey = '';
  }

  function onEscape() {
    if (state === 'lockedAB' || state === 'lockedA') {
      reset();
      return;
    }
    disarm(true);
  }

  function onLeave() {
    if (state === 'armed') hoverEl = null;
  }

  function reset() {
    elA = null;
    elB = null;
    setState('armed');
  }

  // ------------------------------------------------------------- arm/disarm

  function onResize() {
    units.refreshRoot();
    // Custom properties are routinely redefined per breakpoint, so the token
    // map is only true for the width it was built at.
    DT.tokens?.invalidate();
    cardSignature = '';
  }

  async function arm() {
    if (state !== 'idle') return;
    const token = ++armToken;
    state = 'arming';
    await prefs.load();
    // A disarm can land while storage is loading. It bumps the token, and this
    // arm then has to abandon rather than mount an overlay nobody asked for.
    if (token !== armToken) return;
    units.adopt();
    card.adopt();
    units.refreshRoot();
    // The page may have swapped themes or loaded more CSS since last time.
    DT.tokens?.invalidate();

    overlay.mount();
    card.attachResizer(overlay.resizer, overlay.card);
    setState('armed');
    unbind = inspect.bind({ onMove, onPick, onWalk, onEscape, onLeave, onCycleUnits });
    window.addEventListener('resize', onResize);
    if (!rafId) rafId = requestAnimationFrame(paint);
  }

  function disarm(notify) {
    armToken++;
    if (state === 'idle') return;
    setState('idle');
    unbind?.();
    unbind = null;
    window.removeEventListener('resize', onResize);
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    elA = elB = hoverEl = null;
    overlay.unmount();

    if (notify) {
      try {
        chrome.runtime.sendMessage({ type: 'designtool:disarmed' })?.catch(() => {
          // The worker may be asleep. Its state resyncs on the next toggle.
        });
      } catch {
        // Extension context invalidated, e.g. the user just reloaded it.
      }
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'designtool:ping') {
      sendResponse({ ok: true });
      return false;
    }
    if (message?.type === 'designtool:toggle') {
      if (message.armed) arm().then(() => sendResponse({ ok: true, state }));
      else {
        disarm(false);
        sendResponse({ ok: true, state });
      }
      return true;
    }
    return false;
  });

  window.addEventListener('pagehide', () => disarm(false));
})();
