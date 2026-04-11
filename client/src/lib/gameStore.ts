// ===== Game Store (Zustand) - Catan-style vertex/edge system =====
import { create } from 'zustand';
import {
  type Player, type GameTile, type Vertex, type Edge,
  type Settlement, type Road, type Resources, type ResourceType,
  type EventCard, type GameLogEntry, type Difficulty, type GamePhase,
  type SetupStep, type PlayerSlot,
  BUILD_COSTS, VP_VALUES, WINNING_SCORE, PLAYER_COLORS,
} from './gameTypes';
import {
  generateMap, generateVerticesAndEdges, createPlayer, rollDice,
  distributeResourcesWithVertices, canAfford, payCost,
  canBuildSettlement, canBuildRoad, getValidSettlementVertices,
  getValidRoadEdges, getUpgradeableVertices, calculateLongestRoad,
  getRandomEvent, generateGameLog, genId,
  aiChooseSetupVertex, aiChooseSetupRoad, aiTurn,
  type AITurnAction,
} from './gameLogic';

// --- AI Action Types ---
export interface AIAction {
  type: 'turn_start' | 'dice_roll' | 'resource_gain' | 'no_resource' | 'build_road' | 'build_settlement' | 'upgrade_city' | 'turn_end';
  playerId: string;
  playerName: string;
  playerFlag: string;
  playerColor: string;
  dice?: [number, number];
  diceTotal?: number;
  highlightTileIds?: number[];
  resource?: ResourceType;
  resourceAmount?: number;
  edgeId?: string;
  vertexId?: string;
  buildType?: string;
}

// --- Resource Gain Popup ---
interface ResourceGainPopup {
  playerId: string;
  playerName: string;
  playerFlag: string;
  playerColor: string;
  resource: ResourceType;
  amount: number;
}

// --- Game Store Interface ---
interface GameStore {
  screen: 'title' | 'create' | 'game' | 'result';
  setScreen: (screen: GameStore['screen']) => void;

  // Game state
  players: Player[];
  tiles: GameTile[];
  vertices: Vertex[];
  edges: Edge[];
  settlements: Settlement[];
  roads: Road[];
  currentPlayerIndex: number;
  currentTurn: number;
  maxTurns: number;
  phase: GamePhase;
  diceResult: [number, number] | null;
  difficulty: Difficulty;
  gameLog: GameLogEntry[];
  currentEvent: EventCard | null;
  pendingEvent: EventCard | null;
  winner: Player | null;
  longestRoadPlayerId: string | null;

  // Setup phase
  setupPhase: {
    currentPlayerIndex: number;
    round: number;
    step: SetupStep;
    lastPlacedVertexId: string | null;
  } | null;

  // Build mode
  buildMode: 'settlement' | 'city' | 'road' | null;
  selectedVertexId: string | null;
  selectedEdgeId: string | null;
  highlightedTileIds: number[];
  highlightedVertexIds: string[];
  highlightedEdgeIds: string[];

  // Dice result zoom
  showResourceGains: boolean;
  resourceGains: ResourceGainPopup[];

  // AI turn
  isPlayingAI: boolean;
  aiActionQueue: AIAction[];
  currentAIAction: AIAction | null;

  // Handoff (local multiplayer)
  handoffPlayerIndex: number | null;

  // Actions
  initGame: (slots: PlayerSlot[], difficulty: Difficulty) => void;
  doRollDice: () => void;
  dismissResourceGains: () => void;
  startBuild: (type: 'settlement' | 'city' | 'road') => void;
  cancelBuild: () => void;
  selectVertex: (vertexId: string) => void;
  selectEdge: (edgeId: string) => void;
  confirmBuild: () => void;
  doTrade: (give: ResourceType, receive: ResourceType) => void;
  handleEvent: () => void;
  doEndTurn: () => void;
  playNextAIAction: () => void;
  getCurrentPlayer: () => Player;
  addLog: (message: string, type: GameLogEntry['type'], playerId?: string) => void;
  confirmHandoff: () => void;

  // Setup phase actions
  setupPlaceSettlement: (vertexId: string) => void;
  setupPlaceRoad: (edgeId: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'title',
  setScreen: (screen) => set({ screen }),

  players: [],
  tiles: [],
  vertices: [],
  edges: [],
  settlements: [],
  roads: [],
  currentPlayerIndex: 0,
  currentTurn: 1,
  maxTurns: 20,
  phase: 'rolling',
  diceResult: null,
  difficulty: 'normal',
  gameLog: [],
  currentEvent: null,
  pendingEvent: null,
  winner: null,
  longestRoadPlayerId: null,

  setupPhase: null,

  buildMode: null,
  selectedVertexId: null,
  selectedEdgeId: null,
  highlightedTileIds: [],
  highlightedVertexIds: [],
  highlightedEdgeIds: [],

  showResourceGains: false,
  resourceGains: [],

  isPlayingAI: false,
  aiActionQueue: [],
  currentAIAction: null,

  handoffPlayerIndex: null,

  // =============================================
  // INIT GAME
  // =============================================
  initGame: (slots, difficulty) => {
    const tiles = generateMap();
    const { vertices, edges } = generateVerticesAndEdges(tiles);

    const players = slots.map((slot, i) => {
      const colorInfo = PLAYER_COLORS[slot.countryIndex % PLAYER_COLORS.length];
      return createPlayer(
        slot.name || colorInfo.countryName,
        slot.countryIndex,
        slot.type === 'ai',
        slot.type === 'human'
      );
    });

    const maxTurns = difficulty === 'easy' ? 15 : difficulty === 'normal' ? 20 : 25;

    const logs: GameLogEntry[] = [
      generateGameLog('🌍 World Quest Empire - 冒険の始まり！', 'system'),
      generateGameLog('まずは初期配置！各プレイヤーが拠点と道を配置します。', 'system'),
    ];

    set({
      screen: 'game',
      players,
      tiles,
      vertices,
      edges,
      settlements: [],
      roads: [],
      currentPlayerIndex: 0,
      currentTurn: 1,
      maxTurns,
      phase: 'setup',
      diceResult: null,
      difficulty,
      gameLog: logs,
      currentEvent: null,
      pendingEvent: null,
      winner: null,
      longestRoadPlayerId: null,
      setupPhase: {
        currentPlayerIndex: 0,
        round: 1,
        step: 'place_settlement',
        lastPlacedVertexId: null,
      },
      buildMode: null,
      selectedVertexId: null,
      selectedEdgeId: null,
      highlightedTileIds: [],
      highlightedVertexIds: [],
      highlightedEdgeIds: [],
      showResourceGains: false,
      resourceGains: [],
      isPlayingAI: false,
      aiActionQueue: [],
      currentAIAction: null,
      handoffPlayerIndex: null,
    });

    // Auto-process AI setup if first player is AI
    setTimeout(() => {
      const state = get();
      if (state.setupPhase && state.players[state.setupPhase.currentPlayerIndex]?.isAI) {
        get().setupPlaceSettlement('__auto_ai__');
      }
    }, 500);
  },

  // =============================================
  // SETUP PHASE: Place Settlement
  // =============================================
  setupPlaceSettlement: (vertexId) => {
    const state = get();
    if (!state.setupPhase || state.phase !== 'setup') return;

    const player = state.players[state.setupPhase.currentPlayerIndex];
    const isAI = player.isAI;

    let chosenVertexId = vertexId;

    if (isAI || vertexId === '__auto_ai__') {
      // AI auto-picks
      chosenVertexId = aiChooseSetupVertex(
        player.id, state.tiles, state.vertices, state.settlements, state.roads
      ) || '';
      if (!chosenVertexId) return;
    }

    // Validate
    if (!canBuildSettlement(chosenVertexId, player.id, state.vertices, state.settlements, state.roads, true)) {
      return;
    }

    const newSettlements = [...state.settlements, { vertexId: chosenVertexId, playerId: player.id, level: 'settlement' as const }];
    const newPlayers = state.players.map(p =>
      p.id === player.id ? { ...p, victoryPoints: p.victoryPoints + VP_VALUES.settlement } : p
    );

    // In round 2, give initial resources from adjacent tiles
    const vertex = state.vertices.find(v => v.id === chosenVertexId);
    const logs: GameLogEntry[] = [
      generateGameLog(`${player.flagEmoji} ${player.name}が拠点を配置した！`, 'build', player.id),
    ];

    if (state.setupPhase.round === 2 && vertex) {
      vertex.adjacentTileIds.forEach(tileId => {
        const tile = state.tiles.find(t => t.id === tileId);
        if (tile && tile.type !== 'sea' && tile.type !== 'desert') {
          const res = tile.type as ResourceType;
          const p = newPlayers.find(pp => pp.id === player.id);
          if (p) p.resources[res]++;
        }
      });
      logs.push(generateGameLog(`${player.name}が初期資源を獲得！`, 'resource', player.id));
    }

    set({
      settlements: newSettlements,
      players: newPlayers,
      setupPhase: {
        ...state.setupPhase,
        step: 'place_road',
        lastPlacedVertexId: chosenVertexId,
      },
      gameLog: [...state.gameLog, ...logs],
      highlightedVertexIds: [],
    });

    // If AI, auto-place road after a delay
    if (isAI) {
      setTimeout(() => get().setupPlaceRoad('__auto_ai__'), 600);
    }
  },

  // =============================================
  // SETUP PHASE: Place Road
  // =============================================
  setupPlaceRoad: (edgeId) => {
    const state = get();
    if (!state.setupPhase || state.phase !== 'setup') return;

    const player = state.players[state.setupPhase.currentPlayerIndex];
    const isAI = player.isAI;
    const lastVertexId = state.setupPhase.lastPlacedVertexId;

    let chosenEdgeId = edgeId;

    if (isAI || edgeId === '__auto_ai__') {
      chosenEdgeId = aiChooseSetupRoad(
        player.id, state.edges, state.vertices, state.settlements, state.roads, lastVertexId || ''
      ) || '';
      if (!chosenEdgeId) return;
    }

    // Validate
    if (!canBuildRoad(chosenEdgeId, player.id, state.edges, state.vertices, state.settlements, state.roads, true, lastVertexId)) {
      return;
    }

    const newRoads = [...state.roads, { edgeId: chosenEdgeId, playerId: player.id }];
    const logs: GameLogEntry[] = [
      generateGameLog(`${player.flagEmoji} ${player.name}が道を配置した！`, 'road', player.id),
    ];

    // Advance to next player/round
    const { currentPlayerIndex, round } = state.setupPhase;
    const numPlayers = state.players.length;

    let nextPlayerIndex: number;
    let nextRound = round;
    let setupDone = false;

    if (round === 1) {
      // Forward order: 0, 1, 2, ... n-1
      nextPlayerIndex = currentPlayerIndex + 1;
      if (nextPlayerIndex >= numPlayers) {
        // Start round 2 in reverse order
        nextRound = 2;
        nextPlayerIndex = numPlayers - 1;
      }
    } else {
      // Reverse order: n-1, n-2, ... 0
      nextPlayerIndex = currentPlayerIndex - 1;
      if (nextPlayerIndex < 0) {
        setupDone = true;
        nextPlayerIndex = 0;
      }
    }

    if (setupDone) {
      // Setup complete! Start the game
      logs.push(generateGameLog('🎲 初期配置完了！ゲーム開始！', 'system'));
      logs.push(generateGameLog(`${state.players[0].name}のターン！サイコロを振ろう！`, 'system'));

      const firstPlayer = state.players[0];
      const needHandoff = !firstPlayer.isAI && state.players.some(p => p.isHuman && p.id !== firstPlayer.id);

      set({
        roads: newRoads,
        setupPhase: null,
        phase: needHandoff ? 'handoff' : 'rolling',
        handoffPlayerIndex: needHandoff ? 0 : null,
        currentPlayerIndex: 0,
        gameLog: [...state.gameLog, ...logs],
        highlightedEdgeIds: [],
      });
    } else {
      const nextPlayer = state.players[nextPlayerIndex];
      logs.push(generateGameLog(`${nextPlayer.name}の番！拠点を配置しよう。`, 'system'));

      set({
        roads: newRoads,
        setupPhase: {
          currentPlayerIndex: nextPlayerIndex,
          round: nextRound,
          step: 'place_settlement',
          lastPlacedVertexId: null,
        },
        gameLog: [...state.gameLog, ...logs],
        highlightedEdgeIds: [],
      });

      // If next player is AI, auto-place
      if (nextPlayer.isAI) {
        setTimeout(() => get().setupPlaceSettlement('__auto_ai__'), 800);
      }
    }
  },

  // =============================================
  // ROLL DICE
  // =============================================
  doRollDice: () => {
    const state = get();
    if (state.phase !== 'rolling') return;

    const dice = rollDice();
    const total = dice[0] + dice[1];
    const currentPlayer = state.players[state.currentPlayerIndex];

    const logs: GameLogEntry[] = [
      generateGameLog(`${currentPlayer.name}がサイコロを振った！ 🎲 ${dice[0]} + ${dice[1]} = ${total}`, 'info', currentPlayer.id),
    ];

    // Distribute resources
    const gains = distributeResourcesWithVertices(
      state.tiles, state.vertices, state.settlements, state.players, total
    );

    const newPlayers = state.players.map(p => ({ ...p, resources: { ...p.resources } }));
    const resourceGainPopups: ResourceGainPopup[] = [];

    gains.forEach(g => {
      const player = newPlayers.find(p => p.id === g.playerId);
      if (!player) return;
      player.resources[g.resource] += g.amount;
      const resName = g.resource === 'rubber' ? 'ゴム' : g.resource === 'oil' ? '石油' : g.resource === 'gold' ? '金' : '食料';
      logs.push(generateGameLog(`${player.name}が${resName}を${g.amount}つゲット！`, 'resource', player.id));
      resourceGainPopups.push({
        playerId: player.id,
        playerName: player.name,
        playerFlag: player.flagEmoji,
        playerColor: player.color,
        resource: g.resource,
        amount: g.amount,
      });
    });

    if (gains.length === 0) {
      logs.push(generateGameLog(`出目${total}では誰も資源をもらえなかった。`, 'info'));
    }

    // Highlight matching tiles
    const matchingTileIds = state.tiles
      .filter(t => t.diceNumber === total && t.type !== 'sea' && t.type !== 'desert')
      .map(t => t.id);

    // Check for event
    const event = getRandomEvent(state.difficulty);

    set({
      diceResult: dice,
      phase: event ? 'action' : 'action',
      players: newPlayers,
      gameLog: [...state.gameLog, ...logs],
      highlightedTileIds: matchingTileIds,
      showResourceGains: true,
      resourceGains: resourceGainPopups,
      pendingEvent: event || null,
    });
  },

  // =============================================
  // DISMISS RESOURCE GAINS
  // =============================================
  dismissResourceGains: () => {
    const state = get();
    const pendingEvent = state.pendingEvent;

    if (pendingEvent) {
      set({
        showResourceGains: false,
        highlightedTileIds: [],
        phase: 'event',
        currentEvent: pendingEvent,
        pendingEvent: null,
      });
    } else {
      set({
        showResourceGains: false,
        highlightedTileIds: [],
      });
    }
  },

  // =============================================
  // BUILD MODE
  // =============================================
  startBuild: (type) => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];

    if (type === 'settlement') {
      const validVertices = getValidSettlementVertices(
        player.id, state.vertices, state.settlements, state.roads, false
      );
      set({
        buildMode: 'settlement',
        highlightedVertexIds: validVertices,
        highlightedEdgeIds: [],
        selectedVertexId: null,
        selectedEdgeId: null,
      });
    } else if (type === 'road') {
      const validEdges = getValidRoadEdges(
        player.id, state.edges, state.vertices, state.settlements, state.roads, false
      );
      set({
        buildMode: 'road',
        highlightedEdgeIds: validEdges,
        highlightedVertexIds: [],
        selectedVertexId: null,
        selectedEdgeId: null,
      });
    } else if (type === 'city') {
      const upgradeableVertices = getUpgradeableVertices(player.id, state.settlements);
      set({
        buildMode: 'city',
        highlightedVertexIds: upgradeableVertices,
        highlightedEdgeIds: [],
        selectedVertexId: null,
        selectedEdgeId: null,
      });
    }
  },

  cancelBuild: () => {
    set({
      buildMode: null,
      selectedVertexId: null,
      selectedEdgeId: null,
      highlightedVertexIds: [],
      highlightedEdgeIds: [],
    });
  },

  selectVertex: (vertexId) => {
    const state = get();
    if (!state.buildMode) return;
    if (state.highlightedVertexIds.includes(vertexId)) {
      set({ selectedVertexId: vertexId });
    }
  },

  selectEdge: (edgeId) => {
    const state = get();
    if (!state.buildMode) return;
    if (state.highlightedEdgeIds.includes(edgeId)) {
      set({ selectedEdgeId: edgeId });
    }
  },

  confirmBuild: () => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];

    if (state.buildMode === 'settlement' && state.selectedVertexId) {
      if (!canAfford(player, BUILD_COSTS.settlement)) return;

      const newPlayers = state.players.map(p =>
        p.id === player.id
          ? { ...p, resources: { ...p.resources }, victoryPoints: p.victoryPoints + VP_VALUES.settlement }
          : { ...p }
      );
      const updatedPlayer = newPlayers.find(p => p.id === player.id)!;
      payCost(updatedPlayer, BUILD_COSTS.settlement);

      const newSettlements = [...state.settlements, {
        vertexId: state.selectedVertexId,
        playerId: player.id,
        level: 'settlement' as const,
      }];

      const logs = [generateGameLog(`${player.flagEmoji} ${player.name}が拠点を建設した！`, 'build', player.id)];

      // Check longest road
      let longestPlayerId = state.longestRoadPlayerId;
      let longestChanged = false;
      {
        let maxLen = 4; // minimum 5 roads to get bonus
        let newLongest: string | null = state.longestRoadPlayerId;
        newPlayers.forEach(p => {
          const len = calculateLongestRoad(p.id, state.roads, state.edges, state.vertices, newSettlements);
          if (len > maxLen) { maxLen = len; newLongest = p.id; }
        });
        if (newLongest !== state.longestRoadPlayerId) {
          longestChanged = true;
          longestPlayerId = newLongest;
          if (state.longestRoadPlayerId) {
            const oldHolder = newPlayers.find(p => p.id === state.longestRoadPlayerId);
            if (oldHolder) oldHolder.victoryPoints -= VP_VALUES.longestRoad;
          }
          if (longestPlayerId) {
            const newHolder = newPlayers.find(p => p.id === longestPlayerId);
            if (newHolder) {
              newHolder.victoryPoints += VP_VALUES.longestRoad;
              logs.push(generateGameLog(`${newHolder.name}が最長の道ボーナス（+2点）を獲得！`, 'build'));
            }
          }
        }
      }

      set({
        players: newPlayers,
        settlements: newSettlements,
        longestRoadPlayerId: longestPlayerId,
        buildMode: null,
        selectedVertexId: null,
        highlightedVertexIds: [],
        gameLog: [...state.gameLog, ...logs],
      });

      // Check win
      if (updatedPlayer.victoryPoints >= WINNING_SCORE[state.difficulty]) {
        set({ phase: 'finished', winner: updatedPlayer });
      }

    } else if (state.buildMode === 'road' && state.selectedEdgeId) {
      if (!canAfford(player, BUILD_COSTS.road)) return;

      const newPlayers = state.players.map(p =>
        p.id === player.id ? { ...p, resources: { ...p.resources } } : { ...p }
      );
      const updatedPlayer = newPlayers.find(p => p.id === player.id)!;
      payCost(updatedPlayer, BUILD_COSTS.road);

      const newRoads = [...state.roads, { edgeId: state.selectedEdgeId, playerId: player.id }];

      const logs = [generateGameLog(`${player.flagEmoji} ${player.name}が道を建設した！`, 'road', player.id)];

      // Check longest road
      let longestPlayerId2 = state.longestRoadPlayerId;
      {
        let maxLen = 4;
        let newLongest: string | null = state.longestRoadPlayerId;
        newPlayers.forEach(p => {
          const len = calculateLongestRoad(p.id, newRoads, state.edges, state.vertices, state.settlements);
          if (len > maxLen) { maxLen = len; newLongest = p.id; }
        });
        if (newLongest !== state.longestRoadPlayerId) {
          if (state.longestRoadPlayerId) {
            const oldHolder = newPlayers.find(p => p.id === state.longestRoadPlayerId);
            if (oldHolder) oldHolder.victoryPoints -= VP_VALUES.longestRoad;
          }
          if (newLongest) {
            const newHolder = newPlayers.find(p => p.id === newLongest);
            if (newHolder) {
              newHolder.victoryPoints += VP_VALUES.longestRoad;
              logs.push(generateGameLog(`${newHolder.name}が最長の道ボーナス（+2点）を獲得！`, 'build'));
            }
          }
          longestPlayerId2 = newLongest;
        }
      }

      set({
        players: newPlayers,
        roads: newRoads,
        longestRoadPlayerId: longestPlayerId2,
        buildMode: null,
        selectedEdgeId: null,
        highlightedEdgeIds: [],
        gameLog: [...state.gameLog, ...logs],
      });

    } else if (state.buildMode === 'city' && state.selectedVertexId) {
      if (!canAfford(player, BUILD_COSTS.city)) return;

      const newPlayers = state.players.map(p =>
        p.id === player.id
          ? { ...p, resources: { ...p.resources }, victoryPoints: p.victoryPoints + 1 }
          : { ...p }
      );
      const updatedPlayer = newPlayers.find(p => p.id === player.id)!;
      payCost(updatedPlayer, BUILD_COSTS.city);

      const newSettlements = state.settlements.map(s =>
        s.vertexId === state.selectedVertexId && s.playerId === player.id
          ? { ...s, level: 'city' as const }
          : s
      );

      const logs = [generateGameLog(`${player.flagEmoji} ${player.name}が都市にアップグレード！`, 'build', player.id)];

      set({
        players: newPlayers,
        settlements: newSettlements,
        buildMode: null,
        selectedVertexId: null,
        highlightedVertexIds: [],
        gameLog: [...state.gameLog, ...logs],
      });

      if (updatedPlayer.victoryPoints >= WINNING_SCORE[state.difficulty]) {
        set({ phase: 'finished', winner: updatedPlayer });
      }
    }
  },

  // =============================================
  // TRADE
  // =============================================
  doTrade: (give, receive) => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    if (player.resources[give] < 3) return;

    const newPlayers = state.players.map(p => {
      if (p.id !== player.id) return { ...p };
      return {
        ...p,
        resources: {
          ...p.resources,
          [give]: p.resources[give] - 3,
          [receive]: p.resources[receive] + 1,
        },
      };
    });

    set({
      players: newPlayers,
      gameLog: [...state.gameLog, generateGameLog(
        `${player.name}が${give === 'rubber' ? 'ゴム' : give === 'oil' ? '石油' : give === 'gold' ? '金' : '食料'}3つを${receive === 'rubber' ? 'ゴム' : receive === 'oil' ? '石油' : receive === 'gold' ? '金' : '食料'}1つに交換！`,
        'trade', player.id
      )],
    });
  },

  // =============================================
  // EVENT HANDLING
  // =============================================
  handleEvent: () => {
    const state = get();
    if (!state.currentEvent) return;

    const player = state.players[state.currentPlayerIndex];
    const newPlayers = state.players.map(p => ({ ...p, resources: { ...p.resources } }));
    const updatedPlayer = newPlayers.find(p => p.id === player.id)!;
    const newSettlements = [...state.settlements];

    // Apply event effects inline
    const event = state.currentEvent;
    let resultMsg = `${event.title}: ${event.description}`;
    if (event.effectType === 'lose_resource') {
      const resources: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
      const res = resources[Math.floor(Math.random() * resources.length)];
      const loss = Math.min(updatedPlayer.resources[res], event.effectValue);
      updatedPlayer.resources[res] -= loss;
      const resName = res === 'rubber' ? 'ゴム' : res === 'oil' ? '石油' : res === 'gold' ? '金' : '食料';
      resultMsg = `${event.title}: ${resName}を${loss}つ失った！`;
    } else if (event.effectType === 'gain_resource') {
      const resources: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
      const res = resources[Math.floor(Math.random() * resources.length)];
      updatedPlayer.resources[res] += event.effectValue;
      const resName = res === 'rubber' ? 'ゴム' : res === 'oil' ? '石油' : res === 'gold' ? '金' : '食料';
      resultMsg = `${event.title}: ${resName}を${event.effectValue}つ獲得！`;
    } else if (event.effectType === 'lose_all_resource') {
      const resources: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
      const res = resources[Math.floor(Math.random() * resources.length)];
      const loss = updatedPlayer.resources[res];
      updatedPlayer.resources[res] = 0;
      const resName = res === 'rubber' ? 'ゴム' : res === 'oil' ? '石油' : res === 'gold' ? '金' : '食料';
      resultMsg = `${event.title}: ${resName}を全て失った！(${loss}個)`;
    }

    set({
      players: newPlayers,
      settlements: newSettlements,
      currentEvent: null,
      phase: 'action',
      gameLog: [...state.gameLog, generateGameLog(resultMsg, 'event', player.id)],
    });
  },

  // =============================================
  // END TURN (handles AI turns and local multiplayer handoff)
  // =============================================
  doEndTurn: () => {
    const state = get();
    let idx = (state.currentPlayerIndex + 1) % state.players.length;
    let turn = state.currentTurn;

    if (idx === 0) {
      turn++;
      if (turn > state.maxTurns) {
        const winner = [...state.players].sort((a, b) => b.victoryPoints - a.victoryPoints)[0];
        set({
          phase: 'finished',
          winner,
          currentTurn: turn,
          gameLog: [...state.gameLog, generateGameLog(`${winner.name}の勝利！`, 'system')],
        });
        return;
      }
    }

    const nextPlayer = state.players[idx];

    // If next player is AI, process all consecutive AI turns
    if (nextPlayer.isAI) {
      const aiActions: AIAction[] = [];
      const logs: GameLogEntry[] = [];

      // Deep copy for simulation
      const simPlayers = state.players.map(p => ({
        ...p,
        resources: { ...p.resources },
      }));
      const simSettlements = state.settlements.map(s => ({ ...s }));
      const simRoads = state.roads.map(r => ({ ...r }));

      let gameEnded = false;
      let winnerPlayer: Player | null = null;

      while (simPlayers[idx].isAI) {
        const aiP = simPlayers[idx];

        aiActions.push({
          type: 'turn_start',
          playerId: aiP.id,
          playerName: aiP.countryName,
          playerFlag: aiP.flagEmoji,
          playerColor: aiP.color,
        });

        // AI rolls dice
        const dice = rollDice();
        const total = dice[0] + dice[1];

        // Calculate resource gains
        const gains = distributeResourcesWithVertices(
          state.tiles, state.vertices, simSettlements, simPlayers, total
        );

        const matchingTileIds = state.tiles
          .filter(t => t.diceNumber === total && t.type !== 'sea' && t.type !== 'desert')
          .map(t => t.id);

        // Apply gains to sim
        gains.forEach(g => {
          const p = simPlayers.find(pp => pp.id === g.playerId);
          if (p) p.resources[g.resource] += g.amount;
        });

        aiActions.push({
          type: 'dice_roll',
          playerId: aiP.id,
          playerName: aiP.countryName,
          playerFlag: aiP.flagEmoji,
          playerColor: aiP.color,
          dice,
          diceTotal: total,
          highlightTileIds: matchingTileIds,
        });

        logs.push(generateGameLog(`${aiP.name}がサイコロを振った！ 🎲 ${dice[0]} + ${dice[1]} = ${total}`, 'info', aiP.id));

        if (gains.length > 0) {
          gains.forEach(g => {
            const p = simPlayers.find(pp => pp.id === g.playerId);
            const resName = g.resource === 'rubber' ? 'ゴム' : g.resource === 'oil' ? '石油' : g.resource === 'gold' ? '金' : '食料';
            logs.push(generateGameLog(`${p?.name || ''}が${resName}を${g.amount}つゲット！`, 'resource', g.playerId));
            aiActions.push({
              type: 'resource_gain',
              playerId: g.playerId,
              playerName: p?.name || '',
              playerFlag: p?.flagEmoji || '',
              playerColor: p?.color || '',
              resource: g.resource,
              resourceAmount: g.amount,
            });
          });
        } else {
          aiActions.push({
            type: 'no_resource',
            playerId: aiP.id,
            playerName: aiP.countryName,
            playerFlag: aiP.flagEmoji,
            playerColor: aiP.color,
            diceTotal: total,
          });
        }

        // AI build actions
        const aiActs = aiTurn(aiP, state.tiles, state.vertices, state.edges, simSettlements, simRoads, state.difficulty);
        aiActs.forEach(a => {
          const actionMsg = a.type === 'build_road' ? `${aiP.flagEmoji} ${aiP.name}が道を建設！` : a.type === 'build_settlement' ? `${aiP.flagEmoji} ${aiP.name}が拠点を建設！` : a.type === 'upgrade_city' ? `${aiP.flagEmoji} ${aiP.name}が都市にアップグレード！` : a.type === 'trade' ? `${aiP.name}が交換した` : `${aiP.name}はパスした`;
          logs.push(generateGameLog(actionMsg, a.type === 'build_road' ? 'road' : 'build', aiP.id));
          aiActions.push({
            type: a.type === 'build_road' ? 'build_road' : a.type === 'build_settlement' ? 'build_settlement' : 'upgrade_city',
            playerId: aiP.id,
            playerName: aiP.countryName,
            playerFlag: aiP.flagEmoji,
            playerColor: aiP.color,
            edgeId: a.edgeId,
            vertexId: a.vertexId,
            buildType: a.type === 'build_road' ? '道' : a.type === 'build_settlement' ? '拠点' : '都市',
          });
        });

        aiActions.push({
          type: 'turn_end',
          playerId: aiP.id,
          playerName: aiP.countryName,
          playerFlag: aiP.flagEmoji,
          playerColor: aiP.color,
        });

        if (aiP.victoryPoints >= WINNING_SCORE[state.difficulty]) {
          gameEnded = true;
          winnerPlayer = aiP;
          break;
        }

        idx = (idx + 1) % simPlayers.length;
        if (idx === 0) {
          turn++;
          if (turn > state.maxTurns) {
            gameEnded = true;
            winnerPlayer = [...simPlayers].sort((a, b) => b.victoryPoints - a.victoryPoints)[0];
            break;
          }
        }

        if (!simPlayers[idx].isAI) break;
      }

      const humanIndex = idx;
      const humanTurn = turn;

      if (!gameEnded) {
        logs.push(generateGameLog(`${state.players[humanIndex].name}のターン！サイコロを振ろう！`, 'system'));
      }

      set({
        phase: 'ai_turn',
        isPlayingAI: true,
        aiActionQueue: aiActions,
        currentAIAction: null,
        currentPlayerIndex: humanIndex,
        currentTurn: humanTurn,
        diceResult: null,
        gameLog: [...state.gameLog, ...logs],
        selectedVertexId: null,
        selectedEdgeId: null,
        buildMode: null,
        highlightedTileIds: [],
        highlightedVertexIds: [],
        highlightedEdgeIds: [],
        showResourceGains: false,
        resourceGains: [],
        winner: gameEnded ? winnerPlayer : null,
        // Store final sim state for applying after animation
        _finalSimPlayers: simPlayers,
        _finalSimSettlements: simSettlements,
        _finalSimRoads: simRoads,
      } as any);

    } else {
      // Next player is human
      const logs = [generateGameLog(`${nextPlayer.name}のターン！`, 'system')];

      // Check if we need handoff screen (different human player)
      const currentPlayer = state.players[state.currentPlayerIndex];
      const needHandoff = nextPlayer.isHuman && currentPlayer.isHuman && nextPlayer.id !== currentPlayer.id;

      set({
        currentPlayerIndex: idx,
        currentTurn: turn,
        phase: needHandoff ? 'handoff' : 'rolling',
        handoffPlayerIndex: needHandoff ? idx : null,
        diceResult: null,
        gameLog: [...state.gameLog, ...logs],
        selectedVertexId: null,
        selectedEdgeId: null,
        buildMode: null,
        highlightedTileIds: [],
        highlightedVertexIds: [],
        highlightedEdgeIds: [],
        showResourceGains: false,
        resourceGains: [],
      });
    }
  },

  // =============================================
  // PLAY NEXT AI ACTION (animation step)
  // =============================================
  playNextAIAction: () => {
    const state = get();
    const queue = [...state.aiActionQueue];

    if (queue.length === 0) {
      // Apply final sim state
      const finalPlayers = (state as any)._finalSimPlayers as Player[] | undefined;
      const finalSettlements = (state as any)._finalSimSettlements as Settlement[] | undefined;
      const finalRoads = (state as any)._finalSimRoads as Road[] | undefined;

      const nextPlayer = state.players[state.currentPlayerIndex];
      const needHandoff = nextPlayer.isHuman && state.players.some(p => p.isHuman && p.id !== nextPlayer.id);

      if (state.winner) {
        set({
          isPlayingAI: false,
          currentAIAction: null,
          aiActionQueue: [],
          phase: 'finished',
          players: finalPlayers || state.players,
          settlements: finalSettlements || state.settlements,
          roads: finalRoads || state.roads,
        });
      } else {
        set({
          isPlayingAI: false,
          currentAIAction: null,
          aiActionQueue: [],
          phase: needHandoff ? 'handoff' : 'rolling',
          handoffPlayerIndex: needHandoff ? state.currentPlayerIndex : null,
          players: finalPlayers || state.players,
          settlements: finalSettlements || state.settlements,
          roads: finalRoads || state.roads,
        });
      }
      return;
    }

    const action = queue.shift()!;

    // For resource_gain, update the player's resources immediately for UI feedback
    if (action.type === 'resource_gain' && action.resource && action.resourceAmount) {
      const newPlayers = state.players.map(p => {
        if (p.id === action.playerId) {
          return {
            ...p,
            resources: {
              ...p.resources,
              [action.resource!]: p.resources[action.resource!] + action.resourceAmount!,
            },
          };
        }
        return { ...p };
      });

      set({
        currentAIAction: action,
        aiActionQueue: queue,
        players: newPlayers,
        resourceGains: [{
          playerId: action.playerId,
          playerName: action.playerName,
          playerFlag: action.playerFlag,
          playerColor: action.playerColor,
          resource: action.resource,
          amount: action.resourceAmount,
        }],
        highlightedTileIds: action.highlightTileIds || [],
      });
    } else if (action.type === 'dice_roll') {
      set({
        currentAIAction: action,
        aiActionQueue: queue,
        diceResult: action.dice || null,
        highlightedTileIds: action.highlightTileIds || [],
      });
    } else if (action.type === 'build_settlement' && action.vertexId) {
      // Show the settlement being built
      const newSettlements = [...state.settlements, {
        vertexId: action.vertexId,
        playerId: action.playerId,
        level: 'settlement' as const,
      }];
      set({
        currentAIAction: action,
        aiActionQueue: queue,
        settlements: newSettlements,
      });
    } else if (action.type === 'build_road' && action.edgeId) {
      const newRoads = [...state.roads, {
        edgeId: action.edgeId,
        playerId: action.playerId,
      }];
      set({
        currentAIAction: action,
        aiActionQueue: queue,
        roads: newRoads,
      });
    } else if (action.type === 'upgrade_city' && action.vertexId) {
      const newSettlements = state.settlements.map(s =>
        s.vertexId === action.vertexId && s.playerId === action.playerId
          ? { ...s, level: 'city' as const }
          : s
      );
      set({
        currentAIAction: action,
        aiActionQueue: queue,
        settlements: newSettlements,
      });
    } else {
      set({
        currentAIAction: action,
        aiActionQueue: queue,
        highlightedTileIds: action.highlightTileIds || [],
      });
    }
  },

  // =============================================
  // HANDOFF (local multiplayer)
  // =============================================
  confirmHandoff: () => {
    set({
      phase: 'rolling',
      handoffPlayerIndex: null,
    });
  },

  // =============================================
  // UTILITIES
  // =============================================
  getCurrentPlayer: () => {
    const state = get();
    return state.players[state.currentPlayerIndex];
  },

  addLog: (message, type, playerId) => {
    const state = get();
    set({ gameLog: [...state.gameLog, generateGameLog(message, type, playerId)] });
  },

  // Legacy compatibility
  selectTile: (tileId: number) => {},
}));
