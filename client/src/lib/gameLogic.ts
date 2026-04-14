// ===== Game Logic Utilities (Catan-style vertex/edge system) =====
import {
  type GameTile, type Player, type Resources, type ResourceType, type TileType,
  type EventCard, type GameLogEntry, type Difficulty,
  type Vertex, type Edge, type Settlement, type Road, type Port,
  HEX_LAYOUT, TILE_DISTRIBUTION, TILE_DISTRIBUTION_LARGE, DICE_NUMBERS, EVENT_CARDS,
  BUILD_COSTS, VP_VALUES, WINNING_SCORE, PLAYER_COLORS,
} from './gameTypes';
import {
  HEX_SIZE, ROWS, COL_SPACING, ROW_SPACING,
  getTileCenter, getHexCorners, roundCoord, coordKey,
} from './hexGeometry';

// --- Shuffle Array ---
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Generate Unique ID ---
let idCounter = 0;
export function genId(): string {
  return `${Date.now()}-${++idCounter}`;
}

// =============================================
// HEX GEOMETRY: Vertex & Edge Computation
// =============================================

// Generate all vertices and edges from the hex grid
export function generateVerticesAndEdges(tiles: GameTile[], mapRows?: number[]): { vertices: Vertex[]; edges: Edge[] } {
  // Map from coordinate key to vertex data
  const vertexMap = new Map<string, { x: number; y: number; tileIds: Set<number> }>();
  // Map from tile index to its corner coordinate keys
  const tileCornerKeys: string[][] = [];

  tiles.forEach((tile, tileIdx) => {
    const center = getTileCenter(tileIdx, mapRows);
    const corners = getHexCorners(center.x, center.y);
    const keys: string[] = [];

    corners.forEach(corner => {
      const key = coordKey(corner.x, corner.y);
      keys.push(key);
      if (!vertexMap.has(key)) {
        vertexMap.set(key, { x: corner.x, y: corner.y, tileIds: new Set() });
      }
      vertexMap.get(key)!.tileIds.add(tile.id);
    });

    tileCornerKeys.push(keys);
  });

  // Filter vertices: only keep those adjacent to at least one non-sea tile
  const validVertexKeys = new Set<string>();
  vertexMap.forEach((data, key) => {
    const hasTile = Array.from(data.tileIds).some(id => {
      const tile = tiles.find(t => t.id === id);
      return tile && tile.type !== 'sea';
    });
    if (hasTile) {
      validVertexKeys.add(key);
    }
  });

  // Create vertex objects
  const vertexIdMap = new Map<string, string>(); // coordKey -> vertexId
  const vertices: Vertex[] = [];

  let vIdx = 0;
  validVertexKeys.forEach(key => {
    const data = vertexMap.get(key)!;
    const vertexId = `v${vIdx++}`;
    vertexIdMap.set(key, vertexId);
    vertices.push({
      id: vertexId,
      adjacentTileIds: Array.from(data.tileIds),
      adjacentVertexIds: [], // filled later
      adjacentEdgeIds: [],   // filled later
      x: data.x,
      y: data.y,
    });
  });

  // Create edges: connect adjacent vertices (corners that share a hex edge)
  const edges: Edge[] = [];
  const edgeSet = new Set<string>();

  tiles.forEach((tile, tileIdx) => {
    const keys = tileCornerKeys[tileIdx];
    if (!keys) return;

    for (let i = 0; i < 6; i++) {
      const k1 = keys[i];
      const k2 = keys[(i + 1) % 6];
      const vId1 = vertexIdMap.get(k1);
      const vId2 = vertexIdMap.get(k2);
      if (!vId1 || !vId2) continue;

      const edgeKey = [vId1, vId2].sort().join('_');
      if (edgeSet.has(edgeKey)) continue;
      edgeSet.add(edgeKey);

      const v1 = vertices.find(v => v.id === vId1)!;
      const v2 = vertices.find(v => v.id === vId2)!;

      // Find tiles adjacent to this edge
      const adjTileIds = new Set<number>();
      v1.adjacentTileIds.forEach(id => {
        if (v2.adjacentTileIds.includes(id)) adjTileIds.add(id);
      });

      const edgeId = `e${edges.length}`;
      edges.push({
        id: edgeId,
        vertexIds: [vId1, vId2],
        adjacentTileIds: Array.from(adjTileIds),
        x1: v1.x, y1: v1.y,
        x2: v2.x, y2: v2.y,
      });

      // Update vertex adjacency
      v1.adjacentVertexIds.push(vId2);
      v1.adjacentEdgeIds.push(edgeId);
      v2.adjacentVertexIds.push(vId1);
      v2.adjacentEdgeIds.push(edgeId);
    }
  });

  return { vertices, edges };
}

// =============================================
// MAP GENERATION
// =============================================

export function generateMap(): GameTile[] {
  // Desert fixed at center (index 9 in 3-4-5-4-3 layout)
  const DESERT_INDEX = 9;
  const resourceTypes = shuffle(
    TILE_DISTRIBUTION.filter(t => t !== 'desert')
  );
  const shuffledNumbers = shuffle(DICE_NUMBERS);
  let numIdx = 0;
  let resIdx = 0;

  return HEX_LAYOUT.map((pos, i) => {
    if (i === DESERT_INDEX) {
      return { id: i, type: 'desert' as TileType, diceNumber: 0, q: pos.q, r: pos.r };
    }
    const type = resourceTypes[resIdx++] || 'rubber';
    const diceNumber = numIdx < shuffledNumbers.length ? shuffledNumbers[numIdx++] : 0;
    return { id: i, type, diceNumber, q: pos.q, r: pos.r };
  });
}

// Generate large map (24 tiles, 3-4-5-6-5-4-3 layout, desert at center index 14)
export function generateLargeMap(mapRows: number[]): GameTile[] {
  const tileCount = mapRows.reduce((a, b) => a + b, 0);
  const DESERT_INDEX = Math.floor(tileCount / 2);
  const resourceTypes = shuffle(
    TILE_DISTRIBUTION_LARGE.filter(t => t !== 'desert')
  );
  // More dice numbers for larger map
  const largeNumbers = shuffle([
    2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
    3, 4, 5, 6, 9, 10, 11,
  ]);
  let numIdx = 0;
  let resIdx = 0;

  const tiles: GameTile[] = [];
  for (let i = 0; i < tileCount; i++) {
    if (i === DESERT_INDEX) {
      tiles.push({ id: i, type: 'desert', diceNumber: 0, q: 0, r: i });
    } else {
      const type = resourceTypes[resIdx++] || 'rubber';
      const diceNumber = numIdx < largeNumbers.length ? largeNumbers[numIdx++] : 0;
      tiles.push({ id: i, type, diceNumber, q: 0, r: i });
    }
  }
  return tiles;
}

// =============================================
// PLAYER CREATION
// =============================================

export function createPlayer(name: string, index: number, isAI: boolean, isHuman: boolean): Player {
  const colorInfo = PLAYER_COLORS[index % PLAYER_COLORS.length];
  return {
    id: genId(),
    name,
    color: colorInfo.color,
    colorName: colorInfo.name,
    flagEmoji: colorInfo.flagEmoji,
    countryName: colorInfo.countryName,
    resources: { rubber: 0, oil: 0, gold: 0, food: 0 },
    victoryPoints: 0,
    isAI,
    isHuman,
    longestRoadLength: 0,
    eventCards: [],
  };
}

// =============================================
// DICE
// =============================================

export function rollDice(): [number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}

export function rollSingleDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

// =============================================
// PORTS: マップ外周に港6つ配置
// =============================================
// general×2 (3:1)、各資源港 ×1 (rubber/oil/gold/food, 2:1)
// 外周の辺 (adjacentTileIds.length === 1) を等間隔に6つ選んで配置。

export function generatePorts(edges: Edge[]): Port[] {
  const perimeter = edges.filter(e => e.adjacentTileIds.length === 1);
  if (perimeter.length < 6) return [];

  // 中心を計算してangleでソート（時計回りに並べる）
  const cx = perimeter.reduce((s, e) => s + (e.x1 + e.x2) / 2, 0) / perimeter.length;
  const cy = perimeter.reduce((s, e) => s + (e.y1 + e.y2) / 2, 0) / perimeter.length;
  const sorted = [...perimeter].sort((a, b) => {
    const angA = Math.atan2((a.y1 + a.y2) / 2 - cy, (a.x1 + a.x2) / 2 - cx);
    const angB = Math.atan2((b.y1 + b.y2) / 2 - cy, (b.x1 + b.x2) / 2 - cx);
    return angA - angB;
  });

  const portTypes: Port['type'][] = ['general', 'rubber', 'general', 'oil', 'gold', 'food'];
  const step = Math.max(1, Math.floor(sorted.length / 6));
  const ports: Port[] = [];
  for (let i = 0; i < 6; i++) {
    const e = sorted[Math.min(i * step, sorted.length - 1)];
    ports.push({
      id: `port-${i}`,
      type: portTypes[i],
      vertexIds: [e.vertexIds[0], e.vertexIds[1]],
    });
  }
  return ports;
}

/**
 * 交易レート判定。
 * - 自分の拠点が一致資源港に隣接 → 2:1
 * - 自分の拠点が general 港に隣接 → 3:1
 * - それ以外 → 4:1
 */
export function getTradeRate(
  playerId: string,
  resource: ResourceType,
  settlements: Settlement[],
  ports: Port[]
): number {
  let best = 4;
  for (const port of ports) {
    const owns = port.vertexIds.some(vid =>
      settlements.some(s => s.vertexId === vid && s.playerId === playerId)
    );
    if (!owns) continue;
    if (port.type === resource && best > 2) best = 2;
    else if (port.type === 'general' && best > 3) best = 3;
  }
  return best;
}

// =============================================
// 1d6 MAP GENERATION (stages 1-3: normal 19-tile map with dice 1-6)
// =============================================
// Uses the standard 3-4-5-4-3 layout (19 tiles) with diceNumber 1-6 randomly distributed.
// Each number 1-6 appears 3 times across the 18 resource tiles.

export function generate1d6Map(): GameTile[] {
  const DESERT_INDEX = 9; // center of 3-4-5-4-3 layout
  const resourceTypes = shuffle(
    TILE_DISTRIBUTION.filter(t => t !== 'desert')
  );
  // 18 resource tiles, dice numbers 1-6 each appearing 3 times
  const diceNums1d6 = shuffle([1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6]);
  let numIdx = 0;
  let resIdx = 0;

  return HEX_LAYOUT.map((pos, i) => {
    if (i === DESERT_INDEX) {
      return { id: i, type: 'desert' as TileType, diceNumber: 0, q: pos.q, r: pos.r };
    }
    const type = resourceTypes[resIdx++] || 'rubber';
    const diceNumber = numIdx < diceNums1d6.length ? diceNums1d6[numIdx++] : 0;
    return { id: i, type, diceNumber, q: pos.q, r: pos.r };
  });
}

// =============================================
// RESOURCE DISTRIBUTION (Catan-style: vertex-based)
// =============================================

export function distributeResources(
  tiles: GameTile[],
  settlements: Settlement[],
  players: Player[],
  diceTotal: number
): { playerId: string; resource: ResourceType; amount: number; tileId: number }[] {
  return []; // Stub - use distributeResourcesWithVertices instead
}

// Full version that takes vertices
export function distributeResourcesWithVertices(
  tiles: GameTile[],
  vertices: Vertex[],
  settlements: Settlement[],
  players: Player[],
  diceTotal: number
): { playerId: string; resource: ResourceType; amount: number; tileId: number }[] {
  const gains: { playerId: string; resource: ResourceType; amount: number; tileId: number }[] = [];

  const matchingTiles = tiles.filter(t => t.diceNumber === diceTotal && t.type !== 'sea' && t.type !== 'desert');

  matchingTiles.forEach(tile => {
    // Find all vertices adjacent to this tile
    const adjacentVertices = vertices.filter(v => v.adjacentTileIds.includes(tile.id));

    adjacentVertices.forEach(vertex => {
      // Check if there's a settlement on this vertex
      const settlement = settlements.find(s => s.vertexId === vertex.id);
      if (!settlement) return;

      const amount = settlement.level === 'city' ? 2 : 1;
      const resource = tile.type as ResourceType;

      gains.push({
        playerId: settlement.playerId,
        resource,
        amount,
        tileId: tile.id,
      });
    });
  });

  return gains;
}

// =============================================
// BUILDING CHECKS
// =============================================

export function canAfford(player: Player, cost: Partial<Resources>): boolean {
  return (Object.entries(cost) as [ResourceType, number][]).every(
    ([res, amount]) => player.resources[res] >= amount
  );
}

export function payCost(player: Player, cost: Partial<Resources>): void {
  (Object.entries(cost) as [ResourceType, number][]).forEach(([res, amount]) => {
    player.resources[res] -= amount;
  });
}

// Check if a vertex is valid for building a settlement
// Simple version: no distance rule, no adjacent-enemy check, no BFS
export function canBuildSettlement(
  vertexId: string,
  playerId: string,
  vertices: Vertex[],
  settlements: Settlement[],
  roads: Road[],
  isSetupPhase: boolean,
  difficulty: Difficulty = 'normal',
): boolean {
  const vertex = vertices.find(v => v.id === vertexId);
  if (!vertex) return false;

  // No duplicate settlement on same vertex
  if (settlements.some(s => s.vertexId === vertexId)) return false;

  // Setup phase: place anywhere
  if (isSetupPhase) return true;

  // Normal play: must have own road connected
  const playerRoadEdgeIds = roads.filter(r => r.playerId === playerId).map(r => r.edgeId);
  return vertex.adjacentEdgeIds.some(eId => playerRoadEdgeIds.includes(eId));
}

// Check if an edge is valid for building a road
export function canBuildRoad(
  edgeId: string,
  playerId: string,
  edges: Edge[],
  vertices: Vertex[],
  settlements: Settlement[],
  roads: Road[],
  isSetupPhase: boolean,
  lastPlacedVertexId?: string | null
): boolean {
  const edge = edges.find(e => e.id === edgeId);
  if (!edge) return false;

  // Check no road already exists on this edge
  if (roads.some(r => r.edgeId === edgeId)) return false;

  // During setup phase, road must connect to the just-placed settlement
  if (isSetupPhase && lastPlacedVertexId) {
    return edge.vertexIds.includes(lastPlacedVertexId);
  }

  // During normal play, road must connect to player's existing road or settlement
  const [v1Id, v2Id] = edge.vertexIds;

  // Check if either vertex has the player's settlement
  const hasSettlement = settlements.some(s =>
    s.playerId === playerId && (s.vertexId === v1Id || s.vertexId === v2Id)
  );
  if (hasSettlement) return true;

  // Check if either vertex connects to the player's existing road
  const v1 = vertices.find(v => v.id === v1Id);
  const v2 = vertices.find(v => v.id === v2Id);

  const playerRoadEdgeIds = new Set(roads.filter(r => r.playerId === playerId).map(r => r.edgeId));

  if (v1) {
    const v1HasRoad = v1.adjacentEdgeIds.some(eId => eId !== edgeId && playerRoadEdgeIds.has(eId));
    const v1BlockedByOther = settlements.some(s => s.playerId !== playerId && s.vertexId === v1Id);
    if (v1HasRoad && !v1BlockedByOther) return true;
  }

  if (v2) {
    const v2HasRoad = v2.adjacentEdgeIds.some(eId => eId !== edgeId && playerRoadEdgeIds.has(eId));
    const v2BlockedByOther = settlements.some(s => s.playerId !== playerId && s.vertexId === v2Id);
    if (v2HasRoad && !v2BlockedByOther) return true;
  }

  return false;
}

// Get all valid vertex IDs for building a settlement
export function getValidSettlementVertices(
  playerId: string,
  vertices: Vertex[],
  settlements: Settlement[],
  roads: Road[],
  isSetupPhase: boolean
): string[] {
  return vertices
    .filter(v => canBuildSettlement(v.id, playerId, vertices, settlements, roads, isSetupPhase))
    .map(v => v.id);
}

// Get all valid edge IDs for building a road
export function getValidRoadEdges(
  playerId: string,
  edges: Edge[],
  vertices: Vertex[],
  settlements: Settlement[],
  roads: Road[],
  isSetupPhase: boolean,
  lastPlacedVertexId?: string | null
): string[] {
  return edges
    .filter(e => canBuildRoad(e.id, playerId, edges, vertices, settlements, roads, isSetupPhase, lastPlacedVertexId))
    .map(e => e.id);
}

// Get vertices where player can upgrade settlement to city
export function getUpgradeableVertices(
  playerId: string,
  settlements: Settlement[]
): string[] {
  return settlements
    .filter(s => s.playerId === playerId && s.level === 'settlement')
    .map(s => s.vertexId);
}

// =============================================
// LONGEST ROAD CALCULATION
// =============================================

export function calculateLongestRoad(
  playerId: string,
  roads: Road[],
  edges: Edge[],
  vertices: Vertex[],
  settlements: Settlement[]
): number {
  const playerRoads = roads.filter(r => r.playerId === playerId);
  if (playerRoads.length === 0) return 0;

  // Build adjacency graph of the player's road network
  const roadGraph = new Map<string, Set<string>>();

  playerRoads.forEach(road => {
    const edge = edges.find(e => e.id === road.edgeId);
    if (!edge) return;
    const [v1, v2] = edge.vertexIds;

    if (!roadGraph.has(v1)) roadGraph.set(v1, new Set());
    if (!roadGraph.has(v2)) roadGraph.set(v2, new Set());
    roadGraph.get(v1)!.add(v2);
    roadGraph.get(v2)!.add(v1);
  });

  // Check for opponent settlements that break the road
  const blockingVertices = new Set<string>();
  settlements.forEach(s => {
    if (s.playerId !== playerId) {
      blockingVertices.add(s.vertexId);
    }
  });

  // DFS to find longest path
  let maxLength = 0;

  function dfs(current: string, visited: Set<string>, length: number) {
    maxLength = Math.max(maxLength, length);
    const neighbors = roadGraph.get(current);
    if (!neighbors) return;

    neighbors.forEach(next => {
      const edgeKey = [current, next].sort().join('_');
      if (visited.has(edgeKey)) return;
      if (blockingVertices.has(next)) return;

      visited.add(edgeKey);
      dfs(next, visited, length + 1);
      visited.delete(edgeKey);
    });
  }

  // Start DFS from every vertex in the road network
  roadGraph.forEach((_, startVertex) => {
    dfs(startVertex, new Set(), 0);
  });

  return maxLength;
}

// =============================================
// AI LOGIC
// =============================================

// AI: Choose best vertex for initial settlement placement
export function aiChooseSetupVertex(
  playerId: string,
  tiles: GameTile[],
  vertices: Vertex[],
  settlements: Settlement[],
  roads: Road[]
): string | null {
  const valid = getValidSettlementVertices(playerId, vertices, settlements, roads, true);
  if (valid.length === 0) return null;

  // Score each vertex by the value of adjacent tiles
  const scored = valid.map(vId => {
    const vertex = vertices.find(v => v.id === vId)!;
    let score = 0;
    vertex.adjacentTileIds.forEach(tileId => {
      const tile = tiles.find(t => t.id === tileId);
      if (!tile || tile.type === 'sea' || tile.type === 'desert') return;
      // Higher probability dice numbers are more valuable
      const prob = tile.diceNumber <= 6 ? tile.diceNumber - 1 : 13 - tile.diceNumber;
      score += prob;
      // Diversity bonus
      score += 1;
    });
    return { vId, score };
  });

  scored.sort((a, b) => b.score - a.score);
  // Pick from top 3 randomly for variety
  const topN = scored.slice(0, Math.min(3, scored.length));
  return topN[Math.floor(Math.random() * topN.length)].vId;
}

// AI: Choose edge for initial road placement
export function aiChooseSetupRoad(
  playerId: string,
  edges: Edge[],
  vertices: Vertex[],
  settlements: Settlement[],
  roads: Road[],
  lastPlacedVertexId: string
): string | null {
  const valid = getValidRoadEdges(playerId, edges, vertices, settlements, roads, true, lastPlacedVertexId);
  if (valid.length === 0) return null;
  return valid[Math.floor(Math.random() * valid.length)];
}

// AI Turn: decide actions during normal gameplay
export interface AITurnAction {
  type: 'build_settlement' | 'build_road' | 'upgrade_city' | 'trade' | 'pass';
  vertexId?: string;
  edgeId?: string;
  tradeFrom?: ResourceType;
  tradeTo?: ResourceType;
}

export function aiTurn(
  player: Player,
  tiles: GameTile[],
  vertices: Vertex[],
  edges: Edge[],
  settlements: Settlement[],
  roads: Road[],
  difficulty: Difficulty
): AITurnAction[] {
  const actions: AITurnAction[] = [];
  
  // Clone player resources for simulation
  const simResources = { ...player.resources };

  const canAffordSim = (cost: Partial<Resources>): boolean => {
    return (Object.entries(cost) as [ResourceType, number][]).every(
      ([res, amount]) => simResources[res] >= amount
    );
  };

  const payCostSim = (cost: Partial<Resources>): void => {
    (Object.entries(cost) as [ResourceType, number][]).forEach(([res, amount]) => {
      simResources[res] -= amount;
    });
  };

  // Priority: Build settlement > Build road > Upgrade to city
  // Try to build settlement
  if (canAffordSim(BUILD_COSTS.settlement)) {
    const validVertices = getValidSettlementVertices(player.id, vertices, settlements, roads, false);
    if (validVertices.length > 0) {
      // Score vertices
      const scored = validVertices.map(vId => {
        const vertex = vertices.find(v => v.id === vId)!;
        let score = 0;
        vertex.adjacentTileIds.forEach(tileId => {
          const tile = tiles.find(t => t.id === tileId);
          if (!tile || tile.type === 'sea' || tile.type === 'desert') return;
          const prob = tile.diceNumber <= 6 ? tile.diceNumber - 1 : 13 - tile.diceNumber;
          score += prob;
        });
        return { vId, score };
      });
      scored.sort((a, b) => b.score - a.score);
      const chosen = scored[0].vId;
      actions.push({ type: 'build_settlement', vertexId: chosen });
      payCostSim(BUILD_COSTS.settlement);
    }
  }

  // Try to build road
  if (canAffordSim(BUILD_COSTS.road)) {
    const validEdges = getValidRoadEdges(player.id, edges, vertices, settlements, roads, false);
    if (validEdges.length > 0) {
      const chosen = validEdges[Math.floor(Math.random() * validEdges.length)];
      actions.push({ type: 'build_road', edgeId: chosen });
      payCostSim(BUILD_COSTS.road);
    }
  }

  // Try to upgrade to city
  if (canAffordSim(BUILD_COSTS.city)) {
    const upgradeable = getUpgradeableVertices(player.id, settlements);
    if (upgradeable.length > 0) {
      const chosen = upgradeable[Math.floor(Math.random() * upgradeable.length)];
      actions.push({ type: 'upgrade_city', vertexId: chosen });
      payCostSim(BUILD_COSTS.city);
    }
  }

  // Trade if we have excess resources (4:1)
  if (difficulty !== 'easy' && actions.length === 0) {
    const resources: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
    const excess = resources.find(r => simResources[r] >= 4);
    const needed = resources.find(r => simResources[r] === 0);
    if (excess && needed) {
      actions.push({ type: 'trade', tradeFrom: excess, tradeTo: needed });
    }
  }

  if (actions.length === 0) {
    actions.push({ type: 'pass' });
  }

  return actions;
}

// =============================================
// EVENT HANDLING
// =============================================

export function getRandomEvent(difficulty: Difficulty): EventCard | null {
  const chance = difficulty === 'easy' ? 0.1 : difficulty === 'normal' ? 0.2 : 0.3;
  if (Math.random() > chance) return null;

  const event = EVENT_CARDS[Math.floor(Math.random() * EVENT_CARDS.length)];
  return { ...event, id: genId() };
}

export function generateGameLog(message: string, type?: GameLogEntry['type'], playerId?: string): GameLogEntry {
  return {
    id: genId(),
    message,
    type: type || 'info',
    timestamp: Date.now(),
    playerId,
  };
}
