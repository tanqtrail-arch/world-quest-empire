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
import { EVENT_CARDS } from './eventCards';
import { applyEventEffect, type EffectContext } from './eventCardEffects';
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
  type: 'turn_start' | 'dice_roll' | 'resource_gain' | 'dice_gains' | 'lucky_seven' | 'no_resource' | 'build_road' | 'build_settlement' | 'upgrade_city' | 'event' | 'event_card' | 'turn_end' | 'ai_quiz';
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
  // AI quiz fields
  quizQuestion?: QuizQuestion;
  quizAIChoiceIndex?: number;
  quizAICorrect?: boolean;
  // Event card payload
  eventCard?: EventCard;
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

  // Event card persistent state
  tradeBlocked: boolean;                                          // 貿易制裁: このターン行動不可（次ターン開始で解除）
  tempVP: { playerId: string; amount: number; remainingTurns: number }[]; // 万博などの一時VP
  peaceTreatyTurns: number;                                       // 平和条約の残りターン数
  blockedSettlementId: string | null;                             // 将来拡張用: 拠点ブロック

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
  quizCorrectCount: number; // ゲーム中のクイズ正解数（ランキング用）
  quizTotalCount: number;   // ゲーム中のクイズ出題数（ランキング用）

  // Badge tracking (per-game)
  sevensRolledCount: number; // ヒューマンが振って7が出た回数
  wasLastPlaceOnce: boolean; // ヒューマンが一度でも最下位になったか（逆転王判定用）

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

  tradeBlocked: false,
  tempVP: [],
  peaceTreatyTurns: 0,
  blockedSettlementId: null,

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
  quizCorrectCount: 0,
  quizTotalCount: 0,
  sevensRolledCount: 0,
  wasLastPlaceOnce: false,

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
      tradeBlocked: false,
      tempVP: [],
      peaceTreatyTurns: 0,
      blockedSettlementId: null,
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
      quizCorrectCount: 0,
      quizTotalCount: 0,
      sevensRolledCount: 0,
      wasLastPlaceOnce: false,
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
    const isHumanSeven = total === 7 && !currentPlayer.isAI;

    const logs: GameLogEntry[] = [
      generateGameLog(`${currentPlayer.name}がサイコロを振った！ 🎲 ${dice[0]} + ${dice[1]} = ${total}`, 'info', currentPlayer.id),
    ];

    // Distribute resources
    const newPlayers = state.players.map(p => ({ ...p, resources: { ...p.resources } }));
    const resourceGainPopups: ResourceGainPopup[] = [];

    if (total === 7) {
      const allRes: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
      // Lucky 7: ALL players gain +1 of every resource
      newPlayers.forEach(p => {
        allRes.forEach(res => { p.resources[res] += 1; });
        resourceGainPopups.push({
          playerId: p.id,
          playerName: p.name,
          playerFlag: p.flagEmoji,
          playerColor: p.color,
          resource: 'rubber',
          amount: 1,
        });
      });
      logs.push(generateGameLog(`🎲7！全プレイヤーが全資源+1！`, 'resource', currentPlayer.id));
      logs.push(generateGameLog(`📜 ${currentPlayer.name}は歴史クイズに挑戦！`, 'info', currentPlayer.id));
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
      ...(isHumanSeven ? { sevensRolledCount: state.sevensRolledCount + 1 } : {}),
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

    set({
      players: newPlayers,
      usedGoldDice: true,
      sevensRolledCount: state.sevensRolledCount + 1,
    });

    // 7確定でdoRollDiceと同等処理を実行
    const dice: [number, number] = [3, 4];
    const total = 7;
    const currentPlayer = newPlayers[state.currentPlayerIndex];

    const logs: GameLogEntry[] = [
      generateGameLog(`💰 ${currentPlayer.name}が金4枚を使って7を確定！ 🎲 3 + 4 = 7`, 'trade', currentPlayer.id),
    ];

    const updatedPlayers = newPlayers.map(p => ({ ...p, resources: { ...p.resources } }));
    const allRes: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
    // Lucky 7: ALL players gain +1 of every resource
    updatedPlayers.forEach(p => {
      allRes.forEach(res => { p.resources[res] += 1; });
    });
    logs.push(generateGameLog(`🎲7！全プレイヤーが全資源+1！`, 'resource', currentPlayer.id));
    logs.push(generateGameLog(`📜 ${currentPlayer.name}は歴史クイズに挑戦！`, 'info', currentPlayer.id));

    const resourceGainPopups: ResourceGainPopup[] = updatedPlayers.map(p => ({
      playerId: p.id,
      playerName: p.name,
      playerFlag: p.flagEmoji,
      playerColor: p.color,
      resource: 'rubber',
      amount: 1,
    }));

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

    if (diceTotal === 7) {
      const quizPool = QUIZ_QUESTIONS.filter(q => q.difficulty === state.quizDifficulty);
      if (quizPool.length === 0) {
        set({ showResourceGains: false, highlightedTileIds: [], diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4 });
        return;
      }
      const quiz = quizPool[Math.floor(Math.random() * quizPool.length)];

      set({
        showResourceGains: false,
        highlightedTileIds: [],
        diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
        phase: 'quiz',
        currentQuiz: quiz,
        quizResult: null,
        quizResourcePickRemaining: 0,
        turnTimerPausedForQuiz: true,
        quizTotalCount: state.quizTotalCount + 1,
      });
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
  // EVENT HANDLING (dispatches to eventCardEffects.ts)
  // =============================================
  handleEvent: () => {
    const state = get();
    if (!state.currentEvent) return;

    const player = state.players[state.currentPlayerIndex];
    const event = state.currentEvent;

    const ctx: EffectContext = {
      players: state.players,
      currentPlayerId: player.id,
      settlements: state.settlements,
      roads: state.roads,
      edges: state.edges.map(e => ({ id: e.id, v1: e.vertexIds[0], v2: e.vertexIds[1] })),
      vertices: state.vertices.map(v => ({ id: v.id, x: v.x, y: v.y })),
    };

    const result = applyEventEffect(event, ctx);

    // requires player to pick resources → enter pick mode and wait for pickResource calls
    if (result.requiresChoice === 'pick_resource' && result.choiceCount) {
      set({
        currentEvent: null,
        eventEffectPreview: null,
        phase: 'action',
        highlightedTileIds: [],
        diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
        resourcePickMode: { remaining: result.choiceCount, eventTitle: event.title },
        gameLog: [...state.gameLog, generateGameLog(result.message, 'event', player.id)],
      });
      return;
    }

    // Persistent effects
    const patch: Partial<GameStore> = {};
    if (event.effectType === 'sanction') {
      patch.tradeBlocked = true;
    }
    if (event.effectType === 'peace_treaty' && event.duration) {
      patch.peaceTreatyTurns = event.duration;
    }
    if (event.effectType === 'expo' && event.duration) {
      patch.tempVP = [
        ...state.tempVP,
        { playerId: player.id, amount: 1, remainingTurns: event.duration },
      ];
    }

    set({
      players: result.players ?? state.players,
      settlements: result.settlements ?? state.settlements,
      roads: result.roads ?? state.roads,
      currentEvent: null,
      eventEffectPreview: null,
      phase: 'action',
      highlightedTileIds: [],
      diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
      gameLog: [...state.gameLog, generateGameLog(result.message, 'event', player.id)],
      ...patch,
    } as any);

    if (result.skipAction) {
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
        quizCorrectCount: state.quizCorrectCount + 1,
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
    const state = get();
    // After quiz on a 7 roll, draw an event card.
    const drawn = EVENT_CARDS[Math.floor(Math.random() * EVENT_CARDS.length)];
    const card: EventCard = { ...drawn, id: genId() };
    set({
      phase: 'event',
      currentQuiz: null,
      quizResult: null,
      quizResourcePickRemaining: 0,
      turnTimerPausedForQuiz: false,
      currentEvent: card,
      gameLog: [
        ...state.gameLog,
        generateGameLog(`🎴 運命のカード: ${card.icon} ${card.title}`, 'event', state.players[state.currentPlayerIndex].id),
      ],
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

    // Track "came from behind" badge: if any human ends a turn in last place,
    // flag it so we can award the badge if they eventually win.
    let wasLastPlaceOnceUpdate: boolean | null = null;
    const humanPlayers = state.players.filter(p => p.isHuman);
    if (humanPlayers.length > 0 && !state.wasLastPlaceOnce) {
      const minVP = Math.min(...state.players.map(p => p.victoryPoints));
      const anyHumanLast = humanPlayers.some(p => p.victoryPoints === minVP);
      if (anyHumanLast) {
        wasLastPlaceOnceUpdate = true;
      }
    }

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
          ...(wasLastPlaceOnceUpdate !== null ? { wasLastPlaceOnce: true } : {}),
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
          // Lucky 7: ALL players gain +1 of every resource
          const allRes: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
          simPlayers.forEach(p => {
            p.resources.rubber += 1;
            p.resources.oil += 1;
            p.resources.gold += 1;
            p.resources.food += 1;
          });
          // Build a per-player summary like "🇯🇵 🌿+1 🛢️+1 💰+1 🌾+1"
          simPlayers.forEach(p => {
            const parts = allRes.map(res => `${RESOURCE_INFO[res].icon}+1`);
            gainsSummaryParts.push(`${p.flagEmoji} ${parts.join(' ')}`);
          });

          logs.push(generateGameLog(`${aiP.name}がサイコロを振った！ 🎲 ${dice[0]}+${dice[1]}=${total}`, 'info', aiP.id));
          logs.push(generateGameLog(`🎲7！全プレイヤーが全資源+1！`, 'resource', aiP.id));

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

          // ----- AI auto-quiz on 7 -----
          // Pick a real quiz and push an ai_quiz action so the player sees it
          // (QuizPopup renders the AI mode: thinking → choice → result)
          const aiQuizPool = QUIZ_QUESTIONS.filter(q => q.difficulty === state.quizDifficulty);
          const aiQuizQuestion = aiQuizPool.length > 0
            ? aiQuizPool[Math.floor(Math.random() * aiQuizPool.length)]
            : null;

          // Accuracy per difficulty: easy=20%, normal=50%, hard=85%
          const quizWinProb = state.difficulty === 'hard' ? 0.85 : state.difficulty === 'normal' ? 0.5 : 0.2;
          const quizCorrect = Math.random() < quizWinProb;

          if (aiQuizQuestion) {
            let aiChoiceIndex: number;
            if (quizCorrect) {
              aiChoiceIndex = aiQuizQuestion.correctIndex;
            } else {
              const wrongIndices = aiQuizQuestion.options
                .map((_, i) => i)
                .filter(i => i !== aiQuizQuestion.correctIndex);
              aiChoiceIndex = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
            }
            aiActions.push({
              type: 'ai_quiz',
              playerId: aiP.id,
              playerName: aiP.countryName,
              playerFlag: aiP.flagEmoji,
              playerColor: aiP.color,
              quizQuestion: aiQuizQuestion,
              quizAIChoiceIndex: aiChoiceIndex,
              quizAICorrect: quizCorrect,
            });
          }

          if (quizCorrect) {
            // Pick 2 resources AI is lowest on
            const sorted = [...allRes].sort((a, b) => aiP.resources[a] - aiP.resources[b]);
            const picks: ResourceType[] = [sorted[0], sorted[1]];
            picks.forEach(r => { aiP.resources[r] += 1; });
            const pickText = picks.map(r => `${RESOURCE_INFO[r].icon}+1`).join(' ');
            logs.push(generateGameLog(`📜 ${aiP.name}は歴史クイズに正解！${pickText}`, 'event', aiP.id));
            aiActions.push({
              type: 'event',
              playerId: aiP.id,
              playerName: aiP.countryName,
              playerFlag: aiP.flagEmoji,
              playerColor: aiP.color,
              eventTitle: '歴史クイズ正解！',
              eventIcon: '📜',
              eventCategory: 'positive',
              eventDetail: `${pickText} をゲット！`,
            });
          } else {
            // Pick 2 random resources AI currently has; deduct 1 each
            const ownedRes = allRes.filter(r => aiP.resources[r] > 0);
            const losses: ResourceType[] = [];
            for (let i = 0; i < 2 && ownedRes.length > 0; i++) {
              const idx = Math.floor(Math.random() * ownedRes.length);
              const r = ownedRes[idx];
              aiP.resources[r] -= 1;
              losses.push(r);
              if (aiP.resources[r] <= 0) ownedRes.splice(idx, 1);
            }
            const lossText = losses.length > 0
              ? losses.map(r => `${RESOURCE_INFO[r].icon}-1`).join(' ')
              : '失う資源がなかった';
            logs.push(generateGameLog(`📜 ${aiP.name}は歴史クイズに不正解... ${lossText}`, 'event', aiP.id));
            aiActions.push({
              type: 'event',
              playerId: aiP.id,
              playerName: aiP.countryName,
              playerFlag: aiP.flagEmoji,
              playerColor: aiP.color,
              eventTitle: '歴史クイズ不正解...',
              eventIcon: '💥',
              eventCategory: 'negative',
              eventDetail: lossText,
            });
          }

          // ----- AI draws an event card -----
          const drawn = EVENT_CARDS[Math.floor(Math.random() * EVENT_CARDS.length)];
          const aiCard: EventCard = { ...drawn, id: genId() };
          const aiCtx: EffectContext = {
            players: simPlayers,
            currentPlayerId: aiP.id,
            settlements: simSettlements,
            roads: simRoads,
            edges: state.edges.map(e => ({ id: e.id, v1: e.vertexIds[0], v2: e.vertexIds[1] })),
            vertices: state.vertices.map(v => ({ id: v.id, x: v.x, y: v.y })),
          };
          const aiResult = applyEventEffect(aiCard, aiCtx);
          // Apply result to sim (AI cannot pick — skip requiresChoice cards gracefully)
          if (aiResult.players) {
            // Copy back to simPlayers
            aiResult.players.forEach(np => {
              const p = simPlayers.find(pp => pp.id === np.id);
              if (p) {
                p.resources = { ...np.resources };
                p.victoryPoints = np.victoryPoints;
              }
            });
          }
          if (aiResult.settlements) {
            simSettlements.length = 0;
            aiResult.settlements.forEach(s => simSettlements.push(s));
          }
          if (aiResult.roads) {
            simRoads.length = 0;
            aiResult.roads.forEach(r => simRoads.push(r));
          }
          // For requiresChoice cards, give AI some free resources (2 best)
          if (aiResult.requiresChoice === 'pick_resource' && aiResult.choiceCount) {
            const sorted = [...allRes].sort((a, b) => aiP.resources[a] - aiP.resources[b]);
            for (let i = 0; i < aiResult.choiceCount; i++) {
              aiP.resources[sorted[i % sorted.length]] += 1;
            }
          }
          logs.push(generateGameLog(`🎴 ${aiP.name} 運命のカード: ${aiCard.icon} ${aiCard.title}`, 'event', aiP.id));
          aiActions.push({
            type: 'event_card',
            playerId: aiP.id,
            playerName: aiP.countryName,
            playerFlag: aiP.flagEmoji,
            playerColor: aiP.color,
            eventCard: aiCard,
          });
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
              if (aiP.resources[a.tradeFrom] < tradeRate) {
                return;
              }
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

          // Affordability check — skip action if AI cannot pay
          const canAfford = (Object.entries(cost) as [ResourceType, number][])
            .every(([res, amt]) => aiP.resources[res] >= amt);
          if (!canAfford) {
            return;
          }

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
        ...(wasLastPlaceOnceUpdate !== null ? { wasLastPlaceOnce: true } : {}),
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
        ...(wasLastPlaceOnceUpdate !== null ? { wasLastPlaceOnce: true } : {}),
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
      // Apply +1 of every resource to ALL players (not just the AI who rolled)
      const newPlayers = state.players.map(p => {
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
    } else if (action.type === 'ai_quiz') {
      // Resources are already applied in sim; the UI popup is purely cosmetic.
      set({
        currentAIAction: action,
        aiActionQueue: queue,
      });
    } else if (action.type === 'event_card') {
      // Effect already applied to simPlayers; show the card UI purely cosmetically.
      set({
        currentAIAction: action,
        aiActionQueue: queue,
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
