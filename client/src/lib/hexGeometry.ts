/**
 * hexGeometry.ts
 * Pointy-top hex geometry for both standard (3-4-5-4-3) and large (4-5-6-5-4) maps.
 * Exports functions and constants, with dynamic sizing based on tile count.
 */

// --- Constants ---
export const HEX_SIZE = 46;
export const HEX_W = Math.sqrt(3) * HEX_SIZE;
export const HEX_H = HEX_SIZE * 2;
export const COL_SPACING = HEX_W;
export const ROW_SPACING = HEX_SIZE * 1.5;

// --- Standard map (19 tiles, 3-4-5-4-3) ---
export const ROWS = [3, 4, 5, 4, 3];
const MAX_COLS = Math.max(...ROWS); // 5
const PADDING = 30;
export const SVG_WIDTH = MAX_COLS * COL_SPACING + COL_SPACING / 2 + PADDING * 2;
export const SVG_HEIGHT = (ROWS.length - 1) * ROW_SPACING + HEX_H + PADDING * 2;

// --- Large map (24 tiles, 4-5-6-5-4) ---
export const ROWS_LARGE = [4, 5, 6, 5, 4];
const MAX_COLS_LARGE = Math.max(...ROWS_LARGE); // 6
export const SVG_WIDTH_LARGE = MAX_COLS_LARGE * COL_SPACING + COL_SPACING / 2 + PADDING * 2;
export const SVG_HEIGHT_LARGE = (ROWS_LARGE.length - 1) * ROW_SPACING + HEX_H + PADDING * 2;

// --- Get dimensions for a given row layout ---
export function getSvgDimensions(rows: number[]): { width: number; height: number } {
  const maxCols = Math.max(...rows);
  return {
    width: maxCols * COL_SPACING + COL_SPACING / 2 + PADDING * 2,
    height: (rows.length - 1) * ROW_SPACING + HEX_H + PADDING * 2,
  };
}

// --- Tile center calculation (works for any row layout) ---
export function getTileCenter(tileIndex: number, rows: number[] = ROWS): { x: number; y: number } {
  const maxCols = Math.max(...rows);
  let idx = 0;
  for (let row = 0; row < rows.length; row++) {
    const count = rows[row];
    for (let col = 0; col < count; col++) {
      if (idx === tileIndex) {
        const rowOffsetX = ((maxCols - count) / 2) * COL_SPACING;
        const cx = PADDING + COL_SPACING / 2 + col * COL_SPACING + rowOffsetX;
        const cy = PADDING + HEX_SIZE + row * ROW_SPACING;
        return { x: cx, y: cy };
      }
      idx++;
    }
  }
  return { x: 0, y: 0 };
}

// --- Pointy-top hex corners ---
export function getHexCorners(cx: number, cy: number, size: number = HEX_SIZE): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    corners.push({
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle),
    });
  }
  return corners;
}

// --- SVG polygon points string ---
export function getHexPoints(cx: number, cy: number, size: number = HEX_SIZE): string {
  const corners = getHexCorners(cx, cy, size);
  return corners.map(c => `${c.x},${c.y}`).join(' ');
}

// --- Coordinate rounding ---
export function roundCoord(n: number): number {
  return Math.round(n * 10) / 10;
}

export function coordKey(x: number, y: number): string {
  return `${roundCoord(x)},${roundCoord(y)}`;
}
