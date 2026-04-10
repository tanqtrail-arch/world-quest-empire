// ===== Game Store (Zustand) - Catan-style vertex/edge system =====
import { create } from 'zustand';
import {
  type Player, type GameTile, type Vertex, type Edge,
  type Settlement, type Road, type Port, type Resources, type ResourceType,
  type EventCard, type GameLogEntry, type Difficulty, type GamePhase,
  type SetupStep, type PlayerSlot, type QuizQuestion, type QuizDifficulty,
  BUILD_COSTS, VP_VALUES, WINNING_SCORE, PLAYER_COLORS, RESOURCE_INFO,
  TRADE_RATE_DEFAULT, QUIZ_QUESTIONS, QUIZ_TIMER_SECONDS, TURN_TIMER_SECONDS,
} from './gameTypes';
import {
  generateMap, generateVerticesAndEdges, getMapRows, createPlayer, rollDice,
  distributeResourcesWithVertices, canAfford, payCost,
  canBuildSettlement, canBuildRoad, getValidSettlementVertices,
  getValidRoadEdges, getUpgradeableVertices, calculateLongestRoad,
  getRandomEvent, generateGameLog, genId,
  aiChooseSetupVertex, aiChooseSetupRoad, aiTurn,
  generatePorts, getTradeRate,
  type AITurnAction,
} from './gameLogic';

// --- AI Action Types ---
export interface AIAction {
  type: 'turn_start' | 'dice_roll' | 'resource_gain' | 'dice_gains' | 'lucky_seven' | 'no_resource' | 'build_road' | 'build_settlement' | 'upgrade_city' | 'event' | 'turn_end';
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
  costText?: string;
  gainsSummary?: string;
  tradeFrom?: ResourceType;
  tradeTo?: ResourceType;
  diceGains?: { playerId: string; resource: ResourceType; amount: number }[];
  eventTitle?: string;
  eventIcon?: string;
  eventCategory?: 'positive' | 'negative';
  eventDetail?: string;
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
  screen: 'title' | 'create' | 'game' | 'result' | 'ranking' | 'quiz_practice';
  setScreen: (screen: GameStore['screen']) => void;

  // Game state
  players: Player[];
  tiles: GameTile[];
  vertices: Vertex[];
  edges: Edge[];
  settlements: Settlement[];
  roads: Road[];
  ports: Port[];
  mapRows: number[];
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
  diceAnimationStep: 0 | 1 | 2 | 3 | 4; // 0=none, 1=dice shown, 2=tile highlight, 3=flag bounce, 4=resource summary

  // AI turn
  isPlayingAI: boolean;
  aiActionQueue: AIAction[];
  currentAIAction: AIAction | null;

  // Resource pick mode (for gain_resources event)
  resourcePickMode: { remaining: number; eventTitle: string } | null;

  // Event effect preview (pre-computed for display before OK click)
  eventEffectPreview: {
    description: string;
    resourceChanges: { resource: ResourceType; before: number; after: number }[];
    vpBefore?: number;
    vpAfter?: number;
    preRolledResource?: ResourceType; // pre-determined random resource for lose_resources
    isChoice?: boolean; // player picks resources
    freeRoadBuilt?: boolean;
  } | null;

  // Handoff (local multiplayer)
  handoffPlayerIndex: number | null;

  // Quiz system
  quizDifficulty: QuizDifficulty;
  currentQuiz: QuizQuestion | null;
  quizResult: 'correct' | 'incorrect' | 'timeout' | null;
  quizResourcePickRemaining: number; // 正解時の資源選択残り数

  // Turn timer
  timerEnabled: boolean;
  turnTimeRemaining: number;
  turnTimerActive: boolean;
  turnTimerPausedForQuiz: boolean;

  // Gold dice (7確定)
  usedGoldDice: boolean;

  // Actions
  initGame: (slots: PlayerSlot[], difficulty: Difficulty, quizDifficulty?: QuizDifficulty, timerEnabled?: boolean) => void;
  doRollDice: () => void;
  doForceSevenDice: () => void;
  dismissResourceGains: () => void;
  startBuild: (type: 'settlement' | 'city' | 'road') => void;
  cancelBuild: () => void;
  selectVertex: (vertexId: string) => void;
  selectEdge: (edgeId: string) => void;
  confirmBuild: () => void;
  doTrade: (give: ResourceType, receive: ResourceType) => void;
  handleEvent: () => void;
  pickResource: (resource: ResourceType) => void;
  handleQuizAnswer: (selectedIndex: number) => void;
  handleQuizTimeout: () => void;
  pickQuizReward: (resource: ResourceType) => void;
  dismissQuiz: () => void;
  tickTurnTimer: () => void;
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
  ports: [],
  mapRows: [3, 4, 5, 4, 3],
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
  resourcePickMode: null,
  eventEffectPreview: null,

  buildMode: null,
  selectedVertexId: null,
  selectedEdgeId: null,
  highlightedTileIds: [],
  highlightedVertexIds: [],
  highlightedEdgeIds: [],

  showResourceGains: false,
  resourceGains: [],
  diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,

  isPlayingAI: false,
  aiActionQueue: [],
  currentAIAction: null,

  handoffPlayerIndex: null,

  quizDifficulty: 'elementary_high' as QuizDifficulty,
  currentQuiz: null,
  quizResult: null,
  quizResourcePickRemaining: 0,

  timerEnabled: true,
  turnTimeRemaining: TURN_TIMER_SECONDS,
  turnTimerActive: false,
  turnTimerPausedForQuiz: false,

  usedGoldDice: false,

  // =============================================
  // INIT GAME
  // =============================================
  initGame: (slots, difficulty, quizDifficulty = 'elementary_high' as QuizDifficulty, timerEnabled = true) => {
    const mapRows = getMapRows(slots.length);
    const tiles = generateMap(slots.length);
    const { vertices, edges } = generateVerticesAndEdges(tiles, mapRows);
    const ports = generatePorts(vertices, tiles);

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
      ports,
      mapRows,
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
      resourcePickMode: null,
      eventEffectPreview: null,
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
      diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
      isPlayingAI: false,
      aiActionQueue: [],
      currentAIAction: null,
      handoffPlayerIndex: null,
      quizDifficulty,
      currentQuiz: null,
      quizResult: null,
      quizResourcePickRemaining: 0,
      timerEnabled,
      turnTimeRemaining: TURN_TIMER_SECONDS,
      turnTimerActive: false,
      turnTimerPausedForQuiz: false,
      usedGoldDice: false,
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
        player.id, state.tiles, state.vertices, state.settlements, state.roads, state.difficulty
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
        turnTimeRemaining: TURN_TIMER_SECONDS,
        turnTimerActive: !needHandoff,
        turnTimerPausedForQuiz: false,
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
    const newPlayers = state.players.map(p => ({ ...p, resources: { ...p.resources } }));
    const resourceGainPopups: ResourceGainPopup[] = [];

    if (total === 7) {
      const player = newPlayers.find(p => p.id === currentPlayer.id)!;
      const allRes: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
      allRes.forEach(res => { player.resources[res] += 1; });
      logs.push(generateGameLog(`🎲7！${player.name}が全資源+1！`, 'resource', player.id));
      resourceGainPopups.push({
        playerId: player.id,
        playerName: player.name,
        playerFlag: player.flagEmoji,
        playerColor: player.color,
        resource: 'rubber',
        amount: 1,
      });
    } else {
      const gains = distributeResourcesWithVertices(
        state.tiles, state.vertices, state.settlements, state.players, total
      );

      gains.forEach(g => {
        const player = newPlayers.find(p => p.id === g.playerId);
        if (!player) return;
        player.resources[g.resource] += g.amount;
        const resName = RESOURCE_INFO[g.resource].icon + RESOURCE_INFO[g.resource].name;
        logs.push(generateGameLog(`${player.name}が${resName}+${g.amount}`, 'resource', player.id));
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
    }

    // Highlight matching tiles
    const matchingTileIds = state.tiles
      .filter(t => t.diceNumber === total && t.type !== 'sea' && t.type !== 'desert')
      .map(t => t.id);

    // --- Staged animation sequence ---
    // Step 1: Dice result shown (DiceRoller already shows it)
    // IMPORTANT: clear highlightedTileIds first to avoid stale highlights
    set({
      diceResult: dice,
      phase: 'action',
      gameLog: [...state.gameLog, ...logs],
      pendingEvent: null,
      diceAnimationStep: 1 as 0 | 1 | 2 | 3 | 4,
      highlightedTileIds: [],
      showResourceGains: false,
      resourceGains: resourceGainPopups,
      players: newPlayers,
    });

    if (total === 7) {
      // Lucky 7: skip tile highlight/flag steps, go straight to resource summary
      // After dismissing resource gains, quiz will be triggered
      setTimeout(() => {
        set({ diceAnimationStep: 4 as 0 | 1 | 2 | 3 | 4, showResourceGains: true });
      }, 500);
    } else {
      // Step 2: Tile highlight (after 500ms)
      setTimeout(() => {
        set({ diceAnimationStep: 2 as 0 | 1 | 2 | 3 | 4, highlightedTileIds: matchingTileIds });
      }, 500);

      // Step 3: Flag bounce on settlements (after 1000ms)
      setTimeout(() => {
        set({ diceAnimationStep: 3 as 0 | 1 | 2 | 3 | 4 });
      }, 1000);

      // Step 4: Resource summary screen (after 1500ms)
      setTimeout(() => {
        set({ diceAnimationStep: 4 as 0 | 1 | 2 | 3 | 4, showResourceGains: true });
      }, 1500);
    }
  },

  // =============================================
  // FORCE SEVEN DICE (金4枚消費で7確定)
  // =============================================
  doForceSevenDice: () => {
    const state = get();
    if (state.phase !== 'rolling') return;
    if (state.usedGoldDice) return;
    const player = state.players[state.currentPlayerIndex];
    if (player.resources.gold < 4) return;

    // 金4枚消費
    const newPlayers = state.players.map(p => {
      if (p.id !== player.id) return p;
      return { ...p, resources: { ...p.resources, gold: p.resources.gold - 4 } };
    });

    set({ players: newPlayers, usedGoldDice: true });

    // 7確定でdoRollDiceと同等処理を実行
    const dice: [number, number] = [3, 4];
    const total = 7;
    const currentPlayer = newPlayers[state.currentPlayerIndex];

    const logs: GameLogEntry[] = [
      generateGameLog(`💰 ${currentPlayer.name}が金4枚を使って7を確定！ 🎲 3 + 4 = 7`, 'trade', currentPlayer.id),
    ];

    const updatedPlayers = newPlayers.map(p => ({ ...p, resources: { ...p.resources } }));
    const rollingPlayer = updatedPlayers.find(p => p.id === currentPlayer.id)!;
    const allRes: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
    allRes.forEach(res => { rollingPlayer.resources[res] += 1; });
    logs.push(generateGameLog(`🎲7！${currentPlayer.name}が全資源+1！`, 'resource', currentPlayer.id));

    const resourceGainPopups: ResourceGainPopup[] = [{
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      playerFlag: currentPlayer.flagEmoji,
      playerColor: currentPlayer.color,
      resource: 'rubber',
      amount: 1,
    }];

    set({
      diceResult: dice,
      phase: 'action',
      gameLog: [...state.gameLog, ...logs],
      pendingEvent: null,
      diceAnimationStep: 1 as 0 | 1 | 2 | 3 | 4,
      highlightedTileIds: [],
      showResourceGains: false,
      resourceGains: resourceGainPopups,
      players: updatedPlayers,
    });

    setTimeout(() => {
      set({ diceAnimationStep: 4 as 0 | 1 | 2 | 3 | 4, showResourceGains: true });
    }, 500);
  },

  // =============================================
  // DISMISS RESOURCE GAINS
  // =============================================
  dismissResourceGains: () => {
    const state = get();
    const diceTotal = state.diceResult ? state.diceResult[0] + state.diceResult[1] : 0;
    console.log('[dismissResourceGains] diceTotal=', diceTotal, 'quizDifficulty=', state.quizDifficulty);

    if (diceTotal === 7) {
      // 7が出た → クイズ出題
      const quizPool = QUIZ_QUESTIONS.filter(q => q.difficulty === state.quizDifficulty);
      console.log('[dismissResourceGains] quizPool size=', quizPool.length);
      if (quizPool.length === 0) {
        console.error('[dismissResourceGains] NO QUIZ QUESTIONS for difficulty:', state.quizDifficulty);
        set({ showResourceGains: false, highlightedTileIds: [], diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4 });
        return;
      }
      const quiz = quizPool[Math.floor(Math.random() * quizPool.length)];
      console.log('[dismissResourceGains] selected quiz:', quiz.id, quiz.question);

      set({
        showResourceGains: false,
        highlightedTileIds: [],
        diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
        phase: 'quiz',
        currentQuiz: quiz,
        quizResult: null,
        quizResourcePickRemaining: 0,
        turnTimerPausedForQuiz: true,
      });
      console.log('[dismissResourceGains] phase set to quiz, currentQuiz set');
    } else {
      set({
        showResourceGains: false,
        highlightedTileIds: [],
        diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
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
        player.id, state.vertices, state.settlements, state.roads, false, state.difficulty
      );
      const playerRoads = state.roads.filter(r => r.playerId === player.id);
      console.log(`[startBuild] settlement: ${validVertices.length} valid, roads=${playerRoads.length}, difficulty=${state.difficulty}`);
      set({
        buildMode: 'settlement',
        highlightedVertexIds: validVertices,
        highlightedEdgeIds: [],
        highlightedTileIds: [],
        diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
        selectedVertexId: null,
        selectedEdgeId: null,
      });
    } else if (type === 'road') {
      const validEdges = getValidRoadEdges(
        player.id, state.edges, state.vertices, state.settlements, state.roads, false
      );
      console.log(`[startBuild] road: ${validEdges.length} valid edges, resources:`, player.resources);
      set({
        buildMode: 'road',
        highlightedEdgeIds: validEdges,
        highlightedVertexIds: [],
        highlightedTileIds: [],
        diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
        selectedVertexId: null,
        selectedEdgeId: null,
      });
    } else if (type === 'city') {
      const upgradeableVertices = getUpgradeableVertices(player.id, state.settlements);
      console.log(`[startBuild] city: ${upgradeableVertices.length} upgradeable, resources:`, player.resources);
      set({
        buildMode: 'city',
        highlightedVertexIds: upgradeableVertices,
        highlightedEdgeIds: [],
        highlightedTileIds: [],
        diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
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
      highlightedTileIds: [],
      diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
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
        highlightedTileIds: [],
        diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
        gameLog: [...state.gameLog, ...logs],
      });

      // Check win (settlement or longest road may push over threshold)
      const winnerAfterBuild = newPlayers.find(p => p.victoryPoints >= WINNING_SCORE[state.difficulty]);
      if (winnerAfterBuild) {
        set({ phase: 'finished', winner: winnerAfterBuild, screen: 'result' });
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
        highlightedTileIds: [],
        diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
        gameLog: [...state.gameLog, ...logs],
      });

      // Check win (longest road bonus may push over threshold)
      const winnerAfterRoad = newPlayers.find(p => p.victoryPoints >= WINNING_SCORE[state.difficulty]);
      if (winnerAfterRoad) {
        set({ phase: 'finished', winner: winnerAfterRoad, screen: 'result' });
      }

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
        highlightedTileIds: [],
        diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
        gameLog: [...state.gameLog, ...logs],
      });

      const winnerAfterCity = newPlayers.find(p => p.victoryPoints >= WINNING_SCORE[state.difficulty]);
      if (winnerAfterCity) {
        set({ phase: 'finished', winner: winnerAfterCity, screen: 'result' });
      }
    }
  },

  // =============================================
  // TRADE
  // =============================================
  doTrade: (give, receive) => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    const rate = getTradeRate(player.id, give, state.settlements, state.ports);
    if (player.resources[give] < rate) return;

    const newPlayers = state.players.map(p => {
      if (p.id !== player.id) return { ...p };
      return {
        ...p,
        resources: {
          ...p.resources,
          [give]: p.resources[give] - rate,
          [receive]: p.resources[receive] + 1,
        },
      };
    });

    const giveName = give === 'rubber' ? 'ゴム' : give === 'oil' ? '石油' : give === 'gold' ? '金' : '食料';
    const receiveName = receive === 'rubber' ? 'ゴム' : receive === 'oil' ? '石油' : receive === 'gold' ? '金' : '食料';

    set({
      players: newPlayers,
      gameLog: [...state.gameLog, generateGameLog(
        `${player.name}が${giveName}${rate}つを${receiveName}1つに交換！`,
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
    const newRoads = [...state.roads];
    const preview = state.eventEffectPreview;

    // Apply event effects
    const event = state.currentEvent;
    const resources: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
    let resultMsg = '';
    let skipAction = false;

    if (event.effectType === 'lose_resources') {
      // Use pre-rolled resource from preview
      const res = preview?.preRolledResource || resources[Math.floor(Math.random() * resources.length)];
      const loss = Math.min(updatedPlayer.resources[res], event.effectValue);
      updatedPlayer.resources[res] -= loss;
      resultMsg = `${event.icon}${event.title}→${RESOURCE_INFO[res].icon}${RESOURCE_INFO[res].name}${loss}つ失った`;

    } else if (event.effectType === 'lose_food') {
      const loss = Math.min(updatedPlayer.resources.food, event.effectValue);
      updatedPlayer.resources.food -= loss;
      resultMsg = `${event.icon}${event.title}→🌾食料${loss}つ失った`;

    } else if (event.effectType === 'lose_structure') {
      const mySettlements = newSettlements.filter(s => s.playerId === player.id && s.level === 'settlement');
      if (mySettlements.length > 0) {
        const target = mySettlements[Math.floor(Math.random() * mySettlements.length)];
        const idx = newSettlements.findIndex(s => s.vertexId === target.vertexId && s.playerId === player.id);
        if (idx !== -1) newSettlements.splice(idx, 1);
        updatedPlayer.victoryPoints = Math.max(0, updatedPlayer.victoryPoints - 1);
        resultMsg = `${event.icon}${event.title}→🏠拠点1つ失った（★${player.victoryPoints}→${updatedPlayer.victoryPoints}）`;
      } else {
        resultMsg = `${event.icon}${event.title}→失う拠点がなかった`;
      }

    } else if (event.effectType === 'skip_turn') {
      skipAction = true;
      resultMsg = `${event.icon}${event.title}→このターン行動できない！`;

    } else if (event.effectType === 'gain_resources') {
      set({
        currentEvent: null,
        eventEffectPreview: null,
        phase: 'action',
        highlightedTileIds: [],
        diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
        resourcePickMode: { remaining: event.effectValue, eventTitle: event.title },
        gameLog: [...state.gameLog, generateGameLog(`${event.icon}${event.title}→好きな資源を${event.effectValue}つ選ぼう！`, 'event', player.id)],
      });
      return;

    } else if (event.effectType === 'gain_all') {
      resources.forEach(res => { updatedPlayer.resources[res] += event.effectValue; });
      resultMsg = `${event.icon}${event.title}→🌿+1 🛢️+1 💰+1 🌾+1 全部もらった！`;

    } else if (event.effectType === 'discount_build') {
      set({
        currentEvent: null,
        eventEffectPreview: null,
        phase: 'action',
        highlightedTileIds: [],
        diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
        resourcePickMode: { remaining: 2, eventTitle: event.title },
        gameLog: [...state.gameLog, generateGameLog(`${event.icon}${event.title}→好きな資源を2つ選ぼう！`, 'event', player.id)],
      });
      return;

    } else if (event.effectType === 'free_road') {
      const validEdges = getValidRoadEdges(player.id, state.edges, state.vertices, newSettlements, state.roads, false);
      if (validEdges.length > 0) {
        const edgeId = validEdges[Math.floor(Math.random() * validEdges.length)];
        newRoads.push({ edgeId, playerId: player.id });
        resultMsg = `${event.icon}${event.title}→🛤️道を1つ無料で建設！`;
      } else {
        resultMsg = `${event.icon}${event.title}→建設できる場所がなかった`;
      }
    } else {
      resultMsg = `${event.icon}${event.title}→${event.description}`;
    }

    set({
      players: newPlayers,
      settlements: newSettlements,
      roads: newRoads,
      currentEvent: null,
      eventEffectPreview: null,
      phase: 'action',
      highlightedTileIds: [],
      diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
      gameLog: [...state.gameLog, generateGameLog(resultMsg, 'event', player.id)],
    });

    if (skipAction) {
      get().doEndTurn();
    }
  },

  // =============================================
  // RESOURCE PICK (for gain_resources / discount_build events)
  // =============================================
  pickResource: (resource: ResourceType) => {
    const state = get();
    if (!state.resourcePickMode) return;

    const player = state.players[state.currentPlayerIndex];
    const newPlayers = state.players.map(p => {
      if (p.id !== player.id) return p;
      return { ...p, resources: { ...p.resources, [resource]: p.resources[resource] + 1 } };
    });

    const remaining = state.resourcePickMode.remaining - 1;
    const resName = RESOURCE_INFO[resource].icon + RESOURCE_INFO[resource].name;

    if (remaining <= 0) {
      // Done picking
      set({
        players: newPlayers,
        resourcePickMode: null,
        gameLog: [...state.gameLog, generateGameLog(`${player.name}が${resName}を獲得！`, 'resource', player.id)],
      });
    } else {
      set({
        players: newPlayers,
        resourcePickMode: { ...state.resourcePickMode, remaining },
        gameLog: [...state.gameLog, generateGameLog(`${player.name}が${resName}を獲得！（あと${remaining}つ）`, 'resource', player.id)],
      });
    }
  },

  // =============================================
  // QUIZ SYSTEM
  // =============================================
  handleQuizAnswer: (selectedIndex: number) => {
    const state = get();
    if (!state.currentQuiz || state.quizResult) return;

    const isCorrect = selectedIndex === state.currentQuiz.correctIndex;
    const player = state.players[state.currentPlayerIndex];

    if (isCorrect) {
      set({
        quizResult: 'correct',
        quizResourcePickRemaining: 2,
        gameLog: [...state.gameLog, generateGameLog(`🎉 ${player.name}がクイズに正解！好きな資源を2つ獲得！`, 'event', player.id)],
      });
    } else {
      // 不正解: ランダム資源2つ失う
      const allRes: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
      const newPlayers = state.players.map(p => {
        if (p.id !== player.id) return p;
        const newRes = { ...p.resources };
        for (let i = 0; i < 2; i++) {
          const available = allRes.filter(r => newRes[r] > 0);
          if (available.length === 0) break;
          const r = available[Math.floor(Math.random() * available.length)];
          newRes[r] -= 1;
        }
        return { ...p, resources: newRes };
      });

      set({
        quizResult: 'incorrect',
        players: newPlayers,
        gameLog: [...state.gameLog, generateGameLog(`💥 ${player.name}がクイズに不正解…資源を2つ失った`, 'event', player.id)],
      });
    }
  },

  handleQuizTimeout: () => {
    const state = get();
    if (!state.currentQuiz || state.quizResult) return;

    const player = state.players[state.currentPlayerIndex];
    const allRes: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
    const newPlayers = state.players.map(p => {
      if (p.id !== player.id) return p;
      const newRes = { ...p.resources };
      for (let i = 0; i < 2; i++) {
        const available = allRes.filter(r => newRes[r] > 0);
        if (available.length === 0) break;
        const r = available[Math.floor(Math.random() * available.length)];
        newRes[r] -= 1;
      }
      return { ...p, resources: newRes };
    });

    set({
      quizResult: 'timeout',
      players: newPlayers,
      gameLog: [...state.gameLog, generateGameLog(`⏰ ${player.name}が時間切れ…資源を2つ失った`, 'event', player.id)],
    });
  },

  pickQuizReward: (resource: ResourceType) => {
    const state = get();
    if (state.quizResourcePickRemaining <= 0) return;

    const player = state.players[state.currentPlayerIndex];
    const newPlayers = state.players.map(p => {
      if (p.id !== player.id) return p;
      return { ...p, resources: { ...p.resources, [resource]: p.resources[resource] + 1 } };
    });

    const remaining = state.quizResourcePickRemaining - 1;
    const resName = RESOURCE_INFO[resource].icon + RESOURCE_INFO[resource].name;

    set({
      players: newPlayers,
      quizResourcePickRemaining: remaining,
      gameLog: [...state.gameLog, generateGameLog(`${player.name}が${resName}を獲得！${remaining > 0 ? `（あと${remaining}つ）` : ''}`, 'resource', player.id)],
    });
  },

  dismissQuiz: () => {
    set({
      phase: 'action',
      currentQuiz: null,
      quizResult: null,
      quizResourcePickRemaining: 0,
      turnTimerPausedForQuiz: false,
    });
  },

  // =============================================
  // TURN TIMER
  // =============================================
  tickTurnTimer: () => {
    const state = get();
    if (!state.timerEnabled || !state.turnTimerActive || state.turnTimerPausedForQuiz) return;
    if (state.isPlayingAI || state.phase === 'setup' || state.phase === 'finished' || state.phase === 'handoff') return;

    const newTime = state.turnTimeRemaining - 1;
    if (newTime <= 0) {
      set({ turnTimeRemaining: 0, turnTimerActive: false });
      get().doEndTurn();
    } else {
      set({ turnTimeRemaining: newTime });
    }
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
          screen: 'result',
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

        // AI rolls dice (hard AI with gold>=6 forces 7)
        let dice: [number, number];
        let total: number;
        if (state.difficulty === 'hard' && aiP.resources.gold >= 6) {
          dice = [3, 4];
          total = 7;
          aiP.resources.gold -= 4;
          logs.push(generateGameLog(`💰 ${aiP.name}が金4枚を使って7を確定！`, 'trade', aiP.id));
        } else {
          dice = rollDice();
          total = dice[0] + dice[1];
        }
        const resName = (r: ResourceType) => RESOURCE_INFO[r].icon + RESOURCE_INFO[r].name;

        const matchingTileIds = state.tiles
          .filter(t => t.diceNumber === total && t.type !== 'sea' && t.type !== 'desert')
          .map(t => t.id);

        // Build gains summary for dice_roll display
        const gainsSummaryParts: string[] = [];

        if (total === 7) {
          // Lucky 7: rolling player gains +1 of all resources
          const allRes: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
          allRes.forEach(res => { aiP.resources[res] += 1; });
          const parts = allRes.map(res => `${RESOURCE_INFO[res].icon}+1`);
          gainsSummaryParts.push(`${aiP.flagEmoji} ${parts.join(' ')}`);

          logs.push(generateGameLog(`${aiP.name}がサイコロを振った！ 🎲 ${dice[0]}+${dice[1]}=${total}`, 'info', aiP.id));
          logs.push(generateGameLog(`🎲7！${aiP.name}が全資源+1！`, 'resource', aiP.id));

          aiActions.push({
            type: 'dice_roll',
            playerId: aiP.id,
            playerName: aiP.countryName,
            playerFlag: aiP.flagEmoji,
            playerColor: aiP.color,
            dice,
            diceTotal: total,
            highlightTileIds: [],
            gainsSummary: gainsSummaryParts.join('  '),
          });

          // Single lucky_seven action instead of 4 separate resource_gains
          aiActions.push({
            type: 'lucky_seven',
            playerId: aiP.id,
            playerName: aiP.countryName,
            playerFlag: aiP.flagEmoji,
            playerColor: aiP.color,
          });

          // Event on 7 for AI — apply directly to sim
          const aiEvent = getRandomEvent(state.difficulty);
          if (aiEvent) {
            const allResTypes: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
            let eventMsg = '';
            let eventResultDetail = ''; // Short result for overlay display
            if (aiEvent.effectType === 'lose_resources') {
              const r = allResTypes[Math.floor(Math.random() * allResTypes.length)];
              const before = aiP.resources[r];
              const loss = Math.min(aiP.resources[r], aiEvent.effectValue);
              aiP.resources[r] -= loss;
              eventResultDetail = `${RESOURCE_INFO[r].icon}${RESOURCE_INFO[r].name} ${before}→${aiP.resources[r]}（-${loss}）`;
              eventMsg = `${aiEvent.icon}${aiP.flagEmoji}${aiP.name}に${aiEvent.title}→${RESOURCE_INFO[r].icon}${RESOURCE_INFO[r].name}${loss}つ失った`;
            } else if (aiEvent.effectType === 'lose_food') {
              const before = aiP.resources.food;
              const loss = Math.min(aiP.resources.food, aiEvent.effectValue);
              aiP.resources.food -= loss;
              eventResultDetail = `🌾食料 ${before}→${aiP.resources.food}（-${loss}）`;
              eventMsg = `${aiEvent.icon}${aiP.flagEmoji}${aiP.name}に${aiEvent.title}→🌾食料${loss}つ失った`;
            } else if (aiEvent.effectType === 'gain_resources') {
              const r = allResTypes[Math.floor(Math.random() * allResTypes.length)];
              aiP.resources[r] += aiEvent.effectValue;
              eventResultDetail = `${RESOURCE_INFO[r].icon}${RESOURCE_INFO[r].name} +${aiEvent.effectValue}`;
              eventMsg = `${aiEvent.icon}${aiP.flagEmoji}${aiP.name}に${aiEvent.title}→${RESOURCE_INFO[r].icon}+${aiEvent.effectValue}`;
            } else if (aiEvent.effectType === 'gain_all') {
              allResTypes.forEach(r => { aiP.resources[r] += aiEvent.effectValue; });
              eventResultDetail = `🌿+1 🛢️+1 💰+1 🌾+1 全部もらった！`;
              eventMsg = `${aiEvent.icon}${aiP.flagEmoji}${aiP.name}に${aiEvent.title}→全資源+${aiEvent.effectValue}`;
            } else if (aiEvent.effectType === 'discount_build') {
              const r1 = allResTypes[Math.floor(Math.random() * allResTypes.length)];
              const r2 = allResTypes[Math.floor(Math.random() * allResTypes.length)];
              aiP.resources[r1] += 1; aiP.resources[r2] += 1;
              eventResultDetail = `${RESOURCE_INFO[r1].icon}+1 ${RESOURCE_INFO[r2].icon}+1`;
              eventMsg = `${aiEvent.icon}${aiP.flagEmoji}${aiP.name}に${aiEvent.title}→${RESOURCE_INFO[r1].icon}+1 ${RESOURCE_INFO[r2].icon}+1`;
            } else if (aiEvent.effectType === 'free_road') {
              const validEdges = getValidRoadEdges(aiP.id, state.edges, state.vertices, simSettlements, simRoads, false);
              if (validEdges.length > 0) {
                simRoads.push({ edgeId: validEdges[Math.floor(Math.random() * validEdges.length)], playerId: aiP.id });
                eventResultDetail = '🛤️道を1つ無料で建設！';
              } else {
                eventResultDetail = '建設できる場所がなかった';
              }
              eventMsg = `${aiEvent.icon}${aiP.flagEmoji}${aiP.name}に${aiEvent.title}→${eventResultDetail}`;
            } else if (aiEvent.effectType === 'lose_structure') {
              const mySett = simSettlements.filter(s => s.playerId === aiP.id && s.level === 'settlement');
              if (mySett.length > 0) {
                const target = mySett[Math.floor(Math.random() * mySett.length)];
                const idx2 = simSettlements.findIndex(s => s.vertexId === target.vertexId && s.playerId === aiP.id);
                if (idx2 !== -1) simSettlements.splice(idx2, 1);
                const vpBefore = aiP.victoryPoints;
                aiP.victoryPoints = Math.max(0, aiP.victoryPoints - 1);
                eventResultDetail = `🏠拠点1つ失った（★${vpBefore}→${aiP.victoryPoints}）`;
              } else {
                eventResultDetail = '失う拠点がなかった';
              }
              eventMsg = `${aiEvent.icon}${aiP.flagEmoji}${aiP.name}に${aiEvent.title}→${eventResultDetail}`;
            } else if (aiEvent.effectType === 'skip_turn') {
              eventResultDetail = 'このターン行動できない！';
              eventMsg = `${aiEvent.icon}${aiP.flagEmoji}${aiP.name}に${aiEvent.title}→行動スキップ`;
            } else {
              eventResultDetail = aiEvent.description;
              eventMsg = `${aiEvent.icon}${aiP.flagEmoji}${aiP.name}に${aiEvent.title}`;
            }
            logs.push(generateGameLog(eventMsg, 'event', aiP.id));
            aiActions.push({
              type: 'event',
              playerId: aiP.id,
              playerName: aiP.countryName,
              playerFlag: aiP.flagEmoji,
              playerColor: aiP.color,
              eventTitle: aiEvent.title,
              eventIcon: aiEvent.icon,
              eventCategory: aiEvent.category,
              eventDetail: eventResultDetail,
            });
          }
        } else {
          // Normal dice: distribute from tiles
          const gains = distributeResourcesWithVertices(
            state.tiles, state.vertices, simSettlements, simPlayers, total
          );

          // Apply gains to sim
          gains.forEach(g => {
            const p = simPlayers.find(pp => pp.id === g.playerId);
            if (p) p.resources[g.resource] += g.amount;
          });

          const gainsByPlayer = new Map<string, string[]>();
          gains.forEach(g => {
            const icon = RESOURCE_INFO[g.resource].icon;
            const parts = gainsByPlayer.get(g.playerId) || [];
            parts.push(`${icon}+${g.amount}`);
            gainsByPlayer.set(g.playerId, parts);
          });
          gainsByPlayer.forEach((parts, pid) => {
            const p = simPlayers.find(pp => pp.id === pid);
            gainsSummaryParts.push(`${p?.flagEmoji || ''} ${parts.join(' ')}`);
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
            gainsSummary: gainsSummaryParts.length > 0 ? gainsSummaryParts.join('  ') : undefined,
          });

          logs.push(generateGameLog(`${aiP.name}がサイコロを振った！ 🎲 ${dice[0]}+${dice[1]}=${total}`, 'info', aiP.id));

          if (gains.length > 0) {
            gains.forEach(g => {
              const p = simPlayers.find(pp => pp.id === g.playerId);
              logs.push(generateGameLog(`${p?.name || ''}が${resName(g.resource)}+${g.amount}`, 'resource', g.playerId));
            });
            // Single dice_gains action with all gains bundled
            aiActions.push({
              type: 'dice_gains',
              playerId: aiP.id,
              playerName: aiP.countryName,
              playerFlag: aiP.flagEmoji,
              playerColor: aiP.color,
              diceGains: gains.map(g => ({ playerId: g.playerId, resource: g.resource, amount: g.amount })),
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
        }

        // AI build actions
        const aiActs = aiTurn(aiP, state.tiles, state.vertices, state.edges, simSettlements, simRoads, state.difficulty, state.ports);
        aiActs.forEach(a => {
          if (a.type === 'pass') {
            logs.push(generateGameLog(`${aiP.name}はパスした`, 'info', aiP.id));
            return;
          }
          if (a.type === 'trade') {
            if (a.tradeFrom && a.tradeTo) {
              const tradeRate = getTradeRate(aiP.id, a.tradeFrom, simSettlements, state.ports);
              aiP.resources[a.tradeFrom] -= tradeRate;
              aiP.resources[a.tradeTo] += 1;
              const fromInfo = RESOURCE_INFO[a.tradeFrom];
              const toInfo = RESOURCE_INFO[a.tradeTo];
              logs.push(generateGameLog(`${aiP.flagEmoji} ${aiP.name}が${fromInfo.icon}${fromInfo.name}×${tradeRate}→${toInfo.icon}${toInfo.name}×1に交換`, 'trade', aiP.id));
              aiActions.push({
                type: 'build_road', // reuse for display (trade has no dedicated type in overlay)
                playerId: aiP.id,
                playerName: aiP.countryName,
                playerFlag: aiP.flagEmoji,
                playerColor: aiP.color,
                buildType: '交換',
                costText: `${fromInfo.icon}-${tradeRate} → ${toInfo.icon}+1`,
                tradeFrom: a.tradeFrom,
                tradeTo: a.tradeTo,
              });
            }
            return;
          }

          // Build cost text
          const cost = a.type === 'build_settlement' ? BUILD_COSTS.settlement
            : a.type === 'build_road' ? BUILD_COSTS.road
            : BUILD_COSTS.city;
          const costParts = (Object.entries(cost) as [ResourceType, number][])
            .map(([res, amt]) => `${RESOURCE_INFO[res].icon}-${amt}`);
          const costText = costParts.join(' ');

          // Apply cost to sim player
          (Object.entries(cost) as [ResourceType, number][]).forEach(([res, amt]) => {
            aiP.resources[res] -= amt;
          });

          // Update sim board state
          if (a.type === 'build_settlement' && a.vertexId) {
            simSettlements.push({ vertexId: a.vertexId, playerId: aiP.id, level: 'settlement' });
            aiP.victoryPoints += 1;
          } else if (a.type === 'build_road' && a.edgeId) {
            simRoads.push({ edgeId: a.edgeId, playerId: aiP.id });
          } else if (a.type === 'upgrade_city' && a.vertexId) {
            const s = simSettlements.find(s => s.vertexId === a.vertexId && s.playerId === aiP.id);
            if (s) { s.level = 'city'; aiP.victoryPoints += 1; }
          }

          const buildLabel = a.type === 'build_road' ? '道' : a.type === 'build_settlement' ? '拠点' : '都市';
          logs.push(generateGameLog(`${aiP.flagEmoji} ${aiP.name}が${costParts.join('')}で${buildLabel}を建設`, a.type === 'build_road' ? 'road' : 'build', aiP.id));
          aiActions.push({
            type: a.type === 'build_road' ? 'build_road' : a.type === 'build_settlement' ? 'build_settlement' : 'upgrade_city',
            playerId: aiP.id,
            playerName: aiP.countryName,
            playerFlag: aiP.flagEmoji,
            playerColor: aiP.color,
            edgeId: a.edgeId,
            vertexId: a.vertexId,
            buildType: buildLabel,
            costText,
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
        diceAnimationStep: 0,
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
        diceAnimationStep: 0,
        gameLog: [...state.gameLog, ...logs],
        selectedVertexId: null,
        selectedEdgeId: null,
        buildMode: null,
        highlightedTileIds: [],
        highlightedVertexIds: [],
        highlightedEdgeIds: [],
        showResourceGains: false,
        resourceGains: [],
        // Timer: start if going directly to rolling (no handoff)
        turnTimeRemaining: TURN_TIMER_SECONDS,
        turnTimerActive: !needHandoff,
        turnTimerPausedForQuiz: false,
        usedGoldDice: false,
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
          highlightedTileIds: [],
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
          highlightedTileIds: [],
          turnTimeRemaining: TURN_TIMER_SECONDS,
          turnTimerActive: !needHandoff,
          turnTimerPausedForQuiz: false,
          usedGoldDice: false,
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
    } else if (action.type === 'dice_gains' && action.diceGains) {
      // Apply all resource gains at once
      const newPlayers = state.players.map(p => {
        const pGains = action.diceGains!.filter(g => g.playerId === p.id);
        if (pGains.length === 0) return p;
        const res = { ...p.resources };
        pGains.forEach(g => { res[g.resource] += g.amount; });
        return { ...p, resources: res };
      });
      set({
        currentAIAction: action,
        aiActionQueue: queue,
        players: newPlayers,
      });
    } else if (action.type === 'lucky_seven') {
      // Apply all +1 resources at once
      const newPlayers = state.players.map(p => {
        if (p.id !== action.playerId) return p;
        const res = { ...p.resources };
        res.rubber += 1; res.oil += 1; res.gold += 1; res.food += 1;
        return { ...p, resources: res };
      });
      set({
        currentAIAction: action,
        aiActionQueue: queue,
        players: newPlayers,
      });
    } else if (action.type === 'dice_roll') {
      set({
        currentAIAction: action,
        aiActionQueue: queue,
        diceResult: action.dice || null,
        highlightedTileIds: action.highlightTileIds || [],
      });
    } else if (action.type === 'turn_start' || action.type === 'turn_end') {
      set({
        currentAIAction: action,
        aiActionQueue: queue,
        highlightedTileIds: [],
      });
    } else if (action.type === 'build_settlement' && action.vertexId) {
      const cost = BUILD_COSTS.settlement;
      const newPlayers = state.players.map(p => {
        if (p.id !== action.playerId) return p;
        const res = { ...p.resources };
        (Object.entries(cost) as [ResourceType, number][]).forEach(([r, amt]) => { res[r] -= amt; });
        return { ...p, resources: res, victoryPoints: p.victoryPoints + 1 };
      });
      const newSettlements = [...state.settlements, {
        vertexId: action.vertexId,
        playerId: action.playerId,
        level: 'settlement' as const,
      }];
      set({
        currentAIAction: action,
        aiActionQueue: queue,
        players: newPlayers,
        settlements: newSettlements,
        highlightedTileIds: [],
      });
    } else if (action.type === 'build_road' && action.edgeId && !action.tradeFrom) {
      const cost = BUILD_COSTS.road;
      const newPlayers = state.players.map(p => {
        if (p.id !== action.playerId) return p;
        const res = { ...p.resources };
        (Object.entries(cost) as [ResourceType, number][]).forEach(([r, amt]) => { res[r] -= amt; });
        return { ...p, resources: res };
      });
      const newRoads = [...state.roads, {
        edgeId: action.edgeId,
        playerId: action.playerId,
      }];
      set({
        currentAIAction: action,
        aiActionQueue: queue,
        players: newPlayers,
        roads: newRoads,
        highlightedTileIds: [],
      });
    } else if (action.type === 'build_road' && action.tradeFrom && action.tradeTo) {
      // Trade action (reuses build_road type)
      const newPlayers = state.players.map(p => {
        if (p.id !== action.playerId) return p;
        const res = { ...p.resources };
        res[action.tradeFrom!] -= 3;
        res[action.tradeTo!] += 1;
        return { ...p, resources: res };
      });
      set({
        currentAIAction: action,
        aiActionQueue: queue,
        players: newPlayers,
        highlightedTileIds: [],
      });
    } else if (action.type === 'upgrade_city' && action.vertexId) {
      const cost = BUILD_COSTS.city;
      const newPlayers = state.players.map(p => {
        if (p.id !== action.playerId) return p;
        const res = { ...p.resources };
        (Object.entries(cost) as [ResourceType, number][]).forEach(([r, amt]) => { res[r] -= amt; });
        return { ...p, resources: res, victoryPoints: p.victoryPoints + 1 };
      });
      const newSettlements = state.settlements.map(s =>
        s.vertexId === action.vertexId && s.playerId === action.playerId
          ? { ...s, level: 'city' as const }
          : s
      );
      set({
        currentAIAction: action,
        aiActionQueue: queue,
        players: newPlayers,
        settlements: newSettlements,
        highlightedTileIds: [],
      });
    } else {
      set({
        currentAIAction: action,
        aiActionQueue: queue,
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
      highlightedTileIds: [],
      diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
      turnTimeRemaining: TURN_TIMER_SECONDS,
      turnTimerActive: true,
      turnTimerPausedForQuiz: false,
      usedGoldDice: false,
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
