/*
 * HexMap - 六角形マップコンポーネント
 * Design: カタン風の3-4-5-4-3ヘックスグリッド
 * - タイルを大きく表示し、間隔を広げて重なりを解消
 * - 資源アイコンと名前を明確に表示
 * - タイルタップでズームアップ表示
 * - サイコロ出目に対応するタイルをハイライト
 */
import { useGameStore } from '@/lib/gameStore';
import { RESOURCE_INFO, TILE_INFO, type GameTile, type TileType, type ResourceType } from '@/lib/gameTypes';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const HEX_SIZE = 38;
const HEX_GAP = 4;
const HEX_W = HEX_SIZE * 2;
const HEX_H = Math.sqrt(3) * HEX_SIZE;

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

// Zoomed tile detail card
function TileZoomCard({ tile, onClose, playerColors }: {
  tile: GameTile;
  onClose: () => void;
  playerColors: Record<string, string>;
}) {
  const info = tile.type !== 'sea' ? RESOURCE_INFO[tile.type as ResourceType] : null;
  const tileInfo = TILE_INFO[tile.type];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        className="relative z-10 rounded-2xl p-6 min-w-[280px] max-w-[340px] shadow-2xl border-2"
        style={{
          background: `linear-gradient(135deg, ${tileInfo.bgColor}22, ${tileInfo.bgColor}44)`,
          backdropFilter: 'blur(16px)',
          borderColor: tileInfo.color,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg hover:bg-white/30"
        >
          ×
        </button>

        {/* Large hex icon */}
        <div className="flex flex-col items-center mb-4">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl shadow-lg mb-3"
            style={{
              background: `linear-gradient(135deg, ${tileInfo.bgColor}, ${tileInfo.color})`,
              border: `3px solid ${tileInfo.color}`,
            }}
          >
            {info?.icon || '🌊'}
          </div>
          <div className="text-2xl font-heading font-bold text-white drop-shadow-lg">
            {tileInfo.name}タイル
          </div>
          {tile.type !== 'sea' && tile.diceNumber > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-white/80 text-sm">サイコロ出目:</span>
              <span
                className="text-2xl font-score font-black px-3 py-1 rounded-full shadow-lg"
                style={{
                  background: tile.diceNumber === 6 || tile.diceNumber === 8 ? '#E74C3C' : '#FFF8E1',
                  color: tile.diceNumber === 6 || tile.diceNumber === 8 ? '#FFF' : '#2C3E50',
                  border: `2px solid ${tile.diceNumber === 6 || tile.diceNumber === 8 ? '#C0392B' : '#8B6914'}`,
                }}
              >
                {tile.diceNumber}
              </span>
            </div>
          )}
        </div>

        {/* Resource info */}
        {tile.type !== 'sea' && (
          <div className="bg-white/20 rounded-xl p-3 mb-3 backdrop-blur-sm">
            <div className="text-white text-sm text-center">
              サイコロで <strong className="text-yellow-300">{tile.diceNumber}</strong> が出たら
              <br />
              <span className="text-lg font-bold" style={{ color: info?.color }}>
                {info?.icon} {info?.name}
              </span>
              がもらえる！
            </div>
          </div>
        )}

        {/* Structures on this tile */}
        {tile.structures.length > 0 && (
          <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-white/80 text-xs mb-2 font-bold">この土地の建物:</div>
            <div className="flex flex-wrap gap-2">
              {tile.structures.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-white text-xs font-bold"
                  style={{ background: playerColors[s.playerId] || '#888' }}
                >
                  {s.type === 'settlement' ? '🏠' : s.type === 'city' ? '🏰' : '⛵'}
                  {s.type === 'settlement' ? '拠点' : s.type === 'city' ? '都市' : '船'}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center mt-3">
          <span className="text-white/60 text-xs">タップして閉じる</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Dice result zoom overlay - shows which tiles produce resources
function DiceResultZoom({ diceTotal, tiles, playerColors, onClose }: {
  diceTotal: number;
  tiles: GameTile[];
  playerColors: Record<string, string>;
  onClose: () => void;
}) {
  const matchingTiles = tiles.filter(t => t.diceNumber === diceTotal && t.type !== 'sea');
  const producingTiles = matchingTiles.filter(t => t.structures.length > 0);
  const nonProducingTiles = matchingTiles.filter(t => t.structures.length === 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        initial={{ scale: 0.7, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.7, y: 30 }}
        className="relative z-10 rounded-2xl p-5 min-w-[300px] max-w-[380px] shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          border: '2px solid #FFD700',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Dice result header */}
        <div className="text-center mb-4">
          <div className="text-yellow-400 text-sm font-bold mb-1">🎲 サイコロの結果</div>
          <div className="text-5xl font-score font-black text-yellow-300 drop-shadow-lg">
            {diceTotal}
          </div>
        </div>

        {/* Producing tiles */}
        {producingTiles.length > 0 && (
          <div className="mb-3">
            <div className="text-emerald-400 text-sm font-bold mb-2 text-center">
              ✨ 資源がもらえるタイル！
            </div>
            <div className="space-y-2">
              {producingTiles.map(tile => {
                const info = RESOURCE_INFO[tile.type as ResourceType];
                return (
                  <motion.div
                    key={tile.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-3 rounded-xl p-3"
                    style={{
                      background: `linear-gradient(90deg, ${info.color}33, transparent)`,
                      border: `1px solid ${info.color}66`,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg shrink-0"
                      style={{ background: `linear-gradient(135deg, ${TILE_INFO[tile.type].bgColor}, ${TILE_INFO[tile.type].color})` }}
                    >
                      {info.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-bold text-sm">
                        {info.icon} {info.name}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tile.structures.map((s, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-bold"
                            style={{ background: playerColors[s.playerId] || '#888' }}
                          >
                            {s.type === 'settlement' ? '🏠 +1' : s.type === 'city' ? '🏰 +2' : '⛵'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.3, 1] }}
                      transition={{ delay: 0.5, duration: 0.4 }}
                      className="text-3xl"
                    >
                      {info.icon}
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Non-producing tiles */}
        {nonProducingTiles.length > 0 && (
          <div className="mb-3">
            <div className="text-amber-400/70 text-xs font-bold mb-1 text-center">
              出目 {diceTotal} のタイル（拠点なし）
            </div>
            <div className="flex flex-wrap gap-1 justify-center">
              {nonProducingTiles.map(tile => {
                const info = RESOURCE_INFO[tile.type as ResourceType];
                return (
                  <span
                    key={tile.id}
                    className="text-xs px-2 py-1 rounded-lg text-white/60"
                    style={{ background: `${TILE_INFO[tile.type].color}33` }}
                  >
                    {info?.icon} {info?.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* No matching tiles */}
        {matchingTiles.length === 0 && (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">😢</div>
            <div className="text-white/70 text-sm">
              出目 {diceTotal} のタイルがないよ…
            </div>
          </div>
        )}

        {/* No structures on matching tiles */}
        {matchingTiles.length > 0 && producingTiles.length === 0 && (
          <div className="text-center py-2">
            <div className="text-amber-400/70 text-sm">
              😢 このタイルには拠点がないので資源はもらえなかった…
            </div>
            <div className="text-white/50 text-xs mt-1">
              拠点を建てれば次から資源がもらえるよ！
            </div>
          </div>
        )}

        <div className="text-center mt-3">
          <button
            onClick={onClose}
            className="game-btn-primary text-sm px-6 py-2 rounded-xl"
          >
            OK
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface HexTileProps {
  tile: GameTile;
  cx: number;
  cy: number;
  isHighlighted: boolean;
  isBuildable: boolean;
  isSelected: boolean;
  playerColors: Record<string, string>;
  onTap: (tileId: number) => void;
}

function HexTile({ tile, cx, cy, isHighlighted, isBuildable, isSelected, playerColors, onTap }: HexTileProps) {
  const tileInfo = TILE_INFO[tile.type];
  const resInfo = tile.type !== 'sea' ? RESOURCE_INFO[tile.type as ResourceType] : null;

  const getGradient = (type: TileType): [string, string] => {
    switch (type) {
      case 'rubber': return ['#66BB6A', '#2E7D32'];
      case 'oil': return ['#546E7A', '#263238'];
      case 'gold': return ['#FFD54F', '#F9A825'];
      case 'food': return ['#FFA726', '#E65100'];
      case 'sea': return ['#4FC3F7', '#0288D1'];
    }
  };
  const [c1, c2] = getGradient(tile.type);

  const darken = (hex: string) => {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  return (
    <g
      style={{
        cursor: isBuildable ? 'pointer' : 'pointer',
        filter: isHighlighted
          ? 'drop-shadow(0 0 12px rgba(255, 215, 0, 0.95))'
          : isBuildable
            ? 'drop-shadow(0 0 8px rgba(46, 204, 113, 0.8))'
            : isSelected
              ? 'drop-shadow(0 0 6px rgba(52, 152, 219, 0.7))'
              : 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))',
      }}
      onClick={() => onTap(tile.id)}
    >
      <defs>
        <linearGradient id={`grad-${tile.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>

      {/* Main hex shape */}
      <polygon
        points={getHexPoints(cx, cy, HEX_SIZE - 1)}
        fill={`url(#grad-${tile.id})`}
        stroke={
          isHighlighted ? '#FFD700' :
          isBuildable ? '#2ECC71' :
          isSelected ? '#3498DB' :
          '#5C3D2E'
        }
        strokeWidth={isHighlighted ? 3 : isBuildable ? 2.5 : 2}
      />

      {/* Highlight glow for dice match */}
      {isHighlighted && (
        <>
          <polygon
            points={getHexPoints(cx, cy, HEX_SIZE - 1)}
            fill="rgba(255,215,0,0.2)"
          >
            <animate attributeName="opacity" values="0.1;0.35;0.1" dur="1.2s" repeatCount="indefinite" />
          </polygon>
          <polygon
            points={getHexPoints(cx, cy, HEX_SIZE - 4)}
            fill="none"
            stroke="#FFD700"
            strokeWidth={1.5}
            strokeDasharray="4,3"
          >
            <animate attributeName="stroke-dashoffset" values="0;14" dur="1s" repeatCount="indefinite" />
          </polygon>
        </>
      )}

      {/* Buildable pulse */}
      {isBuildable && !isHighlighted && (
        <polygon
          points={getHexPoints(cx, cy, HEX_SIZE - 1)}
          fill="rgba(46, 204, 113, 0.15)"
          stroke="#2ECC71"
          strokeWidth={2}
          strokeDasharray="5,3"
        >
          <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite" />
        </polygon>
      )}

      {/* Resource icon - large and centered */}
      <text
        x={cx}
        y={tile.type === 'sea' ? cy : cy - 5}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={tile.type === 'sea' ? 22 : 20}
        className="select-none pointer-events-none"
      >
        {resInfo?.icon || '🌊'}
      </text>

      {/* Resource name label */}
      {tile.type !== 'sea' && (
        <text
          x={cx}
          y={cy - 18}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={8}
          fontWeight="bold"
          fill="white"
          className="select-none pointer-events-none"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
        >
          {resInfo?.name}
        </text>
      )}

      {/* Dice number badge */}
      {tile.type !== 'sea' && tile.diceNumber > 0 && (
        <>
          <circle
            cx={cx}
            cy={cy + 15}
            r={11}
            fill={isHighlighted ? '#FFD700' : '#FFF8E1'}
            stroke={isHighlighted ? '#B8860B' : '#5C3D2E'}
            strokeWidth={isHighlighted ? 2 : 1.5}
          />
          <text
            x={cx}
            y={cy + 16}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={13}
            fontWeight="bold"
            fontFamily="'Fredoka', sans-serif"
            fill={
              isHighlighted ? '#5C3D2E' :
              tile.diceNumber === 6 || tile.diceNumber === 8 ? '#E74C3C' : '#2C3E50'
            }
            className="select-none pointer-events-none"
          >
            {tile.diceNumber}
          </text>
        </>
      )}

      {/* Player structures - positioned around the hex edge */}
      {tile.structures.map((struct, i) => {
        const angle = (Math.PI * 2 / Math.max(tile.structures.length, 1)) * i - Math.PI / 2;
        const dist = HEX_SIZE - 10;
        const sx = cx + Math.cos(angle) * dist;
        const sy = cy + Math.sin(angle) * dist;
        const pColor = playerColors[struct.playerId] || '#888';

        return (
          <g key={i}>
            {struct.type === 'settlement' && (
              <>
                <circle cx={sx} cy={sy} r={7} fill={pColor} stroke="#FFF" strokeWidth={1.5} />
                <text x={sx} y={sy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={8} className="select-none pointer-events-none">
                  🏠
                </text>
              </>
            )}
            {struct.type === 'city' && (
              <>
                <circle cx={sx} cy={sy} r={8} fill={pColor} stroke="#FFD700" strokeWidth={2} />
                <text x={sx} y={sy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={9} className="select-none pointer-events-none">
                  🏰
                </text>
              </>
            )}
            {struct.type === 'ship' && (
              <>
                <circle cx={sx} cy={sy} r={7} fill={pColor} stroke="#FFF" strokeWidth={1.5} />
                <text x={sx} y={sy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={9} className="select-none pointer-events-none">
                  ⛵
                </text>
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

export default function HexMap() {
  const { tiles, players, currentPlayerIndex, highlightedTileIds, buildMode, selectedTileId, selectTile, phase, diceResult, showResourceGains, resourceGains, dismissResourceGains, isPlayingAI } = useGameStore();
  const currentPlayer = players[currentPlayerIndex];
  const [zoomedTile, setZoomedTile] = useState<GameTile | null>(null);
  const [showDiceZoom, setShowDiceZoom] = useState(false);

  // Build a map of playerId -> color
  const playerColors: Record<string, string> = {};
  players.forEach(p => { playerColors[p.id] = p.color; });

  const diceTotal = diceResult ? diceResult[0] + diceResult[1] : 0;

  // Show dice result zoom when dice is rolled and there are highlighted tiles
  const shouldShowDiceZoom = phase === 'action' && diceResult && highlightedTileIds.length > 0 && showResourceGains !== false && !isPlayingAI;

  const handleTileClick = (tileId: number) => {
    // If in build mode, delegate to store
    if (buildMode) {
      selectTile(tileId);
      return;
    }

    // Otherwise, zoom into the tile
    const tile = tiles.find(t => t.id === tileId);
    if (tile) {
      setZoomedTile(tile);
    }
  };

  // Calculate positions with more spacing
  const colSpacing = HEX_W * 0.75 + HEX_GAP;
  const rowSpacing = HEX_H + HEX_GAP;
  const maxCols = Math.max(...ROWS);
  const svgWidth = maxCols * colSpacing + HEX_SIZE + 20;
  const svgHeight = ROWS.length * rowSpacing + HEX_SIZE + 20;

  let tileIndex = 0;

  return (
    <div className="flex flex-col items-center overflow-hidden w-full">
      {/* Build mode indicator */}
      {buildMode && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-emerald-500/90 text-white font-heading font-bold text-sm px-5 py-2 rounded-full mb-1 shadow-lg"
        >
          <span className="animate-pulse inline-block mr-1">
            {buildMode === 'settlement' ? '🏠' : buildMode === 'city' ? '🏰' : '⛵'}
          </span>
          {buildMode === 'settlement' ? '拠点を建てるタイルをタップ！' :
           buildMode === 'city' ? 'アップグレードする拠点をタップ！' :
           '船を置くタイルをタップ！'}
        </motion.div>
      )}

      {/* SVG Map */}
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        style={{ maxWidth: `${svgWidth}px`, maxHeight: '44vh' }}
        className="drop-shadow-lg"
      >
        {ROWS.map((count, row) => {
          const rowOffset = (maxCols - count) * colSpacing / 2;
          return Array.from({ length: count }).map((_, col) => {
            const tile = tiles[tileIndex];
            if (!tile) return null;
            tileIndex++;

            const cx = rowOffset + col * colSpacing + HEX_SIZE + 10;
            const cy = row * rowSpacing + HEX_SIZE + 10;

            const isHighlighted = highlightedTileIds.includes(tile.id);
            const isBuildable = buildMode !== null && highlightedTileIds.includes(tile.id);
            const isSelected = selectedTileId === tile.id;

            return (
              <HexTile
                key={tile.id}
                tile={tile}
                cx={cx}
                cy={cy}
                isHighlighted={isHighlighted && !buildMode}
                isBuildable={isBuildable}
                isSelected={isSelected}
                playerColors={playerColors}
                onTap={handleTileClick}
              />
            );
          });
        })}
      </svg>

      {/* Tile Zoom Card */}
      <AnimatePresence>
        {zoomedTile && (
          <TileZoomCard
            tile={zoomedTile}
            onClose={() => setZoomedTile(null)}
            playerColors={playerColors}
          />
        )}
      </AnimatePresence>

      {/* Dice Result Zoom - shows which tiles produce resources */}
      <AnimatePresence>
        {shouldShowDiceZoom && (
          <DiceResultZoom
            diceTotal={diceTotal}
            tiles={tiles}
            playerColors={playerColors}
            onClose={() => {
              dismissResourceGains();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
