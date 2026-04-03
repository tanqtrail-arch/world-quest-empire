// ===== Game Logic Utilities =====
import {
  type GameTile, type Player, type Resources, type ResourceType, type TileType,
  type StructureType, type EventCard, type GameLogEntry, type Difficulty,
  HEX_LAYOUT, TILE_DISTRIBUTION, DICE_NUMBERS, EVENT_CARDS,
  BUILD_COSTS, EXPAND_COST, VP_VALUES, WINNING_SCORE,
  PLAYER_COLORS,
} from './gameTypes';

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

// --- Generate Map ---
export function generateMap(): GameTile[] {
  const shuffledTypes = shuffle(TILE_DISTRIBUTION);
  const nonSeaIndices: number[] = [];
  shuffledTypes.forEach((t, i) => { if (t !== 'sea') nonSeaIndices.push(i); });
  
  const shuffledNumbers = shuffle(DICE_NUMBERS);
  let numIdx = 0;

  return HEX_LAYOUT.map((pos, i) => {
    const type = shuffledTypes[i] || 'sea';
    let diceNumber = 0;
    if (type !== 'sea' && numIdx < shuffledNumbers.length) {
      diceNumber = shuffledNumbers[numIdx++];
    }
    return {
      id: i,
      type,
      diceNumber,
      q: pos.q,
      r: pos.r,
      structures: [],
    };
  });
}

// --- Create Player ---
export function createPlayer(name: string, index: number, isAI = false): Player {
  const colorInfo = PLAYER_COLORS[index % PLAYER_COLORS.length];
  return {
    id: genId(),
    name,
    color: colorInfo.color,
    colorName: colorInfo.name,
    flagEmoji: colorInfo.flagEmoji,
    countryName: colorInfo.countryName,
    resources: { rubber: 2, oil: 2, gold: 2, food: 2 },
    victoryPoints: 0,
    structures: [],
    eventCards: [],
    isAI,
  };
}

// --- Roll Dice ---
export function rollDice(): [number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}

// --- Distribute Resources ---
export function distributeResources(
  tiles: GameTile[],
  players: Player[],
  diceTotal: number
): { player: Player; resource: ResourceType; amount: number }[] {
  const gains: { player: Player; resource: ResourceType; amount: number }[] = [];

  tiles.forEach(tile => {
    if (tile.diceNumber !== diceTotal || tile.type === 'sea') return;
    
    tile.structures.forEach(struct => {
      const player = players.find(p => p.id === struct.playerId);
      if (!player) return;
      
      const amount = struct.type === 'city' ? 2 : 1;
      const resource = tile.type as ResourceType;
      
      player.resources[resource] += amount;
      gains.push({ player, resource, amount });
    });
  });

  return gains;
}

// --- Check if player can afford ---
export function canAfford(player: Player, cost: Partial<Resources>): boolean {
  return (Object.entries(cost) as [ResourceType, number][]).every(
    ([res, amount]) => player.resources[res] >= amount
  );
}

// --- Pay Cost ---
export function payCost(player: Player, cost: Partial<Resources>): void {
  (Object.entries(cost) as [ResourceType, number][]).forEach(([res, amount]) => {
    player.resources[res] -= amount;
  });
}

// --- Build Structure ---
export function buildStructure(
  player: Player,
  tile: GameTile,
  type: StructureType,
  vertexKey?: string
): boolean {
  const cost = BUILD_COSTS[type];
  if (!canAfford(player, cost)) return false;

  payCost(player, cost);

  const structure = {
    playerId: player.id,
    type,
    vertexKey: vertexKey || `v${tile.id}-${genId()}`,
  };

  tile.structures.push(structure);
  player.structures.push(structure);
  player.victoryPoints += VP_VALUES[type];

  return true;
}

// --- Upgrade to City ---
export function upgradeToCity(player: Player, tile: GameTile, structureIndex: number): boolean {
  const cost = BUILD_COSTS.city;
  if (!canAfford(player, cost)) return false;

  const struct = tile.structures[structureIndex];
  if (!struct || struct.playerId !== player.id || struct.type !== 'settlement') return false;

  payCost(player, cost);
  struct.type = 'city';

  // Update in player's structures too
  const playerStruct = player.structures.find(
    s => s.vertexKey === struct.vertexKey && s.type === 'settlement'
  );
  if (playerStruct) {
    playerStruct.type = 'city';
  }

  player.victoryPoints += 1; // city is 2, settlement was 1, so +1

  return true;
}

// --- Draw Event Card ---
export function drawEventCard(): EventCard {
  const template = EVENT_CARDS[Math.floor(Math.random() * EVENT_CARDS.length)];
  return { ...template, id: genId() };
}

// --- Should Trigger Event ---
export function shouldTriggerEvent(
  player: Player,
  diceTotal: number,
  difficulty: Difficulty
): boolean {
  // 7 always triggers
  if (diceTotal === 7) return true;

  // More structures = higher chance
  const structCount = player.structures.filter(s => s.type !== 'ship').length;
  const hasOverseas = structCount >= 3;

  let chance = 0;
  if (hasOverseas) chance += 0.2;
  if (structCount >= 4) chance += 0.15;
  if (difficulty === 'hard') chance += 0.1;
  if (difficulty === 'easy') chance -= 0.1;

  return Math.random() < chance;
}

// --- Apply Event ---
export function applyEvent(player: Player, event: EventCard): string {
  switch (event.effectType) {
    case 'lose_resources': {
      const types: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
      let lost = 0;
      for (let i = 0; i < event.effectValue && lost < event.effectValue; i++) {
        const available = types.filter(t => player.resources[t] > 0);
        if (available.length === 0) break;
        const res = available[Math.floor(Math.random() * available.length)];
        player.resources[res]--;
        lost++;
      }
      return `${player.name}は資源を${lost}つ失った！`;
    }
    case 'lose_food': {
      const lost = Math.min(player.resources.food, event.effectValue);
      player.resources.food -= lost;
      return `${player.name}は食料を${lost}つ失った！`;
    }
    case 'lose_structure': {
      // Remove a random non-ship structure
      const removable = player.structures.filter(s => s.type !== 'ship');
      if (removable.length > 0) {
        const idx = Math.floor(Math.random() * removable.length);
        const removed = removable[idx];
        player.structures = player.structures.filter(s => s !== removed);
        player.victoryPoints -= VP_VALUES[removed.type];
        return `${player.name}の拠点が1つなくなった！`;
      }
      return `${player.name}には影響がなかった。`;
    }
    case 'gain_resources': {
      const types: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
      for (let i = 0; i < event.effectValue; i++) {
        const res = types[Math.floor(Math.random() * types.length)];
        player.resources[res]++;
      }
      return `${player.name}は資源を${event.effectValue}つゲット！`;
    }
    case 'gain_all': {
      (['rubber', 'oil', 'gold', 'food'] as ResourceType[]).forEach(res => {
        player.resources[res] += event.effectValue;
      });
      return `${player.name}は全資源を${event.effectValue}つずつゲット！`;
    }
    case 'free_ship': {
      return `${player.name}は船を無料で建設できる！`;
    }
    case 'discount_build': {
      return `${player.name}の次の建設コストが半分になる！`;
    }
    case 'skip_turn': {
      return `${player.name}は1ターン行動できない！`;
    }
    default:
      return `イベント発生！`;
  }
}

// --- Check Win ---
export function checkWin(player: Player, difficulty: Difficulty): boolean {
  return player.victoryPoints >= WINNING_SCORE[difficulty];
}

// --- Create Log Entry ---
export function createLog(
  message: string,
  type: GameLogEntry['type'],
  playerId?: string
): GameLogEntry {
  return {
    id: genId(),
    message,
    type,
    timestamp: Date.now(),
    playerId,
  };
}

// --- AI Turn ---
export function aiTurn(player: Player, tiles: GameTile[]): string[] {
  const actions: string[] = [];

  // Try to build settlement on a random tile
  const availableTiles = tiles.filter(
    t => t.type !== 'sea' && !t.structures.some(s => s.playerId === player.id)
  );

  if (availableTiles.length > 0 && canAfford(player, BUILD_COSTS.settlement)) {
    const tile = availableTiles[Math.floor(Math.random() * availableTiles.length)];
    if (buildStructure(player, tile, 'settlement')) {
      actions.push(`${player.name}が拠点を建設した！`);
    }
  }

  // Try to upgrade a settlement to city
  const upgradeable = tiles.filter(t =>
    t.structures.some(s => s.playerId === player.id && s.type === 'settlement')
  );
  if (upgradeable.length > 0 && canAfford(player, BUILD_COSTS.city)) {
    const tile = upgradeable[Math.floor(Math.random() * upgradeable.length)];
    const structIdx = tile.structures.findIndex(
      s => s.playerId === player.id && s.type === 'settlement'
    );
    if (structIdx >= 0 && upgradeToCity(player, tile, structIdx)) {
      actions.push(`${player.name}が都市にアップグレードした！`);
    }
  }

  return actions;
}

// --- Get tile neighbors ---
export function getTileNeighbors(q: number, r: number): { q: number; r: number }[] {
  // Offset hex neighbors
  return [
    { q: q + 1, r },
    { q: q - 1, r },
    { q, r: r + 1 },
    { q, r: r - 1 },
    { q: q + 1, r: r - 1 },
    { q: q - 1, r: r + 1 },
  ];
}
