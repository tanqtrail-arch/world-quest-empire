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
import { BUILD_COSTS } from './gameTypes';

interface GameStore extends GameState {
  // Navigation
  screen: 'title' | 'create' | 'join' | 'rules' | 'game' | 'result';
  setScreen: (screen: GameStore['screen']) => void;

  // Game Setup
  initGame: (playerName: string, playerCount: number, difficulty: Difficulty) => void;

  // Game Actions
  doRollDice: () => void;
  doBuild: (tileId: number, type: StructureType) => void;
  doUpgrade: (tileId: number) => void;
  doTrade: (give: ResourceType, receive: ResourceType) => void;
  doExpand: (tileId: number) => void;
  doEndTurn: () => void;
  resolveEvent: () => void;
  selectResourceForEvent: (resource: ResourceType) => void;

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

  setScreen: (screen) => set({ screen }),

  initGame: (playerName, playerCount, difficulty) => {
    const tiles = generateMap();
    const players: Player[] = [];

    // Create human player
    players.push(createPlayer(playerName, 0, false));

    // Create AI players
    const aiNames = ['イギリス', 'フランス', 'ドイツ', 'アメリカ', 'イタリア'];
    for (let i = 1; i < playerCount; i++) {
      players.push(createPlayer(aiNames[i - 1], i, true));
    }

    // Place initial settlements for each player
    const availableTiles = tiles.filter(t => t.type !== 'sea');
    const shuffled = [...availableTiles].sort(() => Math.random() - 0.5);
    
    players.forEach((player, idx) => {
      // Each player gets 2 initial settlements
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
    });
  },

  doRollDice: () => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    if (!player || state.phase !== 'rolling') return;

    const dice = rollDice();
    const total = dice[0] + dice[1];

    // Distribute resources
    const gains = distributeResources(state.tiles, state.players, total);
    const logs: GameLogEntry[] = [
      createLog(`${player.name}がサイコロを振った！ 🎲 ${dice[0]} + ${dice[1]} = ${total}`, 'info', player.id),
    ];

    gains.forEach(g => {
      logs.push(createLog(
        `${g.player.name}が${g.resource === 'rubber' ? 'ゴム' : g.resource === 'oil' ? '石油' : g.resource === 'gold' ? '金' : '食料'}を${g.amount}つゲット！`,
        'resource',
        g.player.id
      ));
    });

    // Check for event
    let event: EventCard | null = null;
    if (shouldTriggerEvent(player, total, state.difficulty)) {
      event = drawEventCard();
      logs.push(createLog(`イベント発生！「${event.title}」`, 'event', player.id));
    }

    set({
      diceResult: dice,
      phase: event ? 'event' : 'action',
      currentEvent: event,
      gameLog: [...state.gameLog, ...logs],
      players: [...state.players],
    });
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
    const log = createLog(
      `${player.name}が${resource === 'rubber' ? 'ゴム' : resource === 'oil' ? '石油' : resource === 'gold' ? '金' : '食料'}を選んだ！`,
      'resource',
      player.id
    );

    // Check if we need more selections
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

      // Check win
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
      });
    }
  },

  doTrade: (give, receive) => {
    const state = get();
    const player = state.players[state.currentPlayerIndex];
    if (!player || state.phase !== 'action') return;

    // 3:1 trade ratio
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

    // Check if player has ship and can afford expand cost
    const hasShip = player.structures.some(s => s.type === 'ship');
    if (!canAfford(player, { food: 1, gold: 1 })) return;

    // Pay cost and build settlement
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
    if (!currentPlayer) return;

    let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    let nextTurn = state.currentTurn;

    if (nextIndex === 0) {
      nextTurn++;
    }

    // Check if game over by turns
    if (nextTurn > state.maxTurns) {
      // Find winner by most VP
      const winner = [...state.players].sort((a, b) => b.victoryPoints - a.victoryPoints)[0];
      set({
        winner,
        phase: 'finished',
        screen: 'result',
        gameLog: [...state.gameLog, createLog(`ゲーム終了！${winner.name}の勝利！`, 'system')],
      });
      return;
    }

    const nextPlayer = state.players[nextIndex];
    const logs: GameLogEntry[] = [
      createLog(`${currentPlayer.name}のターン終了`, 'info', currentPlayer.id),
    ];

    // If next player is AI, auto-play
    if (nextPlayer.isAI) {
      // AI rolls dice
      const dice = rollDice();
      const total = dice[0] + dice[1];
      const gains = distributeResources(state.tiles, state.players, total);

      logs.push(createLog(`${nextPlayer.name}がサイコロを振った！ 🎲 ${dice[0]} + ${dice[1]} = ${total}`, 'info', nextPlayer.id));
      gains.forEach(g => {
        const resName = g.resource === 'rubber' ? 'ゴム' : g.resource === 'oil' ? '石油' : g.resource === 'gold' ? '金' : '食料';
        logs.push(createLog(`${g.player.name}が${resName}を${g.amount}つゲット！`, 'resource', g.player.id));
      });

      // AI actions
      const aiActions = aiTurn(nextPlayer, state.tiles);
      aiActions.forEach(a => logs.push(createLog(a, 'build', nextPlayer.id)));

      // Check AI win
      if (checkWin(nextPlayer, state.difficulty)) {
        set({
          winner: nextPlayer,
          phase: 'finished',
          screen: 'result',
          currentPlayerIndex: nextIndex,
          currentTurn: nextTurn,
          diceResult: dice,
          gameLog: [...state.gameLog, ...logs, createLog(`${nextPlayer.name}の勝利！`, 'system')],
          players: [...state.players],
          tiles: [...state.tiles],
        });
        return;
      }

      // Move to next human player
      let humanIndex = (nextIndex + 1) % state.players.length;
      let humanTurn = nextTurn;
      
      // Skip through remaining AI players
      while (state.players[humanIndex].isAI && humanIndex !== 0) {
        const aiP = state.players[humanIndex];
        const aiDice = rollDice();
        const aiTotal = aiDice[0] + aiDice[1];
        distributeResources(state.tiles, state.players, aiTotal);
        logs.push(createLog(`${aiP.name}がサイコロを振った！ 🎲 ${aiDice[0]} + ${aiDice[1]} = ${aiTotal}`, 'info', aiP.id));
        
        const aiActs = aiTurn(aiP, state.tiles);
        aiActs.forEach(a => logs.push(createLog(a, 'build', aiP.id)));

        if (checkWin(aiP, state.difficulty)) {
          set({
            winner: aiP,
            phase: 'finished',
            screen: 'result',
            gameLog: [...state.gameLog, ...logs, createLog(`${aiP.name}の勝利！`, 'system')],
            players: [...state.players],
            tiles: [...state.tiles],
          });
          return;
        }

        humanIndex = (humanIndex + 1) % state.players.length;
      }

      if (humanIndex === 0) {
        humanTurn = nextTurn + 1;
        if (humanTurn > state.maxTurns) {
          const winner = [...state.players].sort((a, b) => b.victoryPoints - a.victoryPoints)[0];
          set({
            winner,
            phase: 'finished',
            screen: 'result',
            gameLog: [...state.gameLog, ...logs, createLog(`ゲーム終了！${winner.name}の勝利！`, 'system')],
          });
          return;
        }
      }

      set({
        currentPlayerIndex: humanIndex,
        currentTurn: humanTurn,
        phase: 'rolling',
        diceResult: null,
        gameLog: [...state.gameLog, ...logs, createLog(`${state.players[humanIndex].name}のターン！サイコロを振ろう！`, 'system')],
        players: [...state.players],
        tiles: [...state.tiles],
      });
    } else {
      set({
        currentPlayerIndex: nextIndex,
        currentTurn: nextTurn,
        phase: 'rolling',
        diceResult: null,
        gameLog: [...state.gameLog, ...logs],
        players: [...state.players],
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
