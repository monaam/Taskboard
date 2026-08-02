/**
 * Geometry for auto-arranging canvas cards into a packed masonry grid.
 *
 * Lives in a plain module rather than alongside Canvas: eslint-plugin-react-refresh
 * flags non-component exports from a component module. Nothing here touches
 * `window`, `document` or React — it is pure geometry, so the caller owns
 * measuring and writing.
 */

export const GUTTER = 24;
export const MARGIN_X = 24;

// With transformOrigin '0 0', pan {0,0} and zoom 1 put canvas (0,0) at viewport
// (0,0) — underneath the fixed user-menu cluster, which runs ~400px right and so
// covers the first two columns. Only a vertical offset clears it. Same value the
// priority and schedule views use as pt-16.
export const MARGIN_TOP = 64;

// Matches the .canvas-content width in Canvas.tsx.
export const CANVAS_WIDTH = 4000;

export type CardBox = { id: string; height: number };

export type Placement = { id: string; x: number; y: number };

/**
 * How many columns of `cardWidth` fit in `availableWidth`, floored at 1 and
 * capped at what the canvas itself can hold.
 */
export const columnsForWidth = (
  availableWidth: number,
  cardWidth: number,
  gutter: number = GUTTER
): number => {
  const fit = (width: number) => Math.floor((width + gutter) / (cardWidth + gutter));
  const byViewport = fit(availableWidth);
  const byCanvas = fit(CANVAS_WIDTH - MARGIN_X * 2);
  return Math.max(1, Math.min(byViewport, byCanvas));
};

/**
 * Masonry: each card goes under the currently shortest column. A fixed row grid
 * would size every row to its tallest card, and item counts of 0..12 make heights
 * differ by hundreds of pixels, so it would leave large holes.
 *
 * Ties break leftmost via the strict `<`, which makes the result deterministic:
 * the same heights in produce the same coordinates out, so arranging twice is a
 * no-op.
 */
export const packColumns = (
  cards: CardBox[],
  opts: {
    columns: number;
    cardWidth: number;
    gutter?: number;
    marginX?: number;
    marginTop?: number;
  }
): Placement[] => {
  const { columns, cardWidth } = opts;
  const gutter = opts.gutter ?? GUTTER;
  const marginX = opts.marginX ?? MARGIN_X;
  const marginTop = opts.marginTop ?? MARGIN_TOP;

  const bottoms = new Array<number>(Math.max(1, columns)).fill(marginTop);

  return cards.map((card) => {
    let column = 0;
    for (let i = 1; i < bottoms.length; i++) {
      if (bottoms[i] < bottoms[column]) column = i;
    }

    const placement: Placement = {
      id: card.id,
      x: marginX + column * (cardWidth + gutter),
      y: bottoms[column],
    };

    bottoms[column] = placement.y + card.height + gutter;
    return placement;
  });
};
