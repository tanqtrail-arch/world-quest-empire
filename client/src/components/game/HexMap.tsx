/*
 * HexMap - 六角形マップコンポーネント
 * Design: カタン風の3-4-5-4-3ヘックスグリッド
 * - 各タイルに資源タイプ、サイコロ番号、建物を表示
 * - 各プレイヤーの色で建物を表示
 */
import { useGameStore } from '@/lib/gameStore';
import { TILE_INFO, type GameTile, type TileType } from '@/lib/gameTypes';
import { motion } from 'framer-motion';

const HEX_SIZE = 42;
const HEX_W = HEX_SIZE * 2;
const HEX_H = Math.sqrt(3) * HEX_SIZE;

const TILE_ICONS: Record<TileType, string> = {
  rubber: '🌿',
  oil: '🛢️',
  gold: '💰',
  food: '🌾',
  sea: '🌊',
};

const ROWS = [3, 4, 5, 4, 3];

function getHexPoints(cx: number, cy: number, size: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

interface HexTileProps {
  tile: GameTile;
  cx: number;
  cy: number;
  isHighlighted: boolean;
  playerColors: Record<string, string>;
  currentPlayerId?: string;
}

function HexTile({ tile, cx, cy, isHighlighted, playerColors, currentPlayerId }: HexTileProps) {
  const icon = TILE_ICONS[tile.type];

  const getGradient = (type: TileType): [string, string] => {
    switch (type) {
      case 'rubber': return ['#4CAF50', '#2E7D32'];
      case 'oil': return ['#455A64', '#263238'];
      case 'gold': return ['#FFD54F', '#F9A825'];
      case 'food': return ['#FFB74D', '#E65100'];
      case 'sea': return ['#4FC3F7', '#0288D1'];
    }
  };
  const [c1, c2] = getGradient(tile.type);

  return (
    <g style={{ filter: isHighlighted ? 'drop-shadow(0 0 8px rgba(46, 204, 113, 0.8))' : undefined }}>
      <defs>
        <linearGradient id={`grad-${tile.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>

      {/* Hex shape */}
      <polygon
        points={getHexPoints(cx, cy, HEX_SIZE - 1)}
        fill={`url(#grad-${tile.id})`}
        stroke="#5C3D2E"
        strokeWidth={2.5}
      />

      {/* Inner highlight */}
      <polygon
        points={getHexPoints(cx, cy, HEX_SIZE - 6)}
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={1}
      />

      {/* Resource icon */}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={tile.type === 'sea' ? 20 : 18}
        className="select-none pointer-events-none"
      >
        {icon}
      </text>

      {/* Dice number */}
      {tile.type !== 'sea' && tile.diceNumber > 0 && (
        <>
          <circle
            cx={cx}
            cy={cy + 14}
            r={12}
            fill="#FFF8E1"
            stroke="#5C3D2E"
            strokeWidth={1.5}
          />
          <text
            x={cx}
            y={cy + 15}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={14}
            fontWeight="bold"
            fontFamily="'Fredoka', sans-serif"
            fill={tile.diceNumber === 6 || tile.diceNumber === 8 ? '#E74C3C' : '#2C3E50'}
            className="select-none pointer-events-none"
          >
            {tile.diceNumber}
          </text>
        </>
      )}

      {/* Player structures */}
      {tile.structures.map((struct, i) => {
        const angle = (Math.PI * 2 / Math.max(tile.structures.length, 1)) * i - Math.PI / 2;
        const dist = 22;
        const sx = cx + Math.cos(angle) * dist;
        const sy = cy + Math.sin(angle) * dist - 4;
        const pColor = playerColors[struct.playerId] || '#888';
        const isMe = struct.playerId === currentPlayerId;
        // Darken color for roofs
        const darken = (hex: string) => {
          const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
          const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
          const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
          return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };

        return (
          <g key={i}>
            {struct.type === 'settlement' && (
              <>
                <rect
                  x={sx - 6}
                  y={sy - 4}
                  width={12}
                  height={10}
                  fill={pColor}
                  stroke="#FFF"
                  strokeWidth={1}
                  rx={1}
                />
                <polygon
                  points={`${sx - 7},${sy - 4} ${sx},${sy - 10} ${sx + 7},${sy - 4}`}
                  fill={darken(pColor)}
                  stroke="#FFF"
                  strokeWidth={1}
                />
              </>
            )}
            {struct.type === 'city' && (
              <>
                <rect
                  x={sx - 8}
                  y={sy - 4}
                  width={16}
                  height={12}
                  fill={pColor}
                  stroke="#FFD700"
                  strokeWidth={1.5}
                  rx={1}
                />
                <polygon
                  points={`${sx - 9},${sy - 4} ${sx},${sy - 12} ${sx + 9},${sy - 4}`}
                  fill={darken(pColor)}
                  stroke="#FFD700"
                  strokeWidth={1.5}
                />
                <text
                  x={sx}
                  y={sy + 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={8}
                  fill="#FFD700"
                  className="select-none pointer-events-none"
                >
                  ★
                </text>
              </>
            )}
            {struct.type === 'ship' && (
              <text
                x={sx}
                y={sy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={14}
                className="select-none pointer-events-none"
              >
                ⛵
              </text>
            )}
          </g>
        );
      })}

      {/* Highlight for buildable */}
      {isHighlighted && (
        <polygon
          points={getHexPoints(cx, cy, HEX_SIZE - 1)}
          fill="rgba(46, 204, 113, 0.25)"
          stroke="#2ECC71"
          strokeWidth={3}
          strokeDasharray="6,3"
          className="animate-pulse"
        />
      )}
    </g>
  );
}

export default function HexMap() {
  const { tiles, players, currentPlayerIndex } = useGameStore();
  const currentPlayer = players[currentPlayerIndex];

  // Build a map of playerId -> color
  const playerColors: Record<string, string> = {};
  players.forEach(p => { playerColors[p.id] = p.color; });

  // Calculate positions
  const totalWidth = ROWS.reduce((max, count) => Math.max(max, count), 0) * (HEX_W * 0.75) + HEX_SIZE;
  const totalHeight = ROWS.length * HEX_H + HEX_SIZE;
  const svgWidth = totalWidth + 20;
  const svgHeight = totalHeight + 20;

  let tileIndex = 0;

  return (
    <div className="flex justify-center overflow-hidden">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        style={{ maxWidth: `${svgWidth}px`, maxHeight: '48vh' }}
        className="drop-shadow-lg"
      >
        {ROWS.map((count, row) => {
          const rowOffset = (5 - count) * (HEX_W * 0.75) / 2;
          return Array.from({ length: count }).map((_, col) => {
            const tile = tiles[tileIndex];
            if (!tile) return null;
            tileIndex++;

            const cx = rowOffset + col * (HEX_W * 0.75) + HEX_SIZE + 10;
            const cy = row * HEX_H + HEX_SIZE + 10;

            return (
              <HexTile
                key={tile.id}
                tile={tile}
                cx={cx}
                cy={cy}
                isHighlighted={false}
                playerColors={playerColors}
                currentPlayerId={currentPlayer?.id}
              />
            );
          });
        })}
      </svg>
    </div>
  );
}
