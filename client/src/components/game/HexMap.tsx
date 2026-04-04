/**
 * HexMap - カタン方式ヘックスマップコンポーネント
 * - hexGeometry.ts の共通関数を使って六角形をぴったりくっつけて配置
 * - 六角形タイルの頂点に旗（拠点）を表示
 * - 六角形タイルの辺に道を表示
 * - タップで建設位置を選択
 * - サイコロ出目時に該当タイルをハイライト
 */
import { useGameStore } from '@/lib/gameStore';
import { TILE_INFO, RESOURCE_INFO, type ResourceType, type TileType, type GameTile, type EventCard } from '@/lib/gameTypes';
import { getValidSettlementVertices, getValidRoadEdges } from '@/lib/gameLogic';
import {
  HEX_SIZE, SVG_WIDTH, SVG_HEIGHT,
  getTileCenter, getHexPoints,
} from '@/lib/hexGeometry';
import { motion, AnimatePresence } from 'framer-motion';
import { useRef } from 'react';

// --- Dice Result Zoom ---
function DiceResultZoom({ diceTotal, tiles, playerColors, playerFlags, onClose, pendingEvent, settlements, vertices }: {
  diceTotal: number;
  tiles: GameTile[];
  playerColors: Record<string, string>;
  playerFlags: Record<string, string>;
  onClose: () => void;
  pendingEvent?: EventCard | null;
  settlements: any[];
  vertices: any[];
}) {
  const matchingTiles = tiles.filter(t => t.diceNumber === diceTotal && t.type !== 'sea' && t.type !== 'desert');

  // Find which players gain from each tile
  const tileGains = matchingTiles.map(tile => {
    const adjVertices = vertices.filter((v: any) => v.adjacentTileIds.includes(tile.id));
    const gains = adjVertices
      .map((v: any) => settlements.find((s: any) => s.vertexId === v.id))
      .filter(Boolean)
      .map((s: any) => ({
        playerId: s.playerId,
        level: s.level,
        amount: s.level === 'city' ? 2 : 1,
      }));
    return { tile, gains };
  });

  const hasAnyGains = tileGains.some(tg => tg.gains.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.7, y: 40 }}
        transition={{ type: 'spring', damping: 20 }}
        className="bg-gradient-to-b from-amber-50 to-orange-50 rounded-2xl p-5 shadow-2xl border-2 border-amber-300 max-w-sm w-full"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="text-center mb-3">
          <div className="text-3xl mb-1">🎲</div>
          <div className="font-heading font-bold text-xl text-amber-800">
            出目: {diceTotal}
          </div>
        </div>

        {matchingTiles.length === 0 ? (
          <div className="text-center text-gray-600 py-3 text-sm">
            この出目({diceTotal})のタイルはありません
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {tileGains.map(({ tile, gains }) => {
              const resInfo = RESOURCE_INFO[tile.type as ResourceType];
              return (
                <div key={tile.id} className="flex items-center gap-2 bg-white/80 rounded-lg p-2 border border-amber-200">
                  <div className="text-2xl">{resInfo?.icon}</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{resInfo?.name} ({tile.diceNumber})</div>
                    {gains.length > 0 ? (
                      <div className="flex gap-1 flex-wrap mt-0.5">
                        {gains.map((g: any, i: number) => (
                          <span key={i} className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: playerColors[g.playerId] + '30', color: playerColors[g.playerId] }}>
                            {playerFlags[g.playerId]} +{g.amount}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">拠点がないので資源はもらえなかった</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!hasAnyGains && matchingTiles.length > 0 && (
          <div className="text-center text-gray-500 text-xs mt-2">
            誰もこのタイルに拠点を持っていません
          </div>
        )}

        {/* Event preview */}
        {pendingEvent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`mt-3 p-2.5 rounded-xl border-2 text-center ${
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
function HexTile({ tile, cx, cy, isHighlighted }: {
  tile: GameTile;
  cx: number;
  cy: number;
  isHighlighted: boolean;
}) {
  const resInfo = tile.type !== 'sea' && tile.type !== 'desert' ? RESOURCE_INFO[tile.type as ResourceType] : null;

  const getGradient = (type: TileType): [string, string] => {
    switch (type) {
      case 'rubber': return ['#66BB6A', '#2E7D32'];
      case 'oil': return ['#546E7A', '#263238'];
      case 'gold': return ['#FFD54F', '#F9A825'];
      case 'food': return ['#FFA726', '#E65100'];
      case 'desert': return ['#D4A574', '#A0785A'];
      case 'sea': return ['#4FC3F7', '#0288D1'];
    }
  };
  const [c1, c2] = getGradient(tile.type);

  return (
    <g style={{ filter: isHighlighted ? 'drop-shadow(0 0 16px rgba(255, 215, 0, 1))' : 'drop-shadow(0 3px 4px rgba(0,0,0,0.35))' }}>
      <defs>
        <linearGradient id={`grad-${tile.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>

      {/* Main hex polygon */}
      <polygon
        points={getHexPoints(cx, cy, HEX_SIZE - 1)}
        fill={`url(#grad-${tile.id})`}
        stroke={isHighlighted ? '#FFD700' : '#5C3D2E'}
        strokeWidth={isHighlighted ? 3.5 : 2}
      />

      {/* Inner border */}
      <polygon
        points={getHexPoints(cx, cy, HEX_SIZE - 8)}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={1}
      />

      {/* Highlight effects */}
      {isHighlighted && (
        <>
          <polygon points={getHexPoints(cx, cy, HEX_SIZE - 1)} fill="rgba(255,215,0,0.25)">
            <animate attributeName="opacity" values="0.1;0.4;0.1" dur="1s" repeatCount="indefinite" />
          </polygon>
          <polygon points={getHexPoints(cx, cy, HEX_SIZE - 5)} fill="none" stroke="#FFD700" strokeWidth={2} strokeDasharray="6,4">
            <animate attributeName="stroke-dashoffset" values="0;20" dur="1.2s" repeatCount="indefinite" />
          </polygon>
        </>
      )}

      {/* Resource name (top) */}
      {tile.type !== 'sea' && tile.type !== 'desert' && (
        <text x={cx} y={cy - 20} textAnchor="middle" dominantBaseline="middle"
          fontSize={10} fontWeight="bold" fill="white" className="select-none pointer-events-none"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
        >
          {resInfo?.name}
        </text>
      )}

      {/* Resource icon (center) */}
      <text
        x={cx}
        y={tile.type === 'sea' || tile.type === 'desert' ? cy : cy - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={tile.type === 'sea' || tile.type === 'desert' ? 24 : 22}
        className="select-none pointer-events-none"
      >
        {resInfo?.icon || (tile.type === 'desert' ? '🏜️' : '🌊')}
      </text>

      {/* Dice number badge (bottom) */}
      {tile.type !== 'sea' && tile.type !== 'desert' && tile.diceNumber > 0 && (
        <>
          <circle cx={cx} cy={cy + 20} r={12}
            fill={isHighlighted ? '#FFD700' : '#FFF8E1'}
            stroke={isHighlighted ? '#B8860B' : '#5C3D2E'}
            strokeWidth={isHighlighted ? 2.5 : 2}
          />
          <text x={cx} y={cy + 21} textAnchor="middle" dominantBaseline="middle"
            fontSize={14} fontWeight="bold" fontFamily="'Fredoka', sans-serif"
            fill={isHighlighted ? '#5C3D2E' : tile.diceNumber === 6 || tile.diceNumber === 8 ? '#E74C3C' : '#2C3E50'}
            className="select-none pointer-events-none"
          >
            {tile.diceNumber}
          </text>
        </>
      )}
    </g>
  );
}

// --- Main HexMap Component ---
export default function HexMap() {
  const {
    tiles, players, vertices, edges, settlements, roads,
    currentPlayerIndex, highlightedTileIds, highlightedVertexIds, highlightedEdgeIds,
    buildMode, selectedVertexId, selectedEdgeId, selectVertex, selectEdge,
    phase, diceResult, showResourceGains, dismissResourceGains, isPlayingAI,
    pendingEvent, setupPhase,
  } = useGameStore();

  const currentPlayer = players[currentPlayerIndex];
  const mapRef = useRef<HTMLDivElement>(null);

  // Build maps
  const playerColors: Record<string, string> = {};
  const playerFlags: Record<string, string> = {};
  players.forEach(p => {
    playerColors[p.id] = p.color;
    playerFlags[p.id] = p.flagEmoji;
  });

  const diceTotal = diceResult ? diceResult[0] + diceResult[1] : 0;
  const shouldShowDiceZoom = phase === 'action' && diceResult && showResourceGains && !isPlayingAI;

  // Handle vertex click
  const handleVertexClick = (vertexId: string) => {
    if (phase === 'setup' && setupPhase?.step === 'place_settlement') {
      const store = useGameStore.getState();
      store.setupPlaceSettlement(vertexId);
      return;
    }
    if (buildMode === 'settlement' || buildMode === 'city') {
      selectVertex(vertexId);
    }
  };

  // Handle edge click
  const handleEdgeClick = (edgeId: string) => {
    if (phase === 'setup' && setupPhase?.step === 'place_road') {
      const store = useGameStore.getState();
      store.setupPlaceRoad(edgeId);
      return;
    }
    if (buildMode === 'road') {
      selectEdge(edgeId);
    }
  };

  // Determine which vertices/edges to show as interactive
  const interactiveVertexIds = phase === 'setup' && setupPhase?.step === 'place_settlement'
    ? (() => {
        const player = players[setupPhase.currentPlayerIndex];
        if (!player || player.isAI) return [];
        return getValidSettlementVertices(player.id, vertices, settlements, roads, true);
      })()
    : highlightedVertexIds;

  const interactiveEdgeIds = phase === 'setup' && setupPhase?.step === 'place_road'
    ? (() => {
        const player = players[setupPhase.currentPlayerIndex];
        if (!player || player.isAI) return [];
        return getValidRoadEdges(player.id, edges, vertices, settlements, roads, true, setupPhase.lastPlacedVertexId);
      })()
    : highlightedEdgeIds;

  return (
    <div className="flex flex-col items-center w-full">
      {/* Build/Setup mode indicator */}
      {(buildMode || (phase === 'setup' && setupPhase)) && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-emerald-500/90 text-white font-heading font-bold text-sm px-5 py-2 rounded-full mb-1 shadow-lg z-20"
        >
          <span className="animate-pulse inline-block mr-1">
            {buildMode === 'road' || setupPhase?.step === 'place_road' ? '🛤️' :
             buildMode === 'city' ? '🏰' : '🏠'}
          </span>
          {phase === 'setup' && setupPhase
            ? setupPhase.step === 'place_settlement'
              ? `${players[setupPhase.currentPlayerIndex]?.flagEmoji} 拠点を配置する頂点をタップ！`
              : `${players[setupPhase.currentPlayerIndex]?.flagEmoji} 道を配置する辺をタップ！`
            : buildMode === 'settlement' ? '拠点を建てる頂点をタップ！'
            : buildMode === 'city' ? 'アップグレードする拠点をタップ！'
            : '道を建てる辺をタップ！'
          }
        </motion.div>
      )}

      {/* Scrollable Map Container */}
      <div
        ref={mapRef}
        className="w-full overflow-auto"
        style={{ maxHeight: '55vh', WebkitOverflowScrolling: 'touch' }}
      >
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          width="100%"
          style={{ minWidth: '360px', minHeight: '300px' }}
          className="drop-shadow-lg"
        >
          {/* Layer 1: Hex Tiles - using shared getTileCenter */}
          {tiles.map((tile, tileIdx) => {
            const center = getTileCenter(tileIdx);
            const isHighlighted = highlightedTileIds.includes(tile.id);
            return (
              <HexTile
                key={tile.id}
                tile={tile}
                cx={center.x}
                cy={center.y}
                isHighlighted={isHighlighted}
              />
            );
          })}

          {/* Layer 2: Roads (edges) */}
          {roads.map(road => {
            const edge = edges.find(e => e.id === road.edgeId);
            if (!edge) return null;
            const color = playerColors[road.playerId] || '#888';
            return (
              <line
                key={road.edgeId}
                x1={edge.x1} y1={edge.y1}
                x2={edge.x2} y2={edge.y2}
                stroke={color}
                strokeWidth={5}
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
              />
            );
          })}

          {/* Layer 3: Interactive edges (buildable) */}
          {interactiveEdgeIds.map((edgeId: string) => {
            const edge = edges.find(e => e.id === edgeId);
            if (!edge) return null;
            const isSelected = selectedEdgeId === edgeId;
            return (
              <g key={`ie-${edgeId}`} onClick={() => handleEdgeClick(edgeId)} style={{ cursor: 'pointer' }}>
                <line
                  x1={edge.x1} y1={edge.y1}
                  x2={edge.x2} y2={edge.y2}
                  stroke={isSelected ? '#FFD700' : '#2ECC71'}
                  strokeWidth={isSelected ? 7 : 5}
                  strokeLinecap="round"
                  opacity={0.8}
                  strokeDasharray={isSelected ? 'none' : '8,4'}
                >
                  {!isSelected && (
                    <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" repeatCount="indefinite" />
                  )}
                </line>
                {/* Invisible wider hit area */}
                <line
                  x1={edge.x1} y1={edge.y1}
                  x2={edge.x2} y2={edge.y2}
                  stroke="transparent"
                  strokeWidth={20}
                />
              </g>
            );
          })}

          {/* Layer 4: Settlements (vertices with buildings) */}
          {settlements.map(settlement => {
            const vertex = vertices.find(v => v.id === settlement.vertexId);
            if (!vertex) return null;
            const pColor = playerColors[settlement.playerId] || '#888';
            const pFlag = playerFlags[settlement.playerId] || '🏳️';
            const isCity = settlement.level === 'city';

            return (
              <g key={settlement.vertexId}>
                {/* Flag pole */}
                <line
                  x1={vertex.x} y1={vertex.y + 2}
                  x2={vertex.x} y2={vertex.y - 16}
                  stroke="#5C3D2E" strokeWidth={2.5} strokeLinecap="round"
                />
                {/* Flag circle */}
                <circle
                  cx={vertex.x} cy={vertex.y - 16}
                  r={isCity ? 14 : 11}
                  fill={pColor}
                  stroke={isCity ? '#FFD700' : '#FFF'}
                  strokeWidth={isCity ? 3 : 2}
                  style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}
                />
                {/* Flag emoji */}
                <text
                  x={vertex.x} y={vertex.y - 15}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={isCity ? 14 : 11}
                  className="select-none pointer-events-none"
                >
                  {pFlag}
                </text>
                {/* City indicator */}
                {isCity && (
                  <text
                    x={vertex.x} y={vertex.y + 6}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={10} className="select-none pointer-events-none"
                  >
                    🏰
                  </text>
                )}
              </g>
            );
          })}

          {/* Layer 5: Interactive vertices (buildable) */}
          {interactiveVertexIds.map((vertexId: string) => {
            const vertex = vertices.find(v => v.id === vertexId);
            if (!vertex) return null;
            const isSelected = selectedVertexId === vertexId;

            return (
              <g key={`iv-${vertexId}`} onClick={() => handleVertexClick(vertexId)} style={{ cursor: 'pointer' }}>
                {/* Pulse ring */}
                <circle
                  cx={vertex.x} cy={vertex.y}
                  r={isSelected ? 16 : 12}
                  fill={isSelected ? 'rgba(255, 215, 0, 0.6)' : 'rgba(46, 204, 113, 0.4)'}
                  stroke={isSelected ? '#FFD700' : '#2ECC71'}
                  strokeWidth={isSelected ? 3 : 2}
                >
                  {!isSelected && (
                    <animate attributeName="r" values="10;14;10" dur="1s" repeatCount="indefinite" />
                  )}
                </circle>
                {/* Center dot */}
                <circle
                  cx={vertex.x} cy={vertex.y}
                  r={5}
                  fill={isSelected ? '#FFD700' : '#2ECC71'}
                  stroke="#FFF"
                  strokeWidth={2}
                />
                {/* Invisible wider hit area */}
                <circle
                  cx={vertex.x} cy={vertex.y}
                  r={20}
                  fill="transparent"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Dice Result Zoom */}
      <AnimatePresence>
        {shouldShowDiceZoom && (
          <DiceResultZoom
            diceTotal={diceTotal}
            tiles={tiles}
            playerColors={playerColors}
            playerFlags={playerFlags}
            pendingEvent={pendingEvent}
            settlements={settlements}
            vertices={vertices}
            onClose={() => dismissResourceGains()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
