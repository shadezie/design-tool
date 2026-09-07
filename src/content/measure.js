/**
 * Geometry for the two-element measurement.
 *
 * Works in viewport coordinates. Rects are re-read every animation frame while
 * anything is locked, so sticky headers and scrolling need no special handling
 * here: the numbers are always for what is on screen right now.
 */
(() => {
  const DT = (window.__designtool = window.__designtool || {});

  const contains = (outer, inner) =>
    outer.left <= inner.left &&
    outer.top <= inner.top &&
    outer.right >= inner.right &&
    outer.bottom >= inner.bottom;

  /** Distance between rects on one axis, or null when they overlap on it. */
  function separation(aStart, aEnd, bStart, bEnd) {
    if (bStart >= aEnd) return { gap: bStart - aEnd, from: aEnd, to: bStart };
    if (aStart >= bEnd) return { gap: aStart - bEnd, from: bEnd, to: aStart };
    return null;
  }

  /**
   * @param {DOMRect} a
   * @param {DOMRect} b
   * @returns {{kind: string, note: string, values: Array, segments: Array, guides: Array}}
   */
  function measure(a, b) {
    const sx = separation(a.left, a.right, b.left, b.right);
    const sy = separation(a.top, a.bottom, b.top, b.bottom);

    // Nested or overlapping: one number would be a lie, so report all four edges.
    if (!sx && !sy) return edges(a, b);

    if (sx && !sy) return axisGap(a, b, sx, 'h');
    if (sy && !sx) return axisGap(a, b, sy, 'v');
    return diagonal(a, b, sx, sy);
  }

  /** Two elements side by side (or stacked): the clean Figma red-line case. */
  function axisGap(a, b, sep, axis) {
    const horizontal = axis === 'h';
    const overlapStart = horizontal ? Math.max(a.top, b.top) : Math.max(a.left, b.left);
    const overlapEnd = horizontal ? Math.min(a.bottom, b.bottom) : Math.min(a.right, b.right);
    const mid = (overlapStart + overlapEnd) / 2;

    const spanStart = horizontal ? Math.min(a.top, b.top) : Math.min(a.left, b.left);
    const spanEnd = horizontal ? Math.max(a.bottom, b.bottom) : Math.max(a.right, b.right);

    const segment = horizontal
      ? { axis: 'h', x1: sep.from, x2: sep.to, y1: mid, y2: mid, value: sep.gap }
      : { axis: 'v', x1: mid, x2: mid, y1: sep.from, y2: sep.to, value: sep.gap };

    // Extension lines, so it is obvious which edges the number spans.
    const guides = horizontal
      ? [
          { axis: 'v', x1: sep.from, x2: sep.from, y1: spanStart, y2: spanEnd },
          { axis: 'v', x1: sep.to, x2: sep.to, y1: spanStart, y2: spanEnd },
        ]
      : [
          { axis: 'h', x1: spanStart, x2: spanEnd, y1: sep.from, y2: sep.from },
          { axis: 'h', x1: spanStart, x2: spanEnd, y1: sep.to, y2: sep.to },
        ];

    return {
      kind: 'gap',
      note: horizontal ? 'Horizontal gap' : 'Vertical gap',
      values: [{ label: 'Gap', px: sep.gap }],
      segments: [segment],
      guides,
    };
  }

  /** Separated on both axes: report the components, not a hypotenuse. */
  function diagonal(a, b, sx, sy) {
    const cornerX = sx.to === b.left ? b.left : b.right;
    const cornerY = sy.from === a.bottom ? a.bottom : a.top;

    return {
      kind: 'diagonal',
      note: 'Offset on both axes',
      values: [
        { label: 'Horizontal', px: sx.gap },
        { label: 'Vertical', px: sy.gap },
      ],
      segments: [
        { axis: 'h', x1: sx.from, x2: sx.to, y1: cornerY, y2: cornerY, value: sx.gap },
        { axis: 'v', x1: cornerX, x2: cornerX, y1: sy.from, y2: sy.to, value: sy.gap },
      ],
      guides: [],
    };
  }

  /** Nested or overlapping: four edge-to-edge distances. */
  function edges(a, b) {
    const aInB = contains(b, a);
    const outer = aInB ? b : a;
    const inner = aInB ? a : b;
    const nested = contains(outer, inner);

    const midX = (inner.left + inner.right) / 2;
    const midY = (inner.top + inner.bottom) / 2;

    const dist = {
      top: inner.top - outer.top,
      right: outer.right - inner.right,
      bottom: outer.bottom - inner.bottom,
      left: inner.left - outer.left,
    };

    return {
      kind: nested ? 'nested' : 'overlap',
      note: nested ? 'Inset from container' : 'Overlapping, edge distances',
      values: [
        { label: 'Top', px: dist.top },
        { label: 'Right', px: dist.right },
        { label: 'Bottom', px: dist.bottom },
        { label: 'Left', px: dist.left },
      ],
      segments: [
        { axis: 'v', x1: midX, x2: midX, y1: outer.top, y2: inner.top, value: dist.top },
        { axis: 'h', x1: inner.right, x2: outer.right, y1: midY, y2: midY, value: dist.right },
        { axis: 'v', x1: midX, x2: midX, y1: inner.bottom, y2: outer.bottom, value: dist.bottom },
        { axis: 'h', x1: outer.left, x2: inner.left, y1: midY, y2: midY, value: dist.left },
      ].filter((s) => Math.abs(s.value) > 0.5),
      guides: [],
    };
  }

  DT.measure = measure;
})();
