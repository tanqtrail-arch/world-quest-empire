// ===== Zustand Game Store =====
import { create } from 'zustand';
import {
  type GameState, type GamePhase, type Player, type GameTile,
  type ResourceType, type EventCard, type Difficulty, type GameLogEntry,
  type StructureType,
} from './gameTypes';
import {
  generateMap, createPlayer, rollDice, distributeResources,
  buildStructure, upgradeToCity, drawEventCard, shouldTriggerEvent,
  applyEvent, checkWin, createLog, aiTurn, canAfford, genId,
} from './gameLogic';
import { BUILD_COSTS, PLAYER_COLORS } from './gameTypes';

// Resource gain notification
export interface ResourceGain {
  playerName: string;
  resource: ResourceType;
  amount: number;
  tileId: number;
}

// AI Action for staged animation
export interface AIAction {
  type: 'turn_start' | 'dice_roll' | 'resource_gain' | 'no_resource' | 'build' | 'upgrade' | 'turn_end';
  playerId: string;
  playerName: string;
  playerFlag: string;
  playerColor: string;
  // dice
  dice?: [number, number];
  diceTotal?: number;
  // resource
  resource?: ResourceType;
  resourceAmount?: number;
  // build
  buildType?: string;
  // highlighted tiles
  highlightTileIds?: number[];
}

interface GameStore extends GameState {
  // Navigation
  screen: 'title' | 'create' | 'join' | 'rules' | 'game' | 'result';
  setScreen: (screen: GameStore['screen']) => void;

  // Tile interaction
  selectedTileId: number | null;
  buildMode: StructureType | null;
  highlightedTileIds: number[];
  resourceGains: ResourceGain[];
  showResourceGains: boolean;
  pendingEvent: EventCard | null;

  // AI Turn Animation
  aiActionQueue: AIAction[];
  currentAIAction: AIAction | null;
  isPlayingAI: boolean;

  // Game Setup
  initGame: (playerName: string, playerCount: number, difficulty: Difficulty, selectedCountryIndex?: number) => void;

  // Game Actions
  doRollDice: () => void;
  doBuild: (tileId: number, type: StructureType) => void;
  doUpgrade: (tileId: number) => void;
  doTrade: (give: ResourceType, receive: ResourceType) => void;
  doExpand: (tileId: number) => void;
  doEndTurn: () => void;
  resolveEvent: () => void;
  selectResourceForEvent: (resource: ResourceType) => void;

  // Tile interaction actions
  selectTile: (tileId: number) => void;
  setBuildMode: (mode: StructureType | null) => void;
  clearSelection: () => void;
  dismissResourceGains: () => void;

  // AI animation actions
  playNextAIAction: () => void;
  clearAIAction: () => void;

  // Helpers
  getCurrentPlayer: () => Player | undefined;
  addLog: (message: string, type: GameLogEntry['type'], playerId?: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  screen: 'title',
  roomId: '',
  players: [],
  tiles: [],
  currentPlayerIndex: 0,
  currentTurn: 1,
  maxTurns: 15,
  phase: 'rolling',
  diceResult: null,
  difficulty: 'normal',
  gameLog: [],
  currentEvent: null,
  winner: null,

  // Tile interaction state
  selectedTileId: null,
  buildMode: null,
  highlightedTileIds: [],
  resourceGains: [],
  showResourceGains: false,
  pendingEvent: null as EventCard | null,

  // AI animation state
  aiActionQueue: [],
  currentAIAction: null,
  isPlayingAI: false,

  setScreen: (screen) => set({ screen }),

  // Tile interaction actions
  selectTile: (tileId) => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    if (!player || state.isPlayingAI) return;

    if (state.buildMode && state.phase === 'action') {
      const tile = state.tiles.find(t => t.id === tileId);
      if (!tile) return;

      if (state.buildMode === 'city') {
        const hasSettlement = tile.structures.some(s => s.playerId === player.id && s.type === 'settlement');
        if (hasSettlement) {
          get().doUpgrade(tileId);
          set({ buildMode: null, selectedTileId: null, highlightedTileIds: [] });
        }
      } else if (state.buildMode === 'ship') {
        get().doBuild(tileId, 'ship');
        set({ buildMode: null, selectedTileId: null, highlightedTileIds: [] });
      } else {
        const alreadyHas = tile.structures.some(s => s.playerId === player.id);
        if (!alreadyHas && tile.type !== 'sea') {
          get().doBuild(tileId, 'settlement');
          set({ buildMode: null, selectedTileId: null, highlightedTileIds: [] });
        }
      }
      return;
    }

    set({ selectedTileId: state.selectedTileId === tileId ? null : tileId });
  },

  setBuildMode: (mode) => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    if (!player) return;

    if (!mode) {
      set({ buildMode: null, highlightedTileIds: [], selectedTileId: null });
      return;
    }

    let buildableTileIds: number[] = [];
    if (mode === 'settlement') {
      buildableTileIds = state.tiles
        .filter(t => t.type !== 'sea' && !t.structures.some(s => s.playerId === player.id))
        .map(t => t.id);
    } else if (mode === 'city') {
      buildableTileIds = state.tiles
        .filter(t => t.structures.some(s => s.playerId === player.id && s.type === 'settlement'))
        .map(t => t.id);
    } else if (mode === 'ship') {
      buildableTileIds = state.tiles
        .filter(t => t.type === 'sea' && !t.structures.some(s => s.playerId === player.id))
        .map(t => t.id);
      if (buildableTileIds.length === 0) {
        buildableTileIds = state.tiles
          .filter(t => !t.structures.some(s => s.playerId === player.id))
          .map(t => t.id);
      }
    }

    set({ buildMode: mode, highlightedTileIds: buildableTileIds, selectedTileId: null });
  },

  clearSelection: () => set({ selectedTileId: null, buildMode: null, highlightedTileIds: [] }),

  dismissResourceGains: () => {
    const state = get();
    if (state.pendingEvent) {
      // Show the pending event after DiceResultZoom is dismissed
      set({
        showResourceGains: false,
        resourceGains: [],
        highlightedTileIds: [],
        phase: 'event',
        currentEvent: state.pendingEvent,
        pendingEvent: null,
      });
    } else {
      set({ showResourceGains: false, resourceGains: [], highlightedTileIds: [] });
    }
  },

  // AI animation actions
  playNextAIAction: () => {
    const state = get();
    const queue = [...state.aiActionQueue];
    if (queue.length === 0) {
      // All AI actions done, return to human player
      set({
        currentAIAction: null,
        isPlayingAI: false,
        aiActionQueue: [],
        highlightedTileIds: [],
      });
      return;
    }

    const next = queue.shift()!;
    set({
      currentAIAction: next,
      aiActionQueue: queue,
      highlightedTileIds: next.highlightTileIds || [],
    });
  },

  clearAIAction: () => {
    set({ currentAIAction: null, highlightedTileIds: [] });
  },

  initGame: (playerName, playerCount, difficulty, selectedCountryIndex = 0) => {
    const tiles = generateMap();
    const players: Player[] = [];

    players.push(createPlayer(playerName, selectedCountryIndex, false));

    // AI players use remaining country indices
    const allIndices = [0, 1, 2, 3, 4, 5].filter(i => i !== selectedCountryIndex);
    for (let i = 1; i < playerCount; i++) {
      const aiIndex = allIndices[(i - 1) % allIndices.length];
      players.push(createPlayer(PLAYER_COLORS[aiIndex]?.countryName || `AI${i}`, aiIndex, true));
    }

    const availableTiles = tiles.filter(t => t.type !== 'sea');
    const shuffled = [...availableTiles].sort(() => Math.random() - 0.5);
    
    players.forEach((player, idx) => {
      for (let s = 0; s < 2; s++) {
        const tileIdx = idx * 2 + s;
        if (tileIdx < shuffled.length) {
          const tile = shuffled[tileIdx];
          const structure = {
            playerId: player.id,
            type: 'settlement' as StructureType,
            vertexKey: `v${tile.id}-init-${s}`,
          };
          tile.structures.push(structure);
          player.structures.push(structure);
          player.victoryPoints += 1;
        }
      }
    });

    set({
      screen: 'game',
      roomId: genId(),
      players,
      tiles,
      currentPlayerIndex: 0,
      currentTurn: 1,
      maxTurns: difficulty === 'easy' ? 12 : difficulty === 'hard' ? 20 : 15,
      phase: 'rolling',
      diceResult: null,
      difficulty,
      gameLog: [createLog('ゲーム開始！サイコロを振ろう！', 'system')],
      currentEvent: null,
      winner: null,
      selectedTileId: null,
      buildMode: null,
      highlightedTileIds: [],
      resourceGains: [],
      showResourceGains: false,
      pendingEvent: null,
      aiActionQueue: [],
      currentAIAction: null,
      isPlayingAI: false,
    });
  },

  doRollDice: () => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    if (!player || state.phase !== 'rolling') return;

    const dice = rollDice();
    const total = dice[0] + dice[1];

    const gains = distributeResources(state.tiles, state.players, total);
    const logs: GameLogEntry[] = [
      createLog(`${player.name}がサイコロを振った！ 🎲 ${dice[0]} + ${dice[1]} = ${total}`, 'info', player.id),
    ];

    const resourceGains: ResourceGain[] = [];
    gains.forEach(g => {
      const resName = g.resource === 'rubber' ? 'ゴム' : g.resource === 'oil' ? '石油' : g.resource === 'gold' ? '金' : '食料';
      logs.push(createLog(
        `${g.player.name}が${resName}を${g.amount}つゲット！`,
        'resource',
        g.player.id
      ));
      const producingTile = state.tiles.find(t => 
        t.diceNumber === total && t.type === g.resource && 
        t.structures.some(s => s.playerId === g.player.id)
      );
      resourceGains.push({
        playerName: g.player.name,
        resource: g.resource,
        amount: g.amount,
        tileId: producingTile?.id ?? -1,
      });
    });

    const matchingTileIds = state.tiles
      .filter(t => t.diceNumber === total && t.type !== 'sea')
      .map(t => t.id);

    let event: EventCard | null = null;
    if (shouldTriggerEvent(player, total, state.difficulty)) {
      event = drawEventCard();
      logs.push(createLog(`イベント発生！「${event.title}」`, 'event', player.id));
    }

    // Always show DiceResultZoom first, then event popup after dismissal
    set({
      diceResult: dice,
      phase: 'action', // Always start in action phase to show DiceResultZoom
      currentEvent: null, // Don't show event yet, will be shown after DiceResultZoom dismissal
      pendingEvent: event, // Store event for later
      gameLog: [...state.gameLog, ...logs],
      players: [...state.players],
      highlightedTileIds: matchingTileIds,
      resourceGains,
      showResourceGains: true,
    });

    // Keep highlights visible longer so DiceResultZoom can show them
    setTimeout(() => {
      const current = get();
      if (current.diceResult && current.diceResult[0] === dice[0] && current.diceResult[1] === dice[1]) {
        // Only clear highlights if DiceResultZoom has been dismissed
        if (!current.showResourceGains) {
          set({ highlightedTileIds: [] });
        }
      }
    }, 5000);
  },

  resolveEvent: () => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    if (!player || !state.currentEvent) return;

    const result = applyEvent(player, state.currentEvent);
    const log = createLog(result, 'event', player.id);

    set({
      phase: 'action',
      currentEvent: null,
      gameLog: [...state.gameLog, log],
      players: [...state.players],
    });
  },

  selectResourceForEvent: (resource) => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    if (!player || !state.currentEvent) return;

    player.resources[resource]++;
    const resName = resource === 'rubber' ? 'ゴム' : resource === 'oil' ? '石油' : resource === 'gold' ? '金' : '食料';
    const log = createLog(
      `${player.name}が${resName}を選んだ！`,
      'resource',
      player.id
    );

    const remaining = state.currentEvent.effectValue - 1;
    if (remaining > 0) {
      set({
        currentEvent: { ...state.currentEvent, effectValue: remaining },
        gameLog: [...state.gameLog, log],
        players: [...state.players],
      });
    } else {
      set({
        phase: 'action',
        currentEvent: null,
        gameLog: [...state.gameLog, log],
        players: [...state.players],
      });
    }
  },

  doBuild: (tileId, type) => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    if (!player || state.phase !== 'action') return;

    const tile = state.tiles.find(t => t.id === tileId);
    if (!tile) return;

    if (buildStructure(player, tile, type)) {
      const typeName = type === 'settlement' ? '拠点' : type === 'city' ? '都市' : '船';
      const log = createLog(`${player.name}が${typeName}を建設した！`, 'build', player.id);

      if (checkWin(player, state.difficulty)) {
        set({
          winner: player,
          phase: 'finished',
          screen: 'result',
          gameLog: [...state.gameLog, log, createLog(`🎉 ${player.name}の勝利！`, 'system')],
          players: [...state.players],
          tiles: [...state.tiles],
        });
        return;
      }

      set({
        gameLog: [...state.gameLog, log],
        players: [...state.players],
        tiles: [...state.tiles],
        buildMode: null,
        highlightedTileIds: [],
        selectedTileId: null,
      });
    }
  },

  doUpgrade: (tileId) => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    if (!player || state.phase !== 'action') return;

    const tile = state.tiles.find(t => t.id === tileId);
    if (!tile) return;

    const structIdx = tile.structures.findIndex(
      s => s.playerId === player.id && s.type === 'settlement'
    );
    if (structIdx < 0) return;

    if (upgradeToCity(player, tile, structIdx)) {
      const log = createLog(`${player.name}が都市にアップグレードした！`, 'build', player.id);

      if (checkWin(player, state.difficulty)) {
        set({
          winner: player,
          phase: 'finished',
          screen: 'result',
          gameLog: [...state.gameLog, log, createLog(`🎉 ${player.name}の勝利！`, 'system')],
          players: [...state.players],
          tiles: [...state.tiles],
        });
        return;
      }

      set({
        gameLog: [...state.gameLog, log],
        players: [...state.players],
        tiles: [...state.tiles],
        buildMode: null,
        highlightedTileIds: [],
        selectedTileId: null,
      });
    }
  },

  doTrade: (give, receive) => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    if (!player || state.phase !== 'action') return;

    if (player.resources[give] < 3) return;

    player.resources[give] -= 3;
    player.resources[receive] += 1;

    const giveNames: Record<ResourceType, string> = { rubber: 'ゴム', oil: '石油', gold: '金', food: '食料' };
    const log = createLog(
      `${player.name}が${giveNames[give]}3つを${giveNames[receive]}1つに交換した！`,
      'trade',
      player.id
    );

    set({
      gameLog: [...state.gameLog, log],
      players: [...state.players],
    });
  },

  doExpand: (tileId) => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    if (!player || state.phase !== 'action') return;

    const tile = state.tiles.find(t => t.id === tileId);
    if (!tile || tile.type === 'sea') return;

    if (!canAfford(player, { food: 1, gold: 1 })) return;

    if (buildStructure(player, tile, 'settlement')) {
      const log = createLog(`${player.name}が海外に進出した！`, 'build', player.id);

      if (checkWin(player, state.difficulty)) {
        set({
          winner: player,
          phase: 'finished',
          screen: 'result',
          gameLog: [...state.gameLog, log, createLog(`🎉 ${player.name}の勝利！`, 'system')],
          players: [...state.players],
          tiles: [...state.tiles],
        });
        return;
      }

      set({
        gameLog: [...state.gameLog, log],
        players: [...state.players],
        tiles: [...state.tiles],
      });
    }
  },

  doEndTurn: () => {
    const state = get();
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer || state.isPlayingAI) return;

    let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    let nextTurn = state.currentTurn;

    if (nextIndex === 0) {
      nextTurn++;
    }

    if (nextTurn > state.maxTurns) {
      const winner = [...state.players].sort((a, b) => b.victoryPoints - a.victoryPoints)[0];
      set({
        winner,
        phase: 'finished',
        screen: 'result',
        gameLog: [...state.gameLog, createLog(`ゲーム終了！${winner.name}の勝利！`, 'system')],
      });
      return;
    }

    const logs: GameLogEntry[] = [
      createLog(`${currentPlayer.name}のターン終了`, 'info', currentPlayer.id),
    ];

    // Collect all AI players' actions into a queue for staged animation
    const aiActions: AIAction[] = [];
    let idx = nextIndex;
    let turn = nextTurn;
    let gameEnded = false;
    let winnerPlayer: Player | null = null;

    while (state.players[idx].isAI) {
      const aiP = state.players[idx];

      // Turn start announcement
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
      const gains = distributeResources(state.tiles, state.players, total);

      const matchingTileIds = state.tiles
        .filter(t => t.diceNumber === total && t.type !== 'sea')
        .map(t => t.id);

      // Dice roll action
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

      logs.push(createLog(`${aiP.name}がサイコロを振った！ 🎲 ${dice[0]} + ${dice[1]} = ${total}`, 'info', aiP.id));

      // Resource gains
      if (gains.length > 0) {
        gains.forEach(g => {
          const resName = g.resource === 'rubber' ? 'ゴム' : g.resource === 'oil' ? '石油' : g.resource === 'gold' ? '金' : '食料';
          logs.push(createLog(`${g.player.name}が${resName}を${g.amount}つゲット！`, 'resource', g.player.id));
          aiActions.push({
            type: 'resource_gain',
            playerId: g.player.id,
            playerName: g.player.name,
            playerFlag: aiP.flagEmoji,
            playerColor: aiP.color,
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

      // AI build/upgrade actions
      const aiActs = aiTurn(aiP, state.tiles);
      aiActs.forEach(a => {
        logs.push(createLog(a, 'build', aiP.id));
        const isBuild = a.includes('拠点');
        const isUpgrade = a.includes('都市');
        aiActions.push({
          type: isUpgrade ? 'upgrade' : 'build',
          playerId: aiP.id,
          playerName: aiP.countryName,
          playerFlag: aiP.flagEmoji,
          playerColor: aiP.color,
          buildType: isBuild ? '拠点' : isUpgrade ? '都市' : '船',
        });
      });

      // Turn end
      aiActions.push({
        type: 'turn_end',
        playerId: aiP.id,
        playerName: aiP.countryName,
        playerFlag: aiP.flagEmoji,
        playerColor: aiP.color,
      });

      // Check AI win
      if (checkWin(aiP, state.difficulty)) {
        gameEnded = true;
        winnerPlayer = aiP;
        break;
      }

      idx = (idx + 1) % state.players.length;
      if (idx === 0) {
        turn++;
        if (turn > state.maxTurns) {
          gameEnded = true;
          winnerPlayer = [...state.players].sort((a, b) => b.victoryPoints - a.victoryPoints)[0];
          break;
        }
      }

      // If we've looped back to a human player, stop
      if (!state.players[idx].isAI) break;
    }

    if (gameEnded && winnerPlayer) {
      logs.push(createLog(`${winnerPlayer.name}の勝利！`, 'system'));
      // Still play the AI animation, then show result
      set({
        phase: 'ai_turn',
        isPlayingAI: true,
        aiActionQueue: aiActions,
        currentAIAction: null,
        gameLog: [...state.gameLog, ...logs],
        players: [...state.players],
        tiles: [...state.tiles],
        winner: winnerPlayer,
        selectedTileId: null,
        buildMode: null,
        highlightedTileIds: [],
        resourceGains: [],
        showResourceGains: false,
      });
    } else {
      // After AI turns, it will be the human's turn
      const humanIndex = idx;
      const humanTurn = turn;

      logs.push(createLog(`${state.players[humanIndex].name}のターン！サイコロを振ろう！`, 'system'));

      set({
        phase: 'ai_turn',
        isPlayingAI: true,
        aiActionQueue: aiActions,
        currentAIAction: null,
        currentPlayerIndex: humanIndex,
        currentTurn: humanTurn,
        diceResult: null,
        gameLog: [...state.gameLog, ...logs],
        players: [...state.players],
        tiles: [...state.tiles],
        selectedTileId: null,
        buildMode: null,
        highlightedTileIds: [],
        resourceGains: [],
        showResourceGains: false,
      });
    }
  },

  getCurrentPlayer: () => {
    const state = get();
    return state.players[state.currentPlayerIndex];
  },

  addLog: (message, type, playerId) => {
    const state = get();
    set({ gameLog: [...state.gameLog, createLog(message, type, playerId)] });
  },
}));
