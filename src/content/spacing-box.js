/**
 * The spacing box: margin -> border -> padding -> content, drawn as nested
 * rings the way Figma and the DevTools box model do it.
 *
 * Zero sides are dimmed rather than hidden, so the diagram keeps a stable
 * shape and stays scannable while you move between elements.
 */
(() => {
  const DT = (window.__designtool = window.__designtool || {});

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  DT.spacingBox = {
    /**
     * @param {object} data result of DT.styles.read()
     * @param {{fmt: (px:number)=>string, copyable: (node:Element, text:string)=>Element}} ctx
     */
    render(data, ctx) {
      const { padding, margin, border, radius, radiusUniform, width, height } = data.box;

      // Width and height on their own rows: in rem they get long enough that a
      // single "W x H" line wraps and shoves the rings around.
      const content = el('div', 'content-box');
      content.appendChild(dimension('W', width, ctx));
      content.appendChild(dimension('H', height, ctx));

      const wrap = el('div', 'sbox');
      wrap.appendChild(
        ring('margin', 'Margin', margin, ring('border', 'Border', border, ring('padding', 'Padding', padding, content, ctx), ctx), ctx)
      );

      const notes = el('dl', 'sbox-note');
      if (radiusUniform) {
        if (radius.topLeft) addNote(notes, 'Radius', ctx.fmt(radius.topLeft), ctx);
      } else {
        const corners = [radius.topLeft, radius.topRight, radius.bottomRight, radius.bottomLeft];
        addNote(notes, 'Radius', corners.map(ctx.fmt).join(' '), ctx);
      }

      // Gap vs padding is the confusion this whole panel exists to end, so the
      // container's gap is stated right next to its padding.
      if (data.layout.isContainer) {
        const { rowGap, columnGap } = data.layout;
        const value = rowGap === columnGap ? ctx.fmt(rowGap) : `${ctx.fmt(rowGap)} / ${ctx.fmt(columnGap)}`;
        addNote(notes, rowGap === columnGap ? 'Gap' : 'Gap (row/col)', value, ctx);
      }

      if (notes.children.length) wrap.appendChild(notes);
      return wrap;
    },
  };

  function dimension(axis, px, ctx) {
    const value = ctx.fmt(px);
    const node = el('div', 'dim');
    node.appendChild(el('span', 'dim-axis', axis));
    node.appendChild(el('span', 'dim-value', value));
    ctx.copyable(node, value);
    return node;
  }

  function addNote(list, label, value, ctx) {
    list.appendChild(el('dt', null, label));
    const dd = el('dd', null, value);
    ctx.copyable(dd, value);
    list.appendChild(dd);
  }

  function ring(kind, label, box, inner, ctx) {
    const node = el('div', `ring ring-${kind}`);
    node.appendChild(el('span', 'ring-label', label));
    node.appendChild(side(box.top, ctx));

    const mid = el('div', 'ring-mid');
    mid.appendChild(side(box.left, ctx, 'is-side-l'));
    const innerWrap = el('div');
    innerWrap.style.flex = '1';
    innerWrap.style.minWidth = '0';
    innerWrap.appendChild(inner);
    mid.appendChild(innerWrap);
    mid.appendChild(side(box.right, ctx, 'is-side-r'));
    node.appendChild(mid);

    node.appendChild(side(box.bottom, ctx));
    return node;
  }

  function side(px, ctx, extra) {
    const text = px === 0 ? '0' : ctx.fmt(px);
    const node = el('div', `sv${px === 0 ? ' is-zero' : ''}${extra ? ` ${extra}` : ''}`, text);
    if (px !== 0) ctx.copyable(node, text);
    return node;
  }
})();
