// ===== Game Store (Zustand) - Catan-style vertex/edge system =====
import { create } from 'zustand';
import {
  type Player, type GameTile, type Vertex, type Edge,
  type Settlement, type Road, type Resources, type ResourceType,
  type EventCard, type GameLogEntry, type Difficulty, type GamePhase,
  type SetupStep, type PlayerSlot, type QuizQuestion, type Port,
  BUILD_COSTS, VP_VALUES, WINNING_SCORE, PLAYER_COLORS,
  RESOURCE_INFO, TURN_TIMER_SECONDS, QUIZ_QUESTIONS,
} from './gameTypes';
import { EVENT_CARDS } from './eventCards';
import { applyEventEffect, type EffectContext } from './eventCardEffects';
import {
  generateMap, generateLargeMap, generate1d6Map, generateVerticesAndEdges, createPlayer, rollDice, rollSingleDice,
  distributeResourcesWithVertices, canAfford, payCost,
  canBuildSettlement, canBuildRoad, getValidSettlementVertices,
  getValidRoadEdges, getUpgradeableVertices, calculateLongestRoad,
  getRandomEvent, generateGameLog, genId,
  aiChooseSetupVertex, aiChooseSetupRoad, aiTurn,
  generatePorts, getTradeRate,
  type AITurnAction,
} from './gameLogic';
import { GAMBLE_CARDS, pickRandomGambleCard, type GambleCard, type GambleResolveResult } from './gambleCards';
import { getStageById, updateStageResult } from './stageData';
import type { StageSpecialRules } from './stageData';

// AI playback speed (used by AITurnOverlay to scale ACTION_DURATIONS)
export type AISpeed = 'slow' | 'normal' | 'fast';

export const AI_SPEED_MULTIPLIER: Record<AISpeed, number> = {
  slow: 2.0,
  normal: 1.0,
  fast: 0.3,
};

export const AI_SPEED_INFO: Record<AISpeed, { icon: string; label: string }> = {
  slow:   { icon: '🐢', label: 'じっくり' },
  normal: { icon: '🏃', label: 'ふつう' },
  fast:   { icon: '⚡', label: 'はやい' },
};

const AI_SPEED_STORAGE_KEY = 'wqe_ai_speed';
function loadAiSpeed(): AISpeed {
  try {
    const v = localStorage.getItem(AI_SPEED_STORAGE_KEY);
    if (v === 'slow' || v === 'normal' || v === 'fast') return v;
  } catch {}
  return 'normal';
}
function saveAiSpeed(speed: AISpeed): void {
  try { localStorage.setItem(AI_SPEED_STORAGE_KEY, speed); } catch {}
}

// Module-level timer registry for dice animation steps. Prevents leaks when
// doRollDice is invoked again before the previous staged sequence finishes.
const diceAnimationTimers: ReturnType<typeof setTimeout>[] = [];
function clearDiceAnimationTimers() {
  while (diceAnimationTimers.length > 0) {
    const t = diceAnimationTimers.pop();
    if (t) clearTimeout(t);
  }
}

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
  screen: 'title' | 'create' | 'game' | 'result' | 'stage_select' | 'stage_clear';
  setScreen: (screen: GameStore['screen']) => void;

  // Stage mode
  stageMode: { stageId: number; specialRules: StageSpecialRules; diceCount: 1 | 2 } | null;
  stageClearStars: number;
  tradeCount: number; // track trades for stage clear conditions
  tutorialMessage: string | null; // チュートリアル吹き出しメッセージ
  dismissTutorialMessage: () => void;

  // AI speed (slow/normal/fast) — game-wide playback speed for AI animation
  aiSpeed: AISpeed;
  setAiSpeed: (speed: AISpeed) => void;
  cycleAiSpeed: () => void;

  // Card picker mode (dice 2/12) — legacy
  cardPickerMode: { cards: EventCard[]; canRedraw: boolean } | null;

  // Gamble card mode (dice 2/12) — new system
  gambleCard: GambleCard | null;
  gambleStage: 'reveal' | 'rolling' | 'result' | null;
  gambleDiceRoll: number | null;
  gambleResult: GambleResolveResult | null;
  resolveGamble: (diceRoll: number) => void;
  dismissGamble: () => void;

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

  // AI turn
  isPlayingAI: boolean;
  aiActionQueue: AIAction[];
  currentAIAction: AIAction | null;

  // Handoff (local multiplayer)
  handoffPlayerIndex: number | null;

  // Ports
  ports: Port[];

  // Dynamic map rows (for variable board sizes)
  mapRows: number[] | undefined;

  // Dice animation
  diceAnimationStep: 0 | 1 | 2 | 3 | 4;

  // Event resource pick mode
  resourcePickMode: { remaining: number; eventTitle: string } | null;
  eventEffectPreview: string | null;

  // Gold dice
  usedGoldDice: boolean;
  sevensRolledCount: number;

  // Quiz
  currentQuiz: QuizQuestion | null;
  quizResult: 'correct' | 'incorrect' | 'timeout' | null;
  quizResourcePickRemaining: number;
  quizCorrectCount: number;
  turnTimerPausedForQuiz: boolean;

  // Turn timer
  timerEnabled: boolean;
  turnTimerActive: boolean;
  turnTimeRemaining: number;

  // Tracking
  wasLastPlaceOnce: boolean;

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

  // Stage mode
  initStageGame: (stageId: number) => void;
  checkStageClear: () => void;

  // Card picker
  cardPickerSelect: (card: EventCard) => void;
  cardPickerRedraw: () => void;
  cardPickerSkip: () => void;

  // Gold dice
  doForceSevenDice: () => void;

  // Quiz
  handleQuizAnswer: (selectedIndex: number) => void;
  handleQuizTimeout: () => void;
  pickQuizReward: (resource: ResourceType) => void;
  dismissQuiz: () => void;

  // Turn timer
  tickTurnTimer: () => void;
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

  tradeBlocked: false,
  tempVP: [],
  peaceTreatyTurns: 0,
  blockedSettlementId: null,

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

  stageMode: null,
  stageClearStars: 0,
  tradeCount: 0,
  tutorialMessage: null,
  cardPickerMode: null,
  gambleCard: null,
  gambleStage: null,
  gambleDiceRoll: null,
  gambleResult: null,
  aiSpeed: loadAiSpeed(),

  ports: [],
  mapRows: undefined,
  diceAnimationStep: 0,
  resourcePickMode: null,
  eventEffectPreview: null,
  usedGoldDice: false,
  sevensRolledCount: 0,
  currentQuiz: null,
  quizResult: null,
  quizResourcePickRemaining: 0,
  quizCorrectCount: 0,
  turnTimerPausedForQuiz: false,
  timerEnabled: false,
  turnTimerActive: false,
  turnTimeRemaining: TURN_TIMER_SECONDS,
  wasLastPlaceOnce: false,

  // =============================================
  // INIT GAME
  // =============================================
  initGame: (slots, difficulty) => {
    const tiles = generateMap();
    const { vertices, edges } = generateVerticesAndEdges(tiles);
    const ports = generatePorts(edges);

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
      ports,
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
    clearDiceAnimationTimers();

    const isSingleDice = state.stageMode?.diceCount === 1;
    const dice: [number, number] = isSingleDice
      ? [rollSingleDice(), 0]
      : rollDice();
    const total = isSingleDice ? dice[0] : dice[0] + dice[1];
    const currentPlayer = state.players[state.currentPlayerIndex];
    const isHumanSeven = total === 7 && !currentPlayer.isAI;

    const diceText = isSingleDice
      ? `🎲 ${dice[0]}`
      : `🎲 ${dice[0]} + ${dice[1]} = ${total}`;
    const logs: GameLogEntry[] = [
      generateGameLog(`${currentPlayer.name}がサイコロを振った！ ${diceText}`, 'info', currentPlayer.id),
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

    // ===== Lucky 7: 全員全資源+1 =====
    if (total === 7) {
      const allRes: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
      newPlayers.forEach(p => {
        allRes.forEach(res => { p.resources[res] += 1; });
        // 1人につき1つの代表popup（rubber）— DiceResultZoomで全資源詳細を表示
        resourceGainPopups.push({
          playerId: p.id,
          playerName: p.name,
          playerFlag: p.flagEmoji,
          playerColor: p.color,
          resource: 'rubber',
          amount: 1,
        });
      });
      logs.push(generateGameLog(`🎉 ラッキー7！全プレイヤーが全資源+1！`, 'resource', currentPlayer.id));
    } else if (gains.length === 0) {
      logs.push(generateGameLog(`出目${total}では誰も資源をもらえなかった。`, 'info'));
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
      diceAnimationTimers.push(setTimeout(() => {
        set({ diceAnimationStep: 4 as 0 | 1 | 2 | 3 | 4, showResourceGains: true });
        if (get().stageMode) get().checkStageClear();
      }, 500));
    } else {
      // Step 2: Tile highlight (after 500ms)
      diceAnimationTimers.push(setTimeout(() => {
        set({ diceAnimationStep: 2 as 0 | 1 | 2 | 3 | 4, highlightedTileIds: matchingTileIds });
      }, 500));

      // Step 3: Flag bounce on settlements (after 1000ms)
      diceAnimationTimers.push(setTimeout(() => {
        set({ diceAnimationStep: 3 as 0 | 1 | 2 | 3 | 4 });
      }, 1000));

      // Step 4: Resource summary screen (after 1500ms)
      diceAnimationTimers.push(setTimeout(() => {
        set({ diceAnimationStep: 4 as 0 | 1 | 2 | 3 | 4, showResourceGains: true });
        // Check stage clear after resources distributed (for resource_count condition)
        if (get().stageMode) get().checkStageClear();
      }, 1500));
    }
  },

  // =============================================
  // FORCE SEVEN DICE (金4枚消費で7確定)
  // =============================================
  doForceSevenDice: () => {
    const state = get();
    if (state.phase !== 'rolling') return;
    if (state.usedGoldDice) return;
    clearDiceAnimationTimers();
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
      players: updatedPlayers,
      gameLog: [...state.gameLog, ...logs],
      highlightedTileIds: [],
      showResourceGains: true,
      resourceGains: resourceGainPopups,
      pendingEvent: null,
    });

    diceAnimationTimers.push(setTimeout(() => {
      set({ diceAnimationStep: 4 as 0 | 1 | 2 | 3 | 4, showResourceGains: true });
    }, 500));
  },

  // =============================================
  // DISMISS RESOURCE GAINS
  // =============================================
  dismissResourceGains: () => {
    clearDiceAnimationTimers();
    const state = get();
    const diceTotal = state.diceResult ? state.diceResult[0] + state.diceResult[1] : 0;

    // 7 → quiz only (no event card)
    if (diceTotal === 7) {
      const currentPlayer = state.players[state.currentPlayerIndex];
      // Trigger quiz for human player on 7 (if quiz pool is available)
      const quizPool: QuizQuestion[] = QUIZ_QUESTIONS;
      if (currentPlayer && !currentPlayer.isAI && quizPool.length > 0) {
        const q = quizPool[Math.floor(Math.random() * quizPool.length)];
        set({
          showResourceGains: false,
          highlightedTileIds: [],
          diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
          phase: 'quiz',
          currentQuiz: { ...q, id: genId() },
          quizResult: null,
          quizResourcePickRemaining: 0,
          turnTimerPausedForQuiz: true,
        });
        return;
      }
      set({
        showResourceGains: false,
        highlightedTileIds: [],
        diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
      });
      return;
    }

    // Pending event from previous turn
    if (state.pendingEvent) {
      set({
        showResourceGains: false,
        highlightedTileIds: [],
        diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
        phase: 'event',
        currentEvent: state.pendingEvent,
        pendingEvent: null,
      });
      return;
    }

    // 2 or 12 → ギャンブルカード1枚引く
    if (diceTotal === 2 || diceTotal === 12) {
      const card = pickRandomGambleCard();
      set({
        showResourceGains: false,
        highlightedTileIds: [],
        diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
        phase: 'gamble',
        gambleCard: card,
        gambleStage: 'reveal',
        gambleDiceRoll: null,
        gambleResult: null,
      });
      return;
    }

    // Normal roll (3-6, 8-11) → just close the popup
    set({
      showResourceGains: false,
      highlightedTileIds: [],
      diceAnimationStep: 0 as 0 | 1 | 2 | 3 | 4,
    });
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

      // Check win (stage or normal)
      if (state.stageMode) {
        get().checkStageClear();
      } else if (updatedPlayer.victoryPoints >= WINNING_SCORE[state.difficulty]) {
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

      // Check stage clear after road build
      if (state.stageMode) {
        get().checkStageClear();
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
        gameLog: [...state.gameLog, ...logs],
      });

      // Check win (stage or normal)
      if (state.stageMode) {
        get().checkStageClear();
      } else if (updatedPlayer.victoryPoints >= WINNING_SCORE[state.difficulty]) {
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
    const rate = getTradeRate(player.id, give, state.settlements, state.ports || []);
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
    const recvName = receive === 'rubber' ? 'ゴム' : receive === 'oil' ? '石油' : receive === 'gold' ? '金' : '食料';
    set({
      players: newPlayers,
      tradeCount: state.tradeCount + 1,
      gameLog: [...state.gameLog, generateGameLog(
        `${player.name}が${giveName}${rate}つを${recvName}1つに交換！ (レート ${rate}:1)`,
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
    // Quiz is now standalone (event cards trigger on 2/12, not 7).
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
    clearDiceAnimationTimers();
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

        if (total === 7) {
          // Lucky 7: ALL players gain +1 of every resource
          const allRes: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
          simPlayers.forEach(p => {
            p.resources.rubber += 1;
            p.resources.oil += 1;
            p.resources.gold += 1;
            p.resources.food += 1;
          });
          // Lucky 7 log for AI
          logs.push(generateGameLog(`🎲7！全プレイヤーが全資源+1！`, 'resource', aiP.id));
        }

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

        // ----- 2 or 12 → draw 5 cards, AI picks best (positive priority) -----
        if (total === 2 || total === 12) {
          const shuffledCards = [...EVENT_CARDS].sort(() => Math.random() - 0.5).slice(0, 5);
          const priorityOrder: EventCard['category'][] = ['positive', 'special', 'negative'];
          const sortedPicks = [...shuffledCards].sort((a, b) =>
            priorityOrder.indexOf(a.category) - priorityOrder.indexOf(b.category)
          );
          const aiCard: EventCard = { ...sortedPicks[0], id: genId() };
          const aiCtx: EffectContext = {
            players: simPlayers,
            currentPlayerId: aiP.id,
            settlements: simSettlements,
            roads: simRoads,
            edges: state.edges.map(e => ({ id: e.id, v1: e.vertexIds[0], v2: e.vertexIds[1] })),
            vertices: state.vertices.map(v => ({ id: v.id, x: v.x, y: v.y })),
          };
          const aiResult = applyEventEffect(aiCard, aiCtx);
          if (aiResult.players) {
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
          // For requiresChoice cards, give the AI extra random resources
          if (aiResult.requiresChoice === 'pick_resource' && aiResult.choiceCount) {
            const cardAllRes: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
            const sorted = [...cardAllRes].sort((a, b) => aiP.resources[a] - aiP.resources[b]);
            for (let i = 0; i < aiResult.choiceCount; i++) {
              aiP.resources[sorted[i % sorted.length]] += 1;
            }
          }
          logs.push(generateGameLog(`🎴 運命のカード (出目${total}): ${aiCard.icon} ${aiCard.title}`, 'event', aiP.id));
          aiActions.push({
            type: 'event_card',
            playerId: aiP.id,
            playerName: aiP.countryName,
            playerFlag: aiP.flagEmoji,
            playerColor: aiP.color,
            eventCard: aiCard,
          });
        }

        // AI build actions
        const aiActs = aiTurn(aiP, state.tiles, state.vertices, state.edges, simSettlements, simRoads, state.difficulty);
        aiActs.forEach(a => {
          if (a.type === 'pass') {
            logs.push(generateGameLog(`${aiP.name}はパスした`, 'info', aiP.id));
            return;
          }
          if (a.type === 'trade') {
            if (a.tradeFrom && a.tradeTo) {
              const tradeRate = 4; // default 4:1 trade
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

    // ===== PERF FIX =====
    // 過去はアクションごとに players/settlements/roads を毎回更新していて、
    // 接続している全コンポーネント（OpponentBar/HexMap/GameLog 等）が
    // 1ターンあたり数十回再レンダリングされてフリーズしていた。
    //
    // 修正: 中間アニメーション中は UI 用 state（currentAIAction/diceResult/
    // highlightedTileIds/resourceGains）だけを更新する。
    // players/settlements/roads は AI ターン終了時に _finalSimPlayers から
    // 1回だけバッチで上書き（上の queue.length===0 ブロック参照）。
    // ===================

    if (action.type === 'resource_gain' && action.resource && action.resourceAmount) {
      set({
        currentAIAction: action,
        aiActionQueue: queue,
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
    } else if (action.type === 'turn_start' || action.type === 'turn_end') {
      set({
        currentAIAction: action,
        aiActionQueue: queue,
        highlightedTileIds: [],
      });
    } else if (
      action.type === 'build_settlement' ||
      action.type === 'build_road' ||
      action.type === 'upgrade_city'
    ) {
      // 建設系: 視覚的なハイライトクリアのみ。実際の盤面更新はターン終了時バッチ。
      set({
        currentAIAction: action,
        aiActionQueue: queue,
        highlightedTileIds: [],
      });
    } else {
      // dice_gains / lucky_seven / ai_quiz / event_card / その他: UI のみ更新
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

  // =============================================
  // CARD PICKER (5枚選択モード)
  // =============================================
  cardPickerSelect: (card) => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    set({
      cardPickerMode: null,
      phase: 'event',
      currentEvent: card,
      gameLog: [
        ...state.gameLog,
        generateGameLog(`🎴 運命のカード: ${card.icon} ${card.title}`, 'event', player.id),
      ],
    });
  },

  cardPickerRedraw: () => {
    const state = get();
    if (!state.cardPickerMode?.canRedraw) return;
    const shuffled = [...EVENT_CARDS].sort(() => Math.random() - 0.5);
    const newCards: EventCard[] = shuffled.slice(0, 5).map(c => ({ ...c, id: genId() }));
    set({ cardPickerMode: { cards: newCards, canRedraw: false } });
  },

  cardPickerSkip: () => {
    const state = get();
    const randomCard: EventCard = { ...EVENT_CARDS[Math.floor(Math.random() * EVENT_CARDS.length)], id: genId() };
    const player = state.players[state.currentPlayerIndex];
    set({
      cardPickerMode: null,
      phase: 'event',
      currentEvent: randomCard,
      gameLog: [
        ...state.gameLog,
        generateGameLog(`🎴 運命のカード（スキップ）: ${randomCard.icon} ${randomCard.title}`, 'event', player.id),
      ],
    });
  },

  dismissTutorialMessage: () => set({ tutorialMessage: null }),

  // =============================================
  // GAMBLE CARD (2 or 12)
  // =============================================
  resolveGamble: (diceRoll) => {
    const state = get();
    const card = state.gambleCard;
    if (!card) return;
    const player = state.players[state.currentPlayerIndex];
    const ctx = {
      playerId: player.id,
      players: state.players,
      settlements: state.settlements,
      roads: state.roads,
    };
    const result = card.resolve(diceRoll, ctx);

    // Apply changes
    const patch: Partial<GameStore> = {
      gambleResult: result,
      gambleStage: 'result',
      gambleDiceRoll: diceRoll,
    };
    if (result.changes.players) patch.players = result.changes.players;
    if (result.changes.settlements) patch.settlements = result.changes.settlements;
    if (result.changes.roads) patch.roads = result.changes.roads;

    // Free road auto-build
    if (result.buildFreeRoads && result.buildFreeRoads > 0) {
      const newRoads = [...(result.changes.roads || state.roads)];
      const tempSettlements = result.changes.settlements || state.settlements;
      let placed = 0;
      for (let i = 0; i < result.buildFreeRoads; i++) {
        const validEdges = getValidRoadEdges(
          player.id, state.edges, state.vertices, tempSettlements, newRoads, false
        );
        if (validEdges.length === 0) break;
        // Pick random valid edge
        const eId = validEdges[Math.floor(Math.random() * validEdges.length)];
        newRoads.push({ edgeId: eId, playerId: player.id });
        placed++;
      }
      patch.roads = newRoads;
      result.message += `（${placed}本配置）`;
    }

    patch.gameLog = [
      ...state.gameLog,
      generateGameLog(`🎴 ${card.icon} ${card.title}: ${result.message}`, 'event', player.id),
    ];

    set(patch);
  },

  dismissGamble: () => {
    set({
      gambleCard: null,
      gambleStage: null,
      gambleDiceRoll: null,
      gambleResult: null,
      phase: 'action',
    });
  },

  setAiSpeed: (speed) => {
    saveAiSpeed(speed);
    set({ aiSpeed: speed });
  },
  cycleAiSpeed: () => {
    const cur = get().aiSpeed;
    const next: AISpeed = cur === 'slow' ? 'normal' : cur === 'normal' ? 'fast' : 'slow';
    saveAiSpeed(next);
    set({ aiSpeed: next });
  },

  // =============================================
  // STAGE MODE
  // =============================================
  initStageGame: (stageId) => {
    const stage = getStageById(stageId);
    if (!stage) return;

    // Generate map based on stage type
    const isLarge = stage.mapSize === 'large';
    const finalTiles = isLarge
      ? generateLargeMap(stage.mapRows)
      : stage.diceCount === 1
        ? generate1d6Map()
        : generateMap();
    const { vertices, edges } = generateVerticesAndEdges(finalTiles, isLarge ? stage.mapRows : undefined);
    const stagePorts = stage.specialRules.enablePorts ? generatePorts(edges) : [];

    const humanPlayer = createPlayer('プレイヤー', 0, false, true);
    const aiPlayers = stage.aiSlots.map((slot) =>
      createPlayer(
        PLAYER_COLORS[slot.countryIndex % PLAYER_COLORS.length].countryName,
        slot.countryIndex,
        true,
        false,
      )
    );
    const players = [humanPlayer, ...aiPlayers];

    if (stage.specialRules.resourceHalved) {
      for (const p of players) {
        for (const key of Object.keys(p.resources) as (keyof typeof p.resources)[]) {
          p.resources[key] = Math.floor(p.resources[key] / 2);
        }
      }
    }

    // Pre-place settlements for tutorial stages
    const settlements: Settlement[] = [];
    const roads: Road[] = [];
    if (stage.preplacedSettlements && stage.preplacedSettlements > 0) {
      // Pick valid vertices for the human player (prefer vertices touching multiple resource tiles)
      const validVerts = vertices
        .filter(v => v.adjacentTileIds.some(tid => {
          const tile = finalTiles.find(t => t.id === tid);
          return tile && tile.type !== 'sea' && tile.type !== 'desert';
        }))
        .sort((a, b) => b.adjacentTileIds.length - a.adjacentTileIds.length);

      for (let i = 0; i < stage.preplacedSettlements && i < validVerts.length; i++) {
        settlements.push({
          vertexId: validVerts[i].id,
          playerId: humanPlayer.id,
          level: 'settlement' as const,
        });
        // Give +1 VP for each settlement
        humanPlayer.victoryPoints += 1;
      }
    }

    const logs: GameLogEntry[] = [
      generateGameLog(`🗺️ ステージ${stage.id}: ${stage.title}`, 'system'),
      generateGameLog(stage.storyText, 'system'),
    ];

    set({
      screen: 'game',
      stageMode: { stageId, specialRules: stage.specialRules, diceCount: stage.diceCount },
      stageClearStars: 0,
      tradeCount: 0,
      cardPickerMode: null,
      players,
      tiles: finalTiles,
      vertices,
      edges,
      settlements,
      roads,
      currentPlayerIndex: 0,
      currentTurn: 1,
      maxTurns: stage.maxTurns,
      phase: stage.specialRules.skipSetupPhase ? 'rolling' : 'setup',
      diceResult: null,
      difficulty: stage.difficulty,
      gameLog: logs,
      currentEvent: null,
      pendingEvent: null,
      winner: null,
      longestRoadPlayerId: null,
      tradeBlocked: false,
      tempVP: [],
      peaceTreatyTurns: 0,
      blockedSettlementId: null,
      setupPhase: stage.specialRules.skipSetupPhase ? null : {
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
      mapRows: isLarge ? stage.mapRows : undefined,
      tutorialMessage: stage.tutorialMessage ?? null,
      ports: stagePorts,
    });
  },

  checkStageClear: () => {
    const state = get();
    if (!state.stageMode) return;

    const stage = getStageById(state.stageMode.stageId);
    if (!stage) return;

    const human = state.players.find(p => p.isHuman);
    if (!human) return;

    const c = stage.clearCondition;
    let cleared = false;

    switch (c.type) {
      case 'vp': {
        if (human.victoryPoints >= c.value) {
          if (c.beforeAI) {
            const aiReached = state.players.some(p => p.isAI && p.victoryPoints >= c.value);
            cleared = !aiReached;
          } else {
            cleared = true;
          }
        }
        // Also check minTrades if specified
        if (cleared && c.minTrades && state.tradeCount < c.minTrades) {
          cleared = false;
        }
        break;
      }
      case 'resource_count': {
        const total = Object.values(human.resources).reduce((sum, v) => sum + v, 0);
        cleared = total >= c.value;
        break;
      }
      case 'road_count': {
        const count = state.roads.filter(r => r.playerId === human.id).length;
        cleared = count >= c.value;
        break;
      }
      case 'settlement_count': {
        const count = state.settlements.filter(s => s.playerId === human.id).length;
        cleared = count >= c.value;
        break;
      }
      case 'city_count': {
        const cityCount = state.settlements.filter(s => s.playerId === human.id && s.level === 'city').length;
        cleared = cityCount >= c.value;
        if (cleared && c.minVP && human.victoryPoints < c.minVP) {
          cleared = false;
        }
        break;
      }
    }

    if (cleared) {
      // Star calculation: percentage of maxTurns
      const star2Limit = Math.floor(stage.maxTurns * stage.starConditions.star2Pct);
      const star3Limit = Math.floor(stage.maxTurns * stage.starConditions.star3Pct);

      let stars = 1;
      if (state.currentTurn <= star2Limit) {
        stars = 2;
      }
      if (state.currentTurn <= star3Limit) {
        stars = 3;
      }

      updateStageResult(stage.id, stars, state.currentTurn);
      set({ stageClearStars: stars, screen: 'stage_clear' });
    }
  },

  // Legacy compatibility
  selectTile: (tileId: number) => {},
}));
