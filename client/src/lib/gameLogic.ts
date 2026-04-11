// ===== Game Logic Utilities (Catan-style vertex/edge system) =====
import {
  type GameTile, type Player, type Resources, type ResourceType, type TileType,
  type EventCard, type GameLogEntry, type Difficulty,
  type Vertex, type Edge, type Settlement, type Road, type Port,
  HEX_LAYOUT, TILE_DISTRIBUTION, DICE_NUMBERS, EVENT_CARDS,
  HEX_LAYOUT_LARGE, TILE_DISTRIBUTION_LARGE, DICE_NUMBERS_LARGE, ROWS_LARGE,
  BUILD_COSTS, VP_VALUES, WINNING_SCORE, PLAYER_COLORS,
  TRADE_RATE_DEFAULT, TRADE_RATE_GENERAL_PORT, TRADE_RATE_SPECIAL_PORT,
} from './gameTypes';
import {
  HEX_SIZE, ROWS, COL_SPACING, ROW_SPACING,
  getTileCenter, getHexCorners, roundCoord, coordKey,
  ROWS_LARGE as GEO_ROWS_LARGE,
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
export function generateVerticesAndEdges(tiles: GameTile[], rows?: number[]): { vertices: Vertex[]; edges: Edge[] } {
  const mapRows = rows || ROWS;
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

export function generateMap(playerCount: number = 3): GameTile[] {
  const isLarge = playerCount >= 5;
  const layout = isLarge ? HEX_LAYOUT_LARGE : HEX_LAYOUT;
  const distribution = isLarge ? TILE_DISTRIBUTION_LARGE : TILE_DISTRIBUTION;
  const diceNumbers = isLarge ? DICE_NUMBERS_LARGE : DICE_NUMBERS;
  const centerIndex = isLarge ? 12 : 9; // center of 4-5-6-5-4 or 3-4-5-4-3

  const resourceTypes = shuffle(distribution.filter(t => t !== 'desert'));
  const shuffledNumbers = shuffle(diceNumbers);
  let numIdx = 0;
  let resIdx = 0;

  return layout.map((pos, i) => {
    if (i === centerIndex) {
      return { id: i, type: 'desert' as TileType, diceNumber: 0, q: pos.q, r: pos.r };
    }
    const type = resourceTypes[resIdx++] || 'rubber';
    const diceNumber = numIdx < shuffledNumbers.length ? shuffledNumbers[numIdx++] : 0;
    return { id: i, type, diceNumber, q: pos.q, r: pos.r };
  });
}

export function getMapRows(playerCount: number): number[] {
  return playerCount >= 5 ? ROWS_LARGE : ROWS;
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
// 条件: (1) その頂点に誰の拠点もない (2) setupならどこでもOK (3) 通常は自分の道に隣接
export function canBuildSettlement(
  vertexId: string,
  playerId: string,
  vertices: Vertex[],
  settlements: Settlement[],
  roads: Road[],
  isSetupPhase: boolean,
  difficulty: Difficulty = 'normal'
): boolean {
  const vertex = vertices.find(v => v.id === vertexId);
  if (!vertex) return false;
  if (settlements.some(s => s.vertexId === vertexId)) return false;
  if (isSetupPhase) return true;
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
  isSetupPhase: boolean,
  difficulty: Difficulty = 'normal'
): string[] {
  const result = vertices
    .filter(v => canBuildSettlement(v.id, playerId, vertices, settlements, roads, isSetupPhase, difficulty))
    .map(v => v.id);

  // --- Debug logging ---
  if (!isSetupPhase) {
    const playerRoads = roads.filter(r => r.playerId === playerId);
    const playerRoadEdgeIds = new Set(playerRoads.map(r => r.edgeId));

    // Find all vertices connected to player's roads
    const roadVertexIds = new Set<string>();
    vertices.forEach(v => {
      if (v.adjacentEdgeIds.some(eId => playerRoadEdgeIds.has(eId))) {
        roadVertexIds.add(v.id);
      }
    });

    const analysis: { vertex: string; canBuild: boolean; reason: string }[] = [];
    roadVertexIds.forEach(vid => {
      const canBuild = canBuildSettlement(vid, playerId, vertices, settlements, roads, false, difficulty);
      if (settlements.some(s => s.vertexId === vid)) {
        analysis.push({ vertex: vid, canBuild, reason: 'OCCUPIED' });
      } else if (!canBuild) {
        analysis.push({ vertex: vid, canBuild, reason: 'NO_ROAD' });
      } else {
        analysis.push({ vertex: vid, canBuild, reason: 'OK' });
      }
    });

    console.group(`[Settlement] player=${playerId.slice(-6)}, roads=${playerRoads.length}, valid=${result.length}`);
    console.table(analysis);
    if (result.length === 0) {
      console.warn('NO VALID VERTICES!');
    }
    console.groupEnd();
  }

  return result;
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
// PORT GENERATION & TRADE RATE
// =============================================

// Generate ports on the outer edges of the map
export function generatePorts(vertices: Vertex[], tiles: GameTile[]): Port[] {
  // Find outer vertices: vertices that have fewer than 3 non-sea adjacent tiles
  const outerEdgeVertices: string[] = [];
  vertices.forEach(v => {
    const nonSeaTiles = v.adjacentTileIds.filter(tid => {
      const t = tiles.find(tt => tt.id === tid);
      return t && t.type !== 'sea';
    });
    // Outer vertices touch 1-2 non-sea tiles (inner vertices touch 3)
    if (nonSeaTiles.length > 0 && nonSeaTiles.length < 3) {
      outerEdgeVertices.push(v.id);
    }
  });

  // Find pairs of adjacent outer vertices (these form port edges)
  const outerPairs: [string, string][] = [];
  const usedVertices = new Set<string>();

  for (const vId of outerEdgeVertices) {
    if (usedVertices.has(vId)) continue;
    const v = vertices.find(vv => vv.id === vId)!;
    for (const adjId of v.adjacentVertexIds) {
      if (usedVertices.has(adjId)) continue;
      if (outerEdgeVertices.includes(adjId)) {
        outerPairs.push([vId, adjId]);
        usedVertices.add(vId);
        usedVertices.add(adjId);
        break;
      }
    }
  }

  // Shuffle and pick 6 ports
  const shuffledPairs = shuffle(outerPairs);
  const portTypes: ('general' | ResourceType)[] = ['general', 'general', 'rubber', 'oil', 'gold', 'food'];
  const shuffledTypes = shuffle(portTypes);

  const ports: Port[] = [];
  const count = Math.min(shuffledPairs.length, shuffledTypes.length);
  for (let i = 0; i < count; i++) {
    ports.push({
      id: `port${i}`,
      vertexIds: [shuffledPairs[i][0], shuffledPairs[i][1]],
      type: shuffledTypes[i],
    });
  }

  return ports;
}

// Get the trade rate for a given player and resource
export function getTradeRate(
  playerId: string,
  resource: ResourceType,
  settlements: Settlement[],
  ports: Port[]
): number {
  const playerVertexIds = new Set(
    settlements.filter(s => s.playerId === playerId).map(s => s.vertexId)
  );

  let bestRate = TRADE_RATE_DEFAULT;

  for (const port of ports) {
    const hasSettlementAtPort = port.vertexIds.some(vid => playerVertexIds.has(vid));
    if (!hasSettlementAtPort) continue;

    if (port.type === resource) {
      return TRADE_RATE_SPECIAL_PORT; // 2:1 is the best possible
    }
    if (port.type === 'general' && bestRate > TRADE_RATE_GENERAL_PORT) {
      bestRate = TRADE_RATE_GENERAL_PORT;
    }
  }

  return bestRate;
}

// =============================================
// AI LOGIC
// =============================================

// AI: Choose vertex for initial settlement placement (difficulty-scaled)
export function aiChooseSetupVertex(
  playerId: string,
  tiles: GameTile[],
  vertices: Vertex[],
  settlements: Settlement[],
  roads: Road[],
  difficulty: Difficulty = 'easy'
): string | null {
  const valid = getValidSettlementVertices(playerId, vertices, settlements, roads, true);
  if (valid.length === 0) return null;

  // Easy: pure random
  if (difficulty === 'easy') {
    return valid[Math.floor(Math.random() * valid.length)];
  }

  // Score each vertex by the value of adjacent tiles
  const scored = valid.map(vId => {
    const vertex = vertices.find(v => v.id === vId)!;
    let score = 0;
    vertex.adjacentTileIds.forEach(tileId => {
      const tile = tiles.find(t => t.id === tileId);
      if (!tile || tile.type === 'sea' || tile.type === 'desert') return;
      const prob = tile.diceNumber <= 6 ? tile.diceNumber - 1 : 13 - tile.diceNumber;
      score += prob + 1;
    });
    return { vId, score };
  });
  scored.sort((a, b) => b.score - a.score);

  // Normal: pick from top 50%
  if (difficulty === 'normal') {
    const topHalf = scored.slice(0, Math.max(1, Math.ceil(scored.length / 2)));
    return topHalf[Math.floor(Math.random() * topHalf.length)].vId;
  }

  // Hard: pick from top 3
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
  difficulty: Difficulty,
  ports: Port[] = []
): AITurnAction[] {
  const actions: AITurnAction[] = [];
  const simResources = { ...player.resources };

  const canAffordSim = (cost: Partial<Resources>): boolean =>
    (Object.entries(cost) as [ResourceType, number][]).every(([res, amt]) => simResources[res] >= amt);

  const payCostSim = (cost: Partial<Resources>): void =>
    (Object.entries(cost) as [ResourceType, number][]).forEach(([res, amt]) => { simResources[res] -= amt; });

  // Max actions per turn: easy=1, normal=2, hard=unlimited
  const maxActions = difficulty === 'easy' ? 1 : difficulty === 'normal' ? 2 : 99;

  // --- Helpers ---
  const tryBuildSettlement = (): boolean => {
    if (actions.length >= maxActions) return false;
    if (!canAffordSim(BUILD_COSTS.settlement)) return false;
    const validVertices = getValidSettlementVertices(player.id, vertices, settlements, roads, false, difficulty);
    if (validVertices.length === 0) return false;
    let chosen: string;
    if (difficulty === 'easy') {
      chosen = validVertices[Math.floor(Math.random() * validVertices.length)];
    } else if (difficulty === 'normal') {
      const scored = scoreVertices(validVertices, vertices, tiles);
      const topHalf = scored.slice(0, Math.max(1, Math.ceil(scored.length / 2)));
      chosen = topHalf[Math.floor(Math.random() * topHalf.length)].vId;
    } else {
      const scored = scoreVertices(validVertices, vertices, tiles);
      chosen = scored[0].vId;
    }
    actions.push({ type: 'build_settlement', vertexId: chosen });
    payCostSim(BUILD_COSTS.settlement);
    return true;
  };

  const tryBuildRoad = (): boolean => {
    if (actions.length >= maxActions) return false;
    if (!canAffordSim(BUILD_COSTS.road)) return false;
    const validEdges = getValidRoadEdges(player.id, edges, vertices, settlements, roads, false);
    if (validEdges.length === 0) return false;
    const chosen = validEdges[Math.floor(Math.random() * validEdges.length)];
    actions.push({ type: 'build_road', edgeId: chosen });
    payCostSim(BUILD_COSTS.road);
    return true;
  };

  const tryUpgradeCity = (): boolean => {
    if (actions.length >= maxActions) return false;
    if (!canAffordSim(BUILD_COSTS.city)) return false;
    const upgradeable = getUpgradeableVertices(player.id, settlements);
    if (upgradeable.length === 0) return false;
    const chosen = upgradeable[Math.floor(Math.random() * upgradeable.length)];
    actions.push({ type: 'upgrade_city', vertexId: chosen });
    payCostSim(BUILD_COSTS.city);
    return true;
  };

  const tryTrade = (): boolean => {
    if (actions.length >= maxActions) return false;
    const allRes: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
    const needed = allRes.find(r => simResources[r] === 0);
    if (!needed) return false;
    // Find excess resource considering port trade rates
    const excess = allRes.find(r => {
      const rate = getTradeRate(player.id, r, settlements, ports);
      const threshold = difficulty === 'hard' ? rate : rate + 1;
      return simResources[r] >= threshold;
    });
    if (!excess) return false;
    const rate = getTradeRate(player.id, excess, settlements, ports);
    simResources[excess] -= rate;
    simResources[needed] += 1;
    actions.push({ type: 'trade', tradeFrom: excess, tradeTo: needed });
    return true;
  };

  const playerSettlementCount = settlements.filter(s => s.playerId === player.id && s.level === 'settlement').length;

  // =============================================
  // EASY: simple — settlement or road only, 1 action max
  // =============================================
  if (difficulty === 'easy') {
    if (!tryBuildSettlement()) {
      tryBuildRoad();
    }

  // =============================================
  // NORMAL: balanced — up to 2 actions, trade on excess 5+
  // =============================================
  } else if (difficulty === 'normal') {
    if (playerSettlementCount >= 2) {
      if (!tryUpgradeCity()) tryBuildSettlement();
    } else {
      tryBuildSettlement();
    }
    tryBuildRoad();
    if (actions.length === 0) tryTrade();

  // =============================================
  // HARD: aggressive — unlimited actions, proactive trading
  // =============================================
  } else {
    // Trade first if it enables a build
    if (!canAffordSim(BUILD_COSTS.city) && !canAffordSim(BUILD_COSTS.settlement)) {
      tryTrade();
    }
    // Build loop: keep building until out of resources or options
    if (playerSettlementCount >= 3) {
      tryUpgradeCity();
      tryBuildRoad();
      tryBuildSettlement();
      tryUpgradeCity(); // try again after road
    } else if (playerSettlementCount >= 2) {
      if (!tryUpgradeCity()) tryBuildSettlement();
      tryBuildRoad();
      tryBuildSettlement();
    } else {
      tryBuildSettlement();
      tryBuildRoad();
      tryBuildSettlement();
      tryUpgradeCity();
    }
    // Trade leftover excess
    if (actions.length === 0) tryTrade();
  }

  if (actions.length === 0) {
    actions.push({ type: 'pass' });
  }

  return actions;
}

// Score vertices by adjacent tile dice probability
function scoreVertices(
  validVertices: string[],
  vertices: Vertex[],
  tiles: GameTile[]
): { vId: string; score: number }[] {
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
  return scored;
}

// =============================================
// EVENT HANDLING
// =============================================

export function getRandomEvent(difficulty: Difficulty): EventCard | null {
  // Events only trigger on dice 7 now, so use higher probability
  const chance = difficulty === 'easy' ? 0.4 : difficulty === 'normal' ? 0.6 : 0.8;
  if (Math.random() > chance) return null;

  const template = EVENT_CARDS[Math.floor(Math.random() * EVENT_CARDS.length)];
  return { ...template, id: genId() } as EventCard;
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
