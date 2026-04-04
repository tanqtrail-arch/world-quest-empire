/*
 * HexMap - ヘックスマップコンポーネント
 * Design: スマホ最適化、大きなタイル、国旗マーカー、サイコロ出目ズームアップ
 * - タイルに国旗🇯🇵🇬🇧🇫🇷を立てて所有者を明確に
 * - スマホでスクロール可能な大きなマップ
 * - サイコロ出目時に該当タイルをズームアップ表示
 */
import { useGameStore } from '@/lib/gameStore';
import { TILE_INFO, RESOURCE_INFO, type ResourceType, type TileType, type GameTile, type EventCard } from '@/lib/gameTypes';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';

// --- Hex geometry ---
const HEX_SIZE = 52;
const HEX_GAP = 6;
const HEX_W = HEX_SIZE * 2;
const HEX_H = Math.sqrt(3) * HEX_SIZE;
const ROWS = [3, 4, 5, 4, 3];

function getHexPoints(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

// --- Tile Zoom Card (tap to see details) ---
function TileZoomCard({ tile, onClose, playerColors, playerFlags }: {
  tile: GameTile;
  onClose: () => void;
  playerColors: Record<string, string>;
  playerFlags: Record<string, string>;
}) {
  const tileInfo = TILE_INFO[tile.type];
  const resInfo = tile.type !== 'sea' ? RESOURCE_INFO[tile.type as ResourceType] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.5, y: 40 }}
        className="parchment rounded-2xl p-5 mx-4 max-w-sm w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Tile header */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shadow-lg"
            style={{ background: `linear-gradient(135deg, ${tileInfo.bgColor}, ${tileInfo.color})` }}
          >
            {resInfo?.icon || '🌊'}
          </div>
          <div>
            <div className="font-heading font-bold text-xl text-amber-900">
              {tileInfo.name}タイル
            </div>
            {tile.type !== 'sea' && tile.diceNumber > 0 && (
              <div className="text-amber-700 text-sm">
                サイコロ出目: <span className="font-score font-bold text-lg">{tile.diceNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Structures on this tile */}
        {tile.structures.length > 0 ? (
          <div className="mb-3">
            <div className="text-amber-800 font-heading font-bold text-sm mb-1">🏴 この土地の所有者</div>
            <div className="flex flex-wrap gap-2">
              {tile.structures.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-sm font-bold shadow"
                  style={{ backgroundColor: playerColors[s.playerId] || '#888' }}
                >
                  <span className="text-lg">{playerFlags[s.playerId] || '🏳️'}</span>
                  <span>{s.type === 'settlement' ? '🏠拠点' : s.type === 'city' ? '🏰都市' : '⛵船'}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-amber-600 text-sm mb-3 bg-amber-50 rounded-lg p-2">
            🏳️ まだ誰も所有していない土地です。拠点を建てよう！
          </div>
        )}

        {/* Resource explanation */}
        {tile.type !== 'sea' && (
          <div className="bg-amber-50 rounded-lg p-2 text-amber-800 text-xs">
            サイコロで <span className="font-bold text-lg">{tile.diceNumber}</span> が出たら、
            ここに拠点がある人は <span className="font-bold">{resInfo?.icon}{resInfo?.name}</span> がもらえるよ！
            {tile.structures.some(s => s.type === 'city') && (
              <span className="text-amber-600"> 🏰都市なら2倍！</span>
            )}
          </div>
        )}

        <div className="text-center mt-4">
          <button
            onClick={onClose}
            className="game-btn-primary text-sm px-8 py-2.5 rounded-xl"
          >
            とじる
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Dice Result Zoom (shows which tiles produce resources after dice roll) ---
function DiceResultZoom({ diceTotal, tiles, playerColors, playerFlags, onClose, pendingEvent }: {
  diceTotal: number;
  tiles: GameTile[];
  playerColors: Record<string, string>;
  playerFlags: Record<string, string>;
  onClose: () => void;
  pendingEvent?: EventCard | null;
}) {
  const matchingTiles = tiles.filter(t => t.diceNumber === diceTotal && t.type !== 'sea');
  const producingTiles = matchingTiles.filter(t => t.structures.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.5, y: 50 }}
        className="parchment rounded-2xl p-5 mx-4 max-w-sm w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-3">
          <div className="font-heading font-bold text-amber-900 text-lg">🎲 サイコロの結果</div>
          <div className="font-score text-4xl font-bold text-amber-800 my-1">{diceTotal}</div>
        </div>

        {/* Matching tiles */}
        {matchingTiles.length > 0 ? (
          <div className="space-y-2 mb-3">
            {matchingTiles.map(tile => {
              const resInfo = RESOURCE_INFO[tile.type as ResourceType];
              const tileInfo = TILE_INFO[tile.type];
              const hasStructures = tile.structures.length > 0;

              return (
                <motion.div
                  key={tile.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className={`rounded-xl p-3 ${hasStructures ? 'ring-2 ring-yellow-400 shadow-lg' : 'opacity-70'}`}
                  style={{ background: `linear-gradient(135deg, ${tileInfo.bgColor}40, ${tileInfo.color}30)`, border: `2px solid ${tileInfo.color}60` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{resInfo.icon}</span>
                    <span className="font-heading font-bold text-amber-900">{resInfo.name}</span>
                    {hasStructures && (
                      <span className="ml-auto text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold animate-pulse">
                        ✨ 資源ゲット！
                      </span>
                    )}
                  </div>
                  {hasStructures && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {tile.structures.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-white text-xs font-bold"
                          style={{ backgroundColor: playerColors[s.playerId] || '#888' }}
                        >
                          <span>{playerFlags[s.playerId] || '🏳️'}</span>
                          <span>{s.type === 'settlement' ? '+1' : '+2'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!hasStructures && (
                    <div className="text-amber-600 text-xs mt-1">拠点なし — 建てれば次から資源がもらえる！</div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-3 text-amber-600 text-sm">
            この出目({diceTotal})のタイルはありません
          </div>
        )}

        {producingTiles.length === 0 && matchingTiles.length > 0 && (
          <div className="text-center py-2 text-amber-500 text-sm">
            😢 拠点がないので資源はもらえなかった…
          </div>
        )}

        {/* Pending event preview */}
        {pendingEvent && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`rounded-xl p-2.5 mt-2 text-center border-2 ${
              pendingEvent.category === 'positive'
                ? 'bg-green-50 border-green-400 text-green-800'
                : 'bg-red-50 border-red-400 text-red-800'
            }`}
          >
            <div className="text-lg mb-0.5">{pendingEvent.icon}</div>
            <div className="font-heading font-bold text-sm">
              {pendingEvent.category === 'positive' ? '✨ イベント発生！' : '⚠️ イベント発生！'}
            </div>
            <div className="text-xs">{pendingEvent.title}</div>
          </motion.div>
        )}

        <div className="text-center mt-3">
          <button onClick={onClose} className="game-btn-primary text-sm px-8 py-2.5 rounded-xl">
            {pendingEvent ? 'イベントを見る' : 'OK'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Single Hex Tile ---
interface HexTileProps {
  tile: GameTile;
  cx: number;
  cy: number;
  isHighlighted: boolean;
  isBuildable: boolean;
  isSelected: boolean;
  playerColors: Record<string, string>;
  playerFlags: Record<string, string>;
  onTap: (tileId: number) => void;
}

function HexTile({ tile, cx, cy, isHighlighted, isBuildable, isSelected, playerColors, playerFlags, onTap }: HexTileProps) {
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

  // Flag positions around the hex for structures
  const getStructurePos = (index: number, total: number) => {
    // Place flags at specific positions around the hex
    const positions = [
      { x: cx, y: cy - HEX_SIZE + 8 },          // top
      { x: cx + HEX_SIZE - 14, y: cy - 8 },     // top-right
      { x: cx - HEX_SIZE + 14, y: cy - 8 },     // top-left
      { x: cx + HEX_SIZE - 14, y: cy + 12 },    // bottom-right
      { x: cx - HEX_SIZE + 14, y: cy + 12 },    // bottom-left
      { x: cx, y: cy + HEX_SIZE - 12 },          // bottom
    ];
    return positions[index % positions.length];
  };

  return (
    <g
      style={{
        cursor: 'pointer',
        filter: isHighlighted
          ? 'drop-shadow(0 0 16px rgba(255, 215, 0, 1))'
          : isBuildable
            ? 'drop-shadow(0 0 10px rgba(46, 204, 113, 0.9))'
            : isSelected
              ? 'drop-shadow(0 0 8px rgba(52, 152, 219, 0.8))'
              : 'drop-shadow(0 3px 4px rgba(0,0,0,0.35))',
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
        strokeWidth={isHighlighted ? 3.5 : isBuildable ? 3 : 2}
      />

      {/* Inner hex pattern for texture */}
      <polygon
        points={getHexPoints(cx, cy, HEX_SIZE - 8)}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={1}
      />

      {/* Highlight glow for dice match */}
      {isHighlighted && (
        <>
          <polygon
            points={getHexPoints(cx, cy, HEX_SIZE - 1)}
            fill="rgba(255,215,0,0.25)"
          >
            <animate attributeName="opacity" values="0.1;0.4;0.1" dur="1s" repeatCount="indefinite" />
          </polygon>
          <polygon
            points={getHexPoints(cx, cy, HEX_SIZE - 5)}
            fill="none"
            stroke="#FFD700"
            strokeWidth={2}
            strokeDasharray="6,4"
          >
            <animate attributeName="stroke-dashoffset" values="0;20" dur="1.2s" repeatCount="indefinite" />
          </polygon>
        </>
      )}

      {/* Buildable pulse */}
      {isBuildable && !isHighlighted && (
        <polygon
          points={getHexPoints(cx, cy, HEX_SIZE - 1)}
          fill="rgba(46, 204, 113, 0.2)"
          stroke="#2ECC71"
          strokeWidth={2.5}
          strokeDasharray="6,4"
        >
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite" />
        </polygon>
      )}

      {/* Resource icon - large and centered */}
      <text
        x={cx}
        y={tile.type === 'sea' ? cy - 2 : cy - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={tile.type === 'sea' ? 26 : 24}
        className="select-none pointer-events-none"
      >
        {resInfo?.icon || '🌊'}
      </text>

      {/* Resource name label */}
      {tile.type !== 'sea' && (
        <text
          x={cx}
          y={cy - 24}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fontWeight="bold"
          fill="white"
          className="select-none pointer-events-none"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
        >
          {resInfo?.name}
        </text>
      )}

      {/* Dice number badge */}
      {tile.type !== 'sea' && tile.diceNumber > 0 && (
        <>
          <circle
            cx={cx}
            cy={cy + 18}
            r={13}
            fill={isHighlighted ? '#FFD700' : '#FFF8E1'}
            stroke={isHighlighted ? '#B8860B' : '#5C3D2E'}
            strokeWidth={isHighlighted ? 2.5 : 2}
          />
          <text
            x={cx}
            y={cy + 19}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={15}
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

      {/* Player structures - FLAGS on tiles! */}
      {tile.structures.map((struct, i) => {
        const pos = getStructurePos(i, tile.structures.length);
        const pColor = playerColors[struct.playerId] || '#888';
        const pFlag = playerFlags[struct.playerId] || '🏳️';

        return (
          <g key={i}>
            {/* Flag pole */}
            <line
              x1={pos.x}
              y1={pos.y + 2}
              x2={pos.x}
              y2={pos.y - 14}
              stroke="#5C3D2E"
              strokeWidth={2}
              strokeLinecap="round"
            />
            {/* Flag background circle */}
            <circle
              cx={pos.x}
              cy={pos.y - 14}
              r={struct.type === 'city' ? 12 : 10}
              fill={pColor}
              stroke={struct.type === 'city' ? '#FFD700' : '#FFF'}
              strokeWidth={struct.type === 'city' ? 2.5 : 1.5}
            />
            {/* Flag emoji */}
            <text
              x={pos.x}
              y={pos.y - 13}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={struct.type === 'city' ? 13 : 11}
              className="select-none pointer-events-none"
            >
              {pFlag}
            </text>
            {/* Structure type indicator below flag */}
            <text
              x={pos.x}
              y={pos.y + 6}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={8}
              className="select-none pointer-events-none"
            >
              {struct.type === 'settlement' ? '🏠' : struct.type === 'city' ? '🏰' : '⛵'}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export default function HexMap() {
  const {
    tiles, players, currentPlayerIndex, highlightedTileIds,
    buildMode, selectedTileId, selectTile, phase, diceResult,
    showResourceGains, resourceGains, dismissResourceGains, isPlayingAI,
    pendingEvent
  } = useGameStore();
  const currentPlayer = players[currentPlayerIndex];
  const [zoomedTile, setZoomedTile] = useState<GameTile | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Build maps of playerId -> color/flag
  const playerColors: Record<string, string> = {};
  const playerFlags: Record<string, string> = {};
  players.forEach(p => {
    playerColors[p.id] = p.color;
    playerFlags[p.id] = p.flagEmoji;
  });

  const diceTotal = diceResult ? diceResult[0] + diceResult[1] : 0;

  // Show dice result zoom when dice is rolled and there are highlighted tiles
  const shouldShowDiceZoom = phase === 'action' && diceResult && showResourceGains && !isPlayingAI;

  // Auto-scroll to highlighted tiles when dice is rolled
  useEffect(() => {
    if (highlightedTileIds.length > 0 && mapRef.current) {
      // Scroll the map to center on highlighted tiles
      const svg = mapRef.current.querySelector('svg');
      if (svg) {
        mapRef.current.scrollTo({
          top: Math.max(0, mapRef.current.scrollHeight / 2 - mapRef.current.clientHeight / 2),
          behavior: 'smooth',
        });
      }
    }
  }, [highlightedTileIds]);

  const handleTileClick = (tileId: number) => {
    if (buildMode) {
      selectTile(tileId);
      return;
    }
    const tile = tiles.find(t => t.id === tileId);
    if (tile) {
      setZoomedTile(tile);
    }
  };

  // Calculate positions with more spacing for bigger tiles
  const colSpacing = HEX_W * 0.78 + HEX_GAP;
  const rowSpacing = HEX_H + HEX_GAP + 4;
  const maxCols = Math.max(...ROWS);
  const svgWidth = maxCols * colSpacing + HEX_SIZE + 30;
  const svgHeight = ROWS.length * rowSpacing + HEX_SIZE + 40;

  let tileIndex = 0;

  return (
    <div className="flex flex-col items-center w-full">
      {/* Build mode indicator */}
      {buildMode && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-emerald-500/90 text-white font-heading font-bold text-sm px-5 py-2 rounded-full mb-1 shadow-lg z-20"
        >
          <span className="animate-pulse inline-block mr-1">
            {buildMode === 'settlement' ? '🏠' : buildMode === 'city' ? '🏰' : '⛵'}
          </span>
          {buildMode === 'settlement' ? '拠点を建てるタイルをタップ！' :
           buildMode === 'city' ? 'アップグレードする拠点をタップ！' :
           '船を置くタイルをタップ！'}
        </motion.div>
      )}

      {/* Scrollable Map Container */}
      <div
        ref={mapRef}
        className="w-full overflow-auto"
        style={{ maxHeight: '50vh', WebkitOverflowScrolling: 'touch' }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          style={{ minWidth: '360px', minHeight: '300px' }}
          className="drop-shadow-lg"
        >
          {ROWS.map((count, row) => {
            const rowOffset = (maxCols - count) * colSpacing / 2;
            return Array.from({ length: count }).map((_, col) => {
              const tile = tiles[tileIndex];
              if (!tile) return null;
              tileIndex++;

              const cx = rowOffset + col * colSpacing + HEX_SIZE + 15;
              const cy = row * rowSpacing + HEX_SIZE + 20;

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
                  playerFlags={playerFlags}
                  onTap={handleTileClick}
                />
              );
            });
          })}
        </svg>
      </div>

      {/* Tile Zoom Card */}
      <AnimatePresence>
        {zoomedTile && (
          <TileZoomCard
            tile={zoomedTile}
            onClose={() => setZoomedTile(null)}
            playerColors={playerColors}
            playerFlags={playerFlags}
          />
        )}
      </AnimatePresence>

      {/* Dice Result Zoom */}
      <AnimatePresence>
        {shouldShowDiceZoom && (
          <DiceResultZoom
            diceTotal={diceTotal}
            tiles={tiles}
            playerColors={playerColors}
            playerFlags={playerFlags}
            pendingEvent={pendingEvent}
            onClose={() => {
              dismissResourceGains();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
