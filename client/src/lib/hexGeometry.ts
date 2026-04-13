/**
 * hexGeometry.ts
 * Pointy-top 正六角形のぴったりくっつけた配置と、頂点・辺の座標計算
 * HexMap (描画) と gameLogic (ロジック) の両方で使用
 *
 * Pointy-top hexagon geometry (カタンと同じ):
 *   六角形の上が尖っている
 *   横間隔 = size * sqrt(3)
 *   縦間隔 = size * 1.5
 *   偶数行は size * sqrt(3) / 2 だけ右にオフセット
 *
 * レイアウト: 3-4-5-4-3 の行ベース配置
 */

import { HEX_LAYOUT } from './gameTypes';

// --- Constants ---
export const HEX_SIZE = 46; // 半径（中心から頂点まで）
export const HEX_W = Math.sqrt(3) * HEX_SIZE; // 横幅 = sqrt(3) * size ≈ 79.7
export const HEX_H = HEX_SIZE * 2;             // 縦幅 = 2 * size = 92

// Pointy-top hex: ぴったりくっつける間隔
export const COL_SPACING = HEX_W;              // 横方向: sqrt(3) * size
export const ROW_SPACING = HEX_SIZE * 1.5;     // 縦方向: 1.5 * size

// 行ごとのタイル数
export const ROWS = [3, 4, 5, 4, 3];
const MAX_COLS = Math.max(...ROWS); // 5

// SVG全体のサイズ計算（余白含む）
const PADDING = 30;
export const SVG_WIDTH = MAX_COLS * COL_SPACING + COL_SPACING / 2 + PADDING * 2;
export const SVG_HEIGHT = (ROWS.length - 1) * ROW_SPACING + HEX_H + PADDING * 2;

// --- SVG全体サイズを動的に計算（mapRows が渡されなければ ROWS を使用） ---
export function getSvgDimensions(mapRows?: number[]): { width: number; height: number } {
  const rows = mapRows ?? ROWS;
  const maxCols = Math.max(...rows);
  return {
    width:  maxCols * COL_SPACING + COL_SPACING / 2 + PADDING * 2,
    height: (rows.length - 1) * ROW_SPACING + HEX_H + PADDING * 2,
  };
}

// --- Pointy-top hex: タイルのインデックスからピクセル中心座標を計算 ---
export function getTileCenter(tileIndex: number, mapRows?: number[]): { x: number; y: number } {
  const rows = mapRows ?? ROWS;
  const maxCols = Math.max(...rows);
  let idx = 0;
  for (let row = 0; row < rows.length; row++) {
    const count = rows[row];
    for (let col = 0; col < count; col++) {
      if (idx === tileIndex) {
        // 中央揃え: 各行のタイル数に応じてオフセット
        // 最大列数に対して、少ない行は右にずらす
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

// --- Pointy-top hex: 6つの頂点座標を取得 ---
// Pointy-top hexagon の頂点は角度 -90°, -30°, 30°, 90°, 150°, 210°
// (角度-90° = 上端の尖り)
// 頂点順序: 0=上, 1=右上, 2=右下, 3=下, 4=左下, 5=左上
export function getHexCorners(cx: number, cy: number, size: number = HEX_SIZE): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2; // Start from -90° (top)
    corners.push({
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle),
    });
  }
  return corners;
}

// --- SVGのポリゴン用ポイント文字列 ---
export function getHexPoints(cx: number, cy: number, size: number = HEX_SIZE): string {
  const corners = getHexCorners(cx, cy, size);
  return corners.map(c => `${c.x},${c.y}`).join(' ');
}

// --- 座標の丸め (浮動小数点誤差を回避) ---
export function roundCoord(n: number): number {
  return Math.round(n * 10) / 10;
}

export function coordKey(x: number, y: number): string {
  return `${roundCoord(x)},${roundCoord(y)}`;
}
