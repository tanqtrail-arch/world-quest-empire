/**
 * hexGeometry.ts
 * 正六角形のぴったりくっつけた配置と、頂点・辺の座標計算
 * HexMap (描画) と gameLogic (ロジック) の両方で使用
 *
 * Flat-top hexagon geometry:
 *   横間隔 = size * 1.5
 *   縦間隔 = size * sqrt(3)
 *   奇数q列は size * sqrt(3) / 2 だけ下にオフセット
 *
 * ただし HEX_LAYOUT は offset coordinates (q, r) で
 * row-based layout (3-4-5-4-3) を使っているので
 * q/r → pixel 変換は row/col ベースで行う
 */

import { HEX_LAYOUT } from './gameTypes';

// --- Constants ---
export const HEX_SIZE = 52;
export const HEX_W = HEX_SIZE * 2;
export const HEX_H = Math.sqrt(3) * HEX_SIZE;
export const ROWS = [3, 4, 5, 4, 3];

// Flat-top hex: ぴったりくっつける間隔
// 横方向: size * 1.5 (= HEX_W * 0.75)
// 縦方向: sqrt(3) * size (= HEX_H)
export const COL_SPACING = HEX_SIZE * 1.5;  // = 78
export const ROW_SPACING = HEX_H;           // = sqrt(3) * 52 ≈ 90.07

// SVG全体のサイズ計算
const MAX_COLS = Math.max(...ROWS);
export const SVG_WIDTH = MAX_COLS * COL_SPACING + HEX_SIZE + 40;
export const SVG_HEIGHT = ROWS.length * ROW_SPACING + HEX_SIZE + 40;

// --- Flat-top hex: タイルのインデックスからピクセル中心座標を計算 ---
export function getTileCenter(tileIndex: number): { x: number; y: number } {
  let idx = 0;
  for (let row = 0; row < ROWS.length; row++) {
    const count = ROWS[row];
    for (let col = 0; col < count; col++) {
      if (idx === tileIndex) {
        // 行ごとのオフセット: 中央揃え
        const rowOffset = (MAX_COLS - count) * COL_SPACING / 2;
        const cx = rowOffset + col * COL_SPACING + HEX_SIZE + 20;
        const cy = row * ROW_SPACING + HEX_SIZE + 20;
        return { x: cx, y: cy };
      }
      idx++;
    }
  }
  return { x: 0, y: 0 };
}

// --- Flat-top hex: 6つの頂点座標を取得 ---
// Flat-top hexagon の頂点は角度 0°, 60°, 120°, 180°, 240°, 300°
// (角度0 = 右端)
export function getHexCorners(cx: number, cy: number, size: number = HEX_SIZE): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i; // 0, 60, 120, 180, 240, 300 degrees
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
