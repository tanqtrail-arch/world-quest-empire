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
  buildCost?: Partial<Record<ResourceType, number>>;
  buildTileId?: number;
  buildVP?: number;
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
  finalSimPlayers: Player[] | null;
  finalSimTiles: GameTile[] | null;

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
  finalSimPlayers: null as Player[] | null,
  finalSimTiles: null as GameTile[] | null,

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
      // All AI actions done - apply final simulation state for structures/VP/costs
      const finalUpdate: Record<string, unknown> = {
        currentAIAction: null,
        isPlayingAI: false,
        aiActionQueue: [],
        highlightedTileIds: [],
        finalSimPlayers: null,
        finalSimTiles: null,
      };
      if (state.finalSimPlayers && state.finalSimTiles) {
        // Merge final sim state: keep resource values from current state.players
        // (since we've been applying resource_gain step by step)
        // but take structures, VP, and other build-related changes from sim
        finalUpdate.players = state.finalSimPlayers.map(simP => {
          const currentP = state.players.find(p => p.id === simP.id);
          return {
            ...simP,
            resources: currentP ? { ...currentP.resources } : { ...simP.resources },
            structures: [...simP.structures],
          };
        });
        finalUpdate.tiles = state.finalSimTiles.map(t => ({
          ...t,
          structures: [...t.structures],
        }));
      }
      set(finalUpdate as any);
      return;
    }

    const next = queue.shift()!;

    // For resource_gain actions, apply the resource change step by step
    // Since doEndTurn now uses simulated copies, the original state.players are unchanged
    // We need to actually add resources here
    if (next.type === 'resource_gain' && next.resource && next.resourceAmount) {
      const updatedPlayers = state.players.map(p => {
        if (p.id === next.playerId) {
          return {
            ...p,
            resources: {
              ...p.resources,
              [next.resource!]: p.resources[next.resource!] + next.resourceAmount!,
            },
            structures: [...p.structures],
          };
        }
        return { ...p, resources: { ...p.resources }, structures: [...p.structures] };
      });
      set({
        currentAIAction: next,
        aiActionQueue: queue,
        highlightedTileIds: next.highlightTileIds || [],
        players: updatedPlayers,
      });
    } else if (next.type === 'build' || next.type === 'upgrade') {
      // Build/upgrade actions: deep copy to reflect structure changes from simulation
      const updatedPlayers = state.players.map(p => ({
        ...p,
        resources: { ...p.resources },
        structures: [...p.structures],
      }));
      set({
        currentAIAction: next,
        aiActionQueue: queue,
        highlightedTileIds: next.highlightTileIds || [],
        players: updatedPlayers,
      });
    } else {
      set({
        currentAIAction: next,
        aiActionQueue: queue,
        highlightedTileIds: next.highlightTileIds || [],
      });
    }
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
      finalSimPlayers: null,
      finalSimTiles: null,
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

    // Create deep copies of players and tiles so mutations during pre-computation
    // don't affect the store state until playNextAIAction applies them step by step.
    const simPlayers = state.players.map(p => ({
      ...p,
      resources: { ...p.resources },
      structures: [...p.structures],
    }));
    const simTiles = state.tiles.map(t => ({
      ...t,
      structures: [...t.structures],
    }));

    while (simPlayers[idx].isAI) {
      const aiP = simPlayers[idx];

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

      // Calculate resource gains WITHOUT mutating the original state.players
      // We use simPlayers/simTiles for the simulation, but record gains as AIActions
      // so playNextAIAction can apply them step by step.
      const matchingTileIds = simTiles
        .filter(t => t.diceNumber === total && t.type !== 'sea')
        .map(t => t.id);

      // Compute gains manually (same logic as distributeResources but on simPlayers)
      const gains: { player: typeof simPlayers[0]; resource: ResourceType; amount: number }[] = [];
      simTiles.forEach(tile => {
        if (tile.diceNumber !== total || tile.type === 'sea') return;
        tile.structures.forEach(struct => {
          const player = simPlayers.find(p => p.id === struct.playerId);
          if (!player) return;
          const amount = struct.type === 'city' ? 2 : 1;
          const resource = tile.type as ResourceType;
          player.resources[resource] += amount; // mutate sim copy only
          gains.push({ player, resource, amount });
        });
      });

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
            playerFlag: g.player.flagEmoji,
            playerColor: g.player.color,
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

      // AI build/upgrade actions (use simTiles for simulation)
      const aiActs = aiTurn(aiP, simTiles);
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

      idx = (idx + 1) % simPlayers.length;
      if (idx === 0) {
        turn++;
        if (turn > state.maxTurns) {
          gameEnded = true;
          winnerPlayer = [...simPlayers].sort((a, b) => b.victoryPoints - a.victoryPoints)[0];
          break;
        }
      }

      // If we've looped back to a human player, stop
      if (!simPlayers[idx].isAI) break;
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
        finalSimPlayers: simPlayers,
        finalSimTiles: simTiles,
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
        finalSimPlayers: simPlayers,
        finalSimTiles: simTiles,
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
