/**
 * HexMap - カタン方式ヘックスマップコンポーネント
 * - hexGeometry.ts の共通関数を使って六角形をぴったりくっつけて配置
 * - 六角形タイルの頂点に旗（拠点）を表示
 * - 六角形タイルの辺に道を表示
 * - タップで建設位置を選択
 * - サイコロ出目時に該当タイルをハイライト
 */
import { useGameStore } from '@/lib/gameStore';
import { TILE_INFO, RESOURCE_INFO, type ResourceType, type TileType, type GameTile, type EventCard, type Port } from '@/lib/gameTypes';
import { getValidSettlementVertices, getValidRoadEdges } from '@/lib/gameLogic';
import {
  HEX_SIZE,
  getTileCenter, getHexPoints, getSvgDimensions,
} from '@/lib/hexGeometry';
import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useMemo, memo, useCallback } from 'react';

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
      animate={{ opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } }}
      exit={{ opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24, duration: 0.3 }}
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

// --- Single Hex Tile (memoized: re-renders only when its props change) ---
const HexTile = memo(function HexTile({ tile, cx, cy, isHighlighted, isDimmed }: {
  tile: GameTile;
  cx: number;
  cy: number;
  isHighlighted: boolean;
  isDimmed?: boolean;
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
    <g
      style={{
        filter: isHighlighted
          ? 'drop-shadow(0 0 16px rgba(255, 215, 0, 1))'
          : 'drop-shadow(0 3px 4px rgba(0,0,0,0.35))',
        opacity: isDimmed ? 0.3 : 1,
        transition: 'opacity 0.4s ease, filter 0.4s ease',
      }}
    >
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
});

// =============================================
// LAYERED RENDERING — each layer is memoized so layers re-render only when
// their own data changes. Game-log updates won't repaint the SVG; clicking
// a build button only repaints the interaction layer; rolling dice only
// flips highlights and dimming, etc.
// =============================================

type VertexLite = { id: string; x: number; y: number; adjacentTileIds: number[] };
type EdgeLite = { id: string; x1: number; y1: number; x2: number; y2: number };

// ----- Tiles layer -----
const TilesLayer = memo(function TilesLayer({
  tiles, tileCenters, highlightedTileIds, shouldDimTiles,
}: {
  tiles: GameTile[];
  tileCenters: { x: number; y: number }[];
  highlightedTileIds: number[];
  shouldDimTiles: boolean;
}) {
  const highlightedSet = useMemo(() => new Set(highlightedTileIds), [highlightedTileIds]);
  return (
    <g>
      {tiles.map((tile, i) => {
        const c = tileCenters[i];
        const isHighlighted = highlightedSet.has(tile.id);
        return (
          <HexTile
            key={tile.id}
            tile={tile}
            cx={c.x}
            cy={c.y}
            isHighlighted={isHighlighted}
            isDimmed={shouldDimTiles && !isHighlighted}
          />
        );
      })}
    </g>
  );
});

// ----- Ports layer -----
const PortsLayer = memo(function PortsLayer({
  ports, vertexMap, settlements, currentPlayerId, svgW, svgH,
}: {
  ports: Port[];
  vertexMap: Map<string, VertexLite>;
  settlements: { vertexId: string; playerId: string; level: 'settlement' | 'city' }[];
  currentPlayerId: string | undefined;
  svgW: number;
  svgH: number;
}) {
  type PortPalette = { bg: string; bgDark: string; line: string; icon: string; rate: string };
  const palettes: Record<string, PortPalette> = {
    general: { bg: '#B8860B', bgDark: '#6B4A0E', line: '#8B6914', icon: '⚓', rate: '3:1' },
    rubber:  { bg: '#66BB6A', bgDark: '#2E7D32', line: '#2E7D32', icon: '🌿', rate: '2:1' },
    oil:     { bg: '#546E7A', bgDark: '#263238', line: '#37474F', icon: '🛢️', rate: '2:1' },
    gold:    { bg: '#FFD54F', bgDark: '#F9A825', line: '#F9A825', icon: '💰', rate: '2:1' },
    food:    { bg: '#FFA726', bgDark: '#E65100', line: '#E65100', icon: '🌾', rate: '2:1' },
  };
  const centerX = svgW / 2;
  const centerY = svgH / 2;
  const offsetDist = 34;
  const plateR = 22;

  return (
    <g>
      {ports.map((port: Port) => {
        const v1 = vertexMap.get(port.vertexIds[0]);
        const v2 = vertexMap.get(port.vertexIds[1]);
        if (!v1 || !v2) return null;

        const midX = (v1.x + v2.x) / 2;
        const midY = (v1.y + v2.y) / 2;
        const dx = midX - centerX;
        const dy = midY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const portX = midX + (dx / dist) * offsetDist;
        const portY = midY + (dy / dist) * offsetDist;

        const pal = palettes[port.type] || palettes.general;
        const rateLabel = port.type === 'general' ? '3:1' : `${pal.icon}2:1`;

        const isMyPort = !!(currentPlayerId && port.vertexIds.some((vid: string) =>
          settlements.some(s => s.vertexId === vid && s.playerId === currentPlayerId)
        ));

        return (
          <g key={port.id}>
            <defs>
              <radialGradient id={`port-grad-${port.id}`} cx="35%" cy="35%" r="75%">
                <stop offset="0%" stopColor={pal.bg} />
                <stop offset="100%" stopColor={pal.bgDark} />
              </radialGradient>
            </defs>
            <line x1={v1.x} y1={v1.y} x2={portX} y2={portY}
              stroke={isMyPort ? '#FFD700' : pal.line}
              strokeWidth={isMyPort ? 3 : 2.5}
              strokeDasharray="5,3"
              opacity={isMyPort ? 0.95 : 0.7}
            />
            <line x1={v2.x} y1={v2.y} x2={portX} y2={portY}
              stroke={isMyPort ? '#FFD700' : pal.line}
              strokeWidth={isMyPort ? 3 : 2.5}
              strokeDasharray="5,3"
              opacity={isMyPort ? 0.95 : 0.7}
            />
            {isMyPort && (
              <circle cx={portX} cy={portY} r={plateR + 5}
                fill="none" stroke="#FFD700" strokeWidth={2} strokeDasharray="4,3"
              >
                <animate attributeName="stroke-dashoffset" values="0;14" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={portX} cy={portY} r={plateR}
              fill={`url(#port-grad-${port.id})`}
              stroke="white" strokeWidth={3}
              style={{
                filter: isMyPort
                  ? 'drop-shadow(0 0 12px rgba(255,215,0,0.9)) drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                  : 'drop-shadow(0 2px 5px rgba(0,0,0,0.55))',
              }}
            >
              {isMyPort && (
                <animate attributeName="r" values={`${plateR};${plateR + 2};${plateR}`} dur="1.5s" repeatCount="indefinite" />
              )}
            </circle>
            <circle cx={portX} cy={portY} r={plateR - 3}
              fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5}
            />
            <text x={portX} y={portY - 4}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={24}
              className="select-none pointer-events-none"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))' }}
            >
              {pal.icon}
            </text>
            <rect x={portX - 17} y={portY + 9}
              width={34} height={12} rx={6} ry={6}
              fill="rgba(0,0,0,0.6)" stroke="white" strokeWidth={1}
            />
            <text x={portX} y={portY + 16}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={10} fontWeight="bold" fontFamily="'Fredoka', sans-serif"
              fill="white"
              className="select-none pointer-events-none"
            >
              {rateLabel}
            </text>
          </g>
        );
      })}
    </g>
  );
});

// ----- Roads layer -----
const RoadsLayer = memo(function RoadsLayer({
  roads, edgeMap, playerColors, shouldDimTiles,
}: {
  roads: { edgeId: string; playerId: string }[];
  edgeMap: Map<string, EdgeLite>;
  playerColors: Record<string, string>;
  shouldDimTiles: boolean;
}) {
  return (
    <g>
      {roads.map(road => {
        const edge = edgeMap.get(road.edgeId);
        if (!edge) return null;
        const color = playerColors[road.playerId] || '#888';
        return (
          <line
            key={road.edgeId}
            className="draw-road"
            x1={edge.x1} y1={edge.y1}
            x2={edge.x2} y2={edge.y2}
            stroke={color}
            strokeWidth={5}
            strokeLinecap="round"
            style={{
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
              opacity: shouldDimTiles ? 0.4 : 1,
              transition: 'opacity 0.4s ease',
            }}
          />
        );
      })}
    </g>
  );
});

// ----- Settlements layer -----
const SettlementsLayer = memo(function SettlementsLayer({
  settlements, vertexMap, playerColors, playerFlags, bouncingSettlementIds, shouldDimTiles,
}: {
  settlements: { vertexId: string; playerId: string; level: 'settlement' | 'city' }[];
  vertexMap: Map<string, VertexLite>;
  playerColors: Record<string, string>;
  playerFlags: Record<string, string>;
  bouncingSettlementIds: Set<string>;
  shouldDimTiles: boolean;
}) {
  return (
    <g>
      {settlements.map(settlement => {
        const vertex = vertexMap.get(settlement.vertexId);
        if (!vertex) return null;
        const pColor = playerColors[settlement.playerId] || '#888';
        const pFlag = playerFlags[settlement.playerId] || '🏳️';
        const isCity = settlement.level === 'city';
        const isBouncing = bouncingSettlementIds.has(settlement.vertexId);
        const flagR = isCity ? 13 : 12;
        const fxB = vertex.x;
        const fyB = vertex.y;
        const dimOpacity = shouldDimTiles && !isBouncing ? 0.3 : 1;

        return (
          <g key={settlement.vertexId} className={isBouncing ? 'bounce-flag' : undefined}>
            <circle cx={fxB} cy={fyB} r={flagR}
              fill={pColor} stroke="white" strokeWidth={3}
              style={{
                filter: isBouncing
                  ? 'drop-shadow(0 0 10px rgba(255,215,0,0.95)) drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
                  : 'drop-shadow(0 0 3px rgba(0,0,0,0.8)) drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
                opacity: dimOpacity,
                transition: 'opacity 0.4s ease, filter 0.4s ease',
              }}
            />
            {isCity && (
              <circle cx={fxB} cy={fyB} r={flagR + 2}
                fill="none" stroke="#FFD700" strokeWidth={2}
                style={{ opacity: dimOpacity, transition: 'opacity 0.4s ease' }}
              />
            )}
            <text x={fxB} y={fyB + 1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={isBouncing ? (isCity ? 16 : 15) : (isCity ? 14 : 13)}
              className="select-none pointer-events-none"
              style={{ opacity: dimOpacity, transition: 'opacity 0.4s ease, font-size 0.3s ease' }}
            >
              {pFlag}
            </text>
            {isCity && (
              <text x={fxB + flagR} y={fyB - flagR}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={11} className="select-none pointer-events-none"
                style={{ opacity: dimOpacity, transition: 'opacity 0.4s ease' }}
              >
                👑
              </text>
            )}
            {isBouncing && (
              <circle cx={fxB} cy={fyB} r={flagR}
                fill="none" stroke="#FFD700" strokeWidth={2}
              >
                <animate attributeName="r" values={`${flagR};${flagR + 12}`} dur="0.6s" repeatCount="1" fill="freeze" />
                <animate attributeName="opacity" values="0.8;0" dur="0.6s" repeatCount="1" fill="freeze" />
              </circle>
            )}
          </g>
        );
      })}
    </g>
  );
});

// ----- Interactive edges (buildable) -----
const InteractiveEdgesLayer = memo(function InteractiveEdgesLayer({
  edgeIds, edgeMap, selectedEdgeId, onEdgeClick,
}: {
  edgeIds: string[];
  edgeMap: Map<string, EdgeLite>;
  selectedEdgeId: string | null;
  onEdgeClick: (edgeId: string) => void;
}) {
  return (
    <g>
      {edgeIds.map((edgeId) => {
        const edge = edgeMap.get(edgeId);
        if (!edge) return null;
        const isSelected = selectedEdgeId === edgeId;
        return (
          <g key={`ie-${edgeId}`} onClick={() => onEdgeClick(edgeId)} style={{ cursor: 'pointer' }}>
            <line x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2}
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
            <line x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2}
              stroke="transparent" strokeWidth={20}
            />
          </g>
        );
      })}
    </g>
  );
});

// ----- Interactive vertices (buildable) -----
const InteractiveVerticesLayer = memo(function InteractiveVerticesLayer({
  vertexIds, vertexMap, selectedVertexId, onVertexClick,
}: {
  vertexIds: string[];
  vertexMap: Map<string, VertexLite>;
  selectedVertexId: string | null;
  onVertexClick: (vertexId: string) => void;
}) {
  return (
    <g>
      {vertexIds.map((vertexId) => {
        const vertex = vertexMap.get(vertexId);
        if (!vertex) return null;
        const isSelected = selectedVertexId === vertexId;
        return (
          <g key={`iv-${vertexId}`} onClick={() => onVertexClick(vertexId)} style={{ cursor: 'pointer' }}>
            <circle cx={vertex.x} cy={vertex.y}
              r={isSelected ? 16 : 12}
              fill={isSelected ? 'rgba(255, 215, 0, 0.6)' : 'rgba(46, 204, 113, 0.4)'}
              stroke={isSelected ? '#FFD700' : '#2ECC71'}
              strokeWidth={isSelected ? 3 : 2}
            >
              {!isSelected && (
                <animate attributeName="r" values="10;14;10" dur="1s" repeatCount="indefinite" />
              )}
            </circle>
            <circle cx={vertex.x} cy={vertex.y} r={5}
              fill={isSelected ? '#FFD700' : '#2ECC71'}
              stroke="#FFF" strokeWidth={2}
            />
            <circle cx={vertex.x} cy={vertex.y} r={20} fill="transparent" />
          </g>
        );
      })}
    </g>
  );
});

// --- Main HexMap Component ---
function HexMap() {
  console.count('[render] HexMap');
  // Narrow selectors — each subscribes only to a single slice so unrelated
  // store updates (e.g. game log entries) do not re-render the map.
  const tiles = useGameStore(s => s.tiles);
  const players = useGameStore(s => s.players);
  const vertices = useGameStore(s => s.vertices);
  const edges = useGameStore(s => s.edges);
  const settlements = useGameStore(s => s.settlements);
  const roads = useGameStore(s => s.roads);
  const ports = useGameStore(s => s.ports) ?? [];
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const highlightedTileIds = useGameStore(s => s.highlightedTileIds);
  const highlightedVertexIds = useGameStore(s => s.highlightedVertexIds);
  const highlightedEdgeIds = useGameStore(s => s.highlightedEdgeIds);
  const buildMode = useGameStore(s => s.buildMode);
  const selectedVertexId = useGameStore(s => s.selectedVertexId);
  const selectedEdgeId = useGameStore(s => s.selectedEdgeId);
  const phase = useGameStore(s => s.phase);
  const diceResult = useGameStore(s => s.diceResult);
  const showResourceGains = useGameStore(s => s.showResourceGains);
  const dismissResourceGains = useGameStore(s => s.dismissResourceGains);
  const isPlayingAI = useGameStore(s => s.isPlayingAI);
  const pendingEvent = useGameStore(s => s.pendingEvent);
  const setupPhase = useGameStore(s => s.setupPhase);
  const resourceGains = useGameStore(s => s.resourceGains);
  const mapRows = useGameStore(s => s.mapRows);
  const diceAnimationStep = useGameStore(s => s.diceAnimationStep);

  const currentPlayer = players[currentPlayerIndex];
  const mapRef = useRef<HTMLDivElement>(null);
  const { width: svgW, height: svgH } = useMemo(() => getSvgDimensions(mapRows), [mapRows]);

  // Player color/flag maps — only recompute when players array changes
  const { playerColors, playerFlags } = useMemo(() => {
    const colors: Record<string, string> = {};
    const flags: Record<string, string> = {};
    players.forEach(p => { colors[p.id] = p.color; flags[p.id] = p.flagEmoji; });
    return { playerColors: colors, playerFlags: flags };
  }, [players]);

  // Lookup maps — turn O(n) finds into O(1) Map.get
  const vertexMap = useMemo(() => {
    const m = new Map<string, typeof vertices[number]>();
    vertices.forEach(v => m.set(v.id, v));
    return m;
  }, [vertices]);

  const edgeMap = useMemo(() => {
    const m = new Map<string, typeof edges[number]>();
    edges.forEach(e => m.set(e.id, e));
    return m;
  }, [edges]);

  // Tile center positions are pure functions of mapRows and tile order
  const tileCenters = useMemo(
    () => tiles.map((_, i) => getTileCenter(i, mapRows)),
    [tiles, mapRows]
  );

  const diceTotal = diceResult ? diceResult[0] + diceResult[1] : 0;
  const shouldShowDiceZoom = phase === 'action' && diceResult && showResourceGains && !isPlayingAI && diceAnimationStep >= 4;

  // Strict phase-based highlight guard:
  // - Human: only during phase==='action' AND diceAnimationStep >= 2
  // - AI: only during phase==='ai_turn' when highlightedTileIds is set
  // - NEVER during phase==='rolling' or any other phase
  const canHighlight =
    (phase === 'action' && !isPlayingAI && diceAnimationStep >= 2) ||
    (phase === 'ai_turn' && isPlayingAI);
  const effectiveHighlightIds = canHighlight ? highlightedTileIds : [];

  // Flag bounce: only during human step 3+ (never AI)
  const bouncingSettlementIds = useMemo(() => {
    if (phase !== 'action' || isPlayingAI || diceAnimationStep < 3 || highlightedTileIds.length === 0) {
      return new Set<string>();
    }
    const highlightedSet = new Set(highlightedTileIds);
    const ids = new Set<string>();
    settlements.forEach(s => {
      const vertex = vertexMap.get(s.vertexId);
      if (!vertex) return;
      if (vertex.adjacentTileIds.some(tid => highlightedSet.has(tid))) {
        ids.add(s.vertexId);
      }
    });
    return ids;
  }, [phase, diceAnimationStep, highlightedTileIds, settlements, vertexMap, isPlayingAI]);

  // Dim non-highlighted tiles only when highlights are active
  const shouldDimTiles = effectiveHighlightIds.length > 0;

  // Stable click handlers — memo'd so the interaction layer's memo equality works.
  const handleVertexClick = useCallback((vertexId: string) => {
    const state = useGameStore.getState();
    if (state.phase === 'setup' && state.setupPhase?.step === 'place_settlement') {
      state.setupPlaceSettlement(vertexId);
      return;
    }
    if (state.buildMode === 'settlement' || state.buildMode === 'city') {
      state.selectVertex(vertexId);
    }
  }, []);

  const handleEdgeClick = useCallback((edgeId: string) => {
    const state = useGameStore.getState();
    if (state.phase === 'setup' && state.setupPhase?.step === 'place_road') {
      state.setupPlaceRoad(edgeId);
      return;
    }
    if (state.buildMode === 'road') {
      state.selectEdge(edgeId);
    }
  }, []);

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
        className="w-full overflow-auto max-h-[55vh] md:max-h-full md:flex-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          width="100%"
          style={{ minWidth: mapRows ? '200px' : '360px', minHeight: mapRows ? '180px' : '300px' }}
          className="drop-shadow-lg"
        >
          <TilesLayer
            tiles={tiles}
            tileCenters={tileCenters}
            highlightedTileIds={effectiveHighlightIds}
            shouldDimTiles={shouldDimTiles}
          />
          <PortsLayer
            ports={ports}
            vertexMap={vertexMap}
            settlements={settlements}
            currentPlayerId={currentPlayer?.id}
            svgW={svgW}
            svgH={svgH}
          />
          <RoadsLayer
            roads={roads}
            edgeMap={edgeMap}
            playerColors={playerColors}
            shouldDimTiles={shouldDimTiles}
          />
          <InteractiveEdgesLayer
            edgeIds={interactiveEdgeIds}
            edgeMap={edgeMap}
            selectedEdgeId={selectedEdgeId}
            onEdgeClick={handleEdgeClick}
          />
          <SettlementsLayer
            settlements={settlements}
            vertexMap={vertexMap}
            playerColors={playerColors}
            playerFlags={playerFlags}
            bouncingSettlementIds={bouncingSettlementIds}
            shouldDimTiles={shouldDimTiles}
          />
          <InteractiveVerticesLayer
            vertexIds={interactiveVertexIds}
            vertexMap={vertexMap}
            selectedVertexId={selectedVertexId}
            onVertexClick={handleVertexClick}
          />
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

export default memo(HexMap);
