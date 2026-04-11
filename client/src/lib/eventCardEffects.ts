// ===== Event Card Effects for World Quest Empire =====
// 各effectTypeに対応する効果ハンドラを定義
// 引数は(gameState差分, playerId)で、戻り値は新しいstate差分

import type {
  Player, GameTile, Settlement, Road, Vertex, Edge,
  Resources, ResourceType, EventEffectType, EventCard,
} from './gameTypes';

// =============================================
// 共通ユーティリティ
// =============================================

const ALL_RESOURCES: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];

const RESOURCE_NAMES: Record<ResourceType, string> = {
  rubber: 'ゴム',
  oil: '石油',
  gold: '金',
  food: '食料',
};

function randomResource(): ResourceType {
  return ALL_RESOURCES[Math.floor(Math.random() * ALL_RESOURCES.length)];
}

function cloneResources(r: Resources): Resources {
  return { ...r };
}

function clonePlayers(players: Player[]): Player[] {
  return players.map(p => ({
    ...p,
    resources: cloneResources(p.resources),
  }));
}

// =============================================
// 効果の戻り値型
// =============================================

/** 即時適用可能な効果の結果 */
export interface EffectResult {
  /** 更新後のプレイヤー配列 */
  players: Player[];
  /** 更新後の拠点配列（変更がある場合） */
  settlements?: Settlement[];
  /** 更新後の道配列（変更がある場合） */
  roads?: Road[];
  /** 更新後のタイル配列（変更がある場合） */
  tiles?: GameTile[];
  /** ログに表示するメッセージ */
  message: string;
  /** VP変動（万博など） */
  vpChange?: number;
  /** 一時的な効果のメタデータ */
  temporaryEffect?: {
    type: EventEffectType;
    expiresAtTurn: number;
    targetPlayerId?: string;
    targetTileId?: number;
    targetVertexId?: string;
  };
}

/** 選択が必要な効果のコールバック定義 */
export interface ChoiceRequest {
  /** 選択の種類 */
  choiceType:
    | 'select_resources'   // 外交条約: 資源を選ぶ
    | 'select_edge'        // 鉄道開通: 道を選ぶ
    | 'select_tile'        // 新資源発見: タイルを選ぶ
    | 'select_player'      // 強制交換: プレイヤーを選ぶ
    | 'vote';              // 国民投票: 全員が投票
  /** 選択の説明文 */
  prompt: string;
  /** 選択肢の数（select_resourcesの場合） */
  count?: number;
  /** 選択可能なオプション */
  options?: string[];
}

/** 選択が必要な効果の結果 */
export interface ChoiceEffectResult {
  requiresChoice: true;
  choiceRequest: ChoiceRequest;
  /** 選択後に呼ぶコールバック */
  applyChoice: (choice: any) => EffectResult;
}

export type EventEffectOutput = EffectResult | ChoiceEffectResult;

/** 選択が必要かどうかの型ガード */
export function isChoiceRequired(result: EventEffectOutput): result is ChoiceEffectResult {
  return 'requiresChoice' in result && result.requiresChoice === true;
}

// =============================================
// ゲームステート参照用インターフェース
// =============================================

export interface GameContext {
  players: Player[];
  tiles: GameTile[];
  vertices: Vertex[];
  edges: Edge[];
  settlements: Settlement[];
  roads: Road[];
  currentTurn: number;
  currentPlayerIndex: number;
}

// =============================================
// ネガティブカード効果
// =============================================

/** 🔥 現地の反乱 - ランダム拠点1つが1ターン資源生産停止 */
function applyRebellion(ctx: GameContext, playerId: string): EffectResult {
  const players = clonePlayers(ctx.players);
  const playerSettlements = ctx.settlements.filter(s => s.playerId === playerId);

  if (playerSettlements.length === 0) {
    return { players, message: '拠点がないため反乱の影響はなかった。' };
  }

  const target = playerSettlements[Math.floor(Math.random() * playerSettlements.length)];
  const adjacentTiles = ctx.vertices
    .find(v => v.id === target.vertexId)
    ?.adjacentTileIds
    .map(id => ctx.tiles.find(t => t.id === id))
    .filter(Boolean) || [];

  const tileNames = adjacentTiles
    .filter(t => t && t.type !== 'sea' && t.type !== 'desert')
    .map(t => RESOURCE_NAMES[t!.type as ResourceType] || t!.type)
    .join('・');

  return {
    players,
    message: `現地の人々が反乱を起こした！拠点周辺（${tileNames || '不明'}）が1ターン生産停止。`,
    temporaryEffect: {
      type: 'rebellion',
      expiresAtTurn: ctx.currentTurn + 1,
      targetPlayerId: playerId,
      targetVertexId: target.vertexId,
    },
  };
}

/** 🌊 嵐で船が沈没 - ランダム資源3つ失う */
function applyStorm(ctx: GameContext, playerId: string): EffectResult {
  const players = clonePlayers(ctx.players);
  const player = players.find(p => p.id === playerId)!;
  const losses: string[] = [];

  for (let i = 0; i < 3; i++) {
    // 持っている資源からランダムに選ぶ
    const available = ALL_RESOURCES.filter(r => player.resources[r] > 0);
    if (available.length === 0) break;
    const res = available[Math.floor(Math.random() * available.length)];
    player.resources[res]--;
    losses.push(RESOURCE_NAMES[res]);
  }

  const lossText = losses.length > 0 ? losses.join('・') : 'なし';
  return {
    players,
    message: `大嵐で船が沈没！${lossText}を失った。（計${losses.length}個）`,
  };
}

/** 📉 経済恐慌 - 全プレイヤーの金が半分（切り捨て） */
function applyDepression(ctx: GameContext, _playerId: string): EffectResult {
  const players = clonePlayers(ctx.players);
  const losses: string[] = [];

  players.forEach(p => {
    const before = p.resources.gold;
    p.resources.gold = Math.floor(p.resources.gold / 2);
    const lost = before - p.resources.gold;
    if (lost > 0) {
      losses.push(`${p.name}: -${lost}`);
    }
  });

  return {
    players,
    message: `世界恐慌が発生！全プレイヤーの金が半分に。${losses.length > 0 ? `（${losses.join('、')}）` : ''}`,
  };
}

/** 🤒 疫病の流行 - 食料2つ失う */
function applyPlague(ctx: GameContext, playerId: string): EffectResult {
  const players = clonePlayers(ctx.players);
  const player = players.find(p => p.id === playerId)!;
  const loss = Math.min(player.resources.food, 2);
  player.resources.food -= loss;

  return {
    players,
    message: `疫病が流行！食料を${loss}つ失った。`,
  };
}

/** ✊ 独立運動 - 一番外側の拠点を失う（拠点1つ以下なら資源2つ失う） */
function applyIndependence(ctx: GameContext, playerId: string): EffectResult {
  const players = clonePlayers(ctx.players);
  const player = players.find(p => p.id === playerId)!;
  const playerSettlements = ctx.settlements.filter(s => s.playerId === playerId);

  if (playerSettlements.length <= 1) {
    // 拠点1つ以下: 資源2つ失う
    let lostCount = 0;
    for (let i = 0; i < 2; i++) {
      const available = ALL_RESOURCES.filter(r => player.resources[r] > 0);
      if (available.length === 0) break;
      const res = available[Math.floor(Math.random() * available.length)];
      player.resources[res]--;
      lostCount++;
    }
    return {
      players,
      message: `独立運動が起きたが、拠点が少ないため資源${lostCount}つを失った。`,
    };
  }

  // 一番外側の拠点を見つける（中心からの距離が最大のもの）
  const center = { x: 0, y: 0 };
  const vertexMap = new Map(ctx.vertices.map(v => [v.id, v]));
  let maxDist = -1;
  let outerSettlement: Settlement | null = null;

  playerSettlements.forEach(s => {
    const v = vertexMap.get(s.vertexId);
    if (v) {
      const dist = Math.sqrt(v.x * v.x + v.y * v.y);
      if (dist > maxDist) {
        maxDist = dist;
        outerSettlement = s;
      }
    }
  });

  if (!outerSettlement) {
    return { players, message: '独立運動が起きたが、影響はなかった。' };
  }

  const target: Settlement = outerSettlement;

  const newSettlements = ctx.settlements.filter(
    s => !(s.vertexId === target.vertexId && s.playerId === playerId)
  );

  // VP減少
  const vpLoss = target.level === 'city' ? 2 : 1;
  player.victoryPoints -= vpLoss;

  return {
    players,
    settlements: newSettlements,
    message: `独立運動により外側の${target.level === 'city' ? '都市' : '拠点'}を失った！（VP-${vpLoss}）`,
  };
}

/** 🚫 貿易制裁 - 次ターン交換不可 */
function applySanction(ctx: GameContext, playerId: string): EffectResult {
  const players = clonePlayers(ctx.players);

  return {
    players,
    message: '貿易制裁を受けた！次のターンは資源の交換ができない。',
    temporaryEffect: {
      type: 'sanction',
      expiresAtTurn: ctx.currentTurn + 1,
      targetPlayerId: playerId,
    },
  };
}

/** ⚔️ 国境紛争 - 自分と隣接する敵プレイヤー互いに資源1つ失う */
function applyBorderConflict(ctx: GameContext, playerId: string): EffectResult {
  const players = clonePlayers(ctx.players);
  const player = players.find(p => p.id === playerId)!;

  // 隣接プレイヤーを見つける（同じタイルに拠点を持つ他プレイヤー）
  const playerVertexIds = new Set(
    ctx.settlements.filter(s => s.playerId === playerId).map(s => s.vertexId)
  );
  const playerTileIds = new Set<number>();
  ctx.vertices.forEach(v => {
    if (playerVertexIds.has(v.id)) {
      v.adjacentTileIds.forEach(tid => playerTileIds.add(tid));
    }
  });

  const adjacentPlayerIds = new Set<string>();
  ctx.settlements.forEach(s => {
    if (s.playerId !== playerId) {
      const v = ctx.vertices.find(vv => vv.id === s.vertexId);
      if (v && v.adjacentTileIds.some(tid => playerTileIds.has(tid))) {
        adjacentPlayerIds.add(s.playerId);
      }
    }
  });

  const affectedNames: string[] = [];

  // 自分の資源を1つ失う
  const myAvailable = ALL_RESOURCES.filter(r => player.resources[r] > 0);
  if (myAvailable.length > 0) {
    const res = myAvailable[Math.floor(Math.random() * myAvailable.length)];
    player.resources[res]--;
  }

  // 隣接プレイヤーも1つ失う
  adjacentPlayerIds.forEach(pid => {
    const p = players.find(pp => pp.id === pid);
    if (p) {
      const available = ALL_RESOURCES.filter(r => p.resources[r] > 0);
      if (available.length > 0) {
        const res = available[Math.floor(Math.random() * available.length)];
        p.resources[res]--;
        affectedNames.push(p.name);
      }
    }
  });

  const msg = affectedNames.length > 0
    ? `国境紛争！${affectedNames.join('・')}と互いに資源を1つ失った。`
    : '国境紛争が起きたが、隣接するプレイヤーがいなかった。';

  return { players, message: msg };
}

// =============================================
// ポジティブカード効果
// =============================================

/** ⚡ 産業革命 - 次の建設コスト半額（端数切り上げ） */
function applyIndustrialRev(ctx: GameContext, playerId: string): EffectResult {
  const players = clonePlayers(ctx.players);

  return {
    players,
    message: '産業革命！次の建設コストが半額になる。',
    temporaryEffect: {
      type: 'industrial_rev',
      expiresAtTurn: ctx.currentTurn + 1,
      targetPlayerId: playerId,
    },
  };
}

/** 🤝 外交条約 - 好きな資源3つ獲得（選択式） */
function applyDiplomacy(ctx: GameContext, playerId: string): ChoiceEffectResult {
  return {
    requiresChoice: true,
    choiceRequest: {
      choiceType: 'select_resources',
      prompt: '外交条約成功！好きな資源を3つ選んでください。',
      count: 3,
      options: ALL_RESOURCES.map(r => r),
    },
    applyChoice: (choices: ResourceType[]) => {
      const players = clonePlayers(ctx.players);
      const player = players.find(p => p.id === playerId)!;
      const gained: string[] = [];

      choices.forEach(res => {
        if (ALL_RESOURCES.includes(res)) {
          player.resources[res]++;
          gained.push(RESOURCE_NAMES[res]);
        }
      });

      return {
        players,
        message: `外交条約で${gained.join('・')}を獲得！`,
      };
    },
  };
}

/** 🚂 鉄道開通 - 道を1本無料建設 */
function applyRailroad(ctx: GameContext, playerId: string): ChoiceEffectResult {
  return {
    requiresChoice: true,
    choiceRequest: {
      choiceType: 'select_edge',
      prompt: '鉄道開通！道を1本無料で建設できます。建設場所を選んでください。',
    },
    applyChoice: (edgeId: string) => {
      const players = clonePlayers(ctx.players);
      const newRoads = [...ctx.roads, { edgeId, playerId }];

      return {
        players,
        roads: newRoads,
        message: '鉄道が開通！道を1本無料で建設した。',
      };
    },
  };
}

/** 📦 援助物資 - 全資源+1 */
function applyAid(ctx: GameContext, playerId: string): EffectResult {
  const players = clonePlayers(ctx.players);
  const player = players.find(p => p.id === playerId)!;

  ALL_RESOURCES.forEach(r => {
    player.resources[r]++;
  });

  return {
    players,
    message: '同盟国から援助物資が届いた！全資源が1つずつ増えた。',
  };
}

/** 🏛️ 万国博覧会 - VP+1（一時的、3ターン後に消滅） */
function applyExpo(ctx: GameContext, playerId: string): EffectResult {
  const players = clonePlayers(ctx.players);
  const player = players.find(p => p.id === playerId)!;
  player.victoryPoints += 1;

  return {
    players,
    message: '万国博覧会を開催！VP+1（3ターン後に消滅）。',
    vpChange: 1,
    temporaryEffect: {
      type: 'expo',
      expiresAtTurn: ctx.currentTurn + 3,
      targetPlayerId: playerId,
    },
  };
}

/** 💡 新資源発見 - 好きなタイル1つの資源タイプを変更できる */
function applyDiscovery(ctx: GameContext, playerId: string): ChoiceEffectResult {
  const changeable = ctx.tiles.filter(
    t => t.type !== 'sea' && t.type !== 'desert'
  );

  return {
    requiresChoice: true,
    choiceRequest: {
      choiceType: 'select_tile',
      prompt: '新資源を発見！タイル1つの資源タイプを変更できます。',
      options: changeable.map(t => String(t.id)),
    },
    applyChoice: (choice: { tileId: number; newType: ResourceType }) => {
      const players = clonePlayers(ctx.players);
      const newTiles = ctx.tiles.map(t =>
        t.id === choice.tileId ? { ...t, type: choice.newType } : { ...t }
      );

      return {
        players,
        tiles: newTiles,
        message: `探検隊が新資源を発見！タイルを${RESOURCE_NAMES[choice.newType]}に変更した。`,
      };
    },
  };
}

/** 🕊️ 平和条約 - 2ターンイベント無効 */
function applyPeaceTreaty(ctx: GameContext, playerId: string): EffectResult {
  const players = clonePlayers(ctx.players);

  return {
    players,
    message: '平和条約が締結された！2ターンの間イベントが発生しない。',
    temporaryEffect: {
      type: 'peace_treaty',
      expiresAtTurn: ctx.currentTurn + 2,
      targetPlayerId: playerId,
    },
  };
}

// =============================================
// 特殊カード効果
// =============================================

/** 🗳️ 国民投票 - 全プレイヤーが投票：最多票の人が資源2つ失う */
function applyVote(ctx: GameContext, playerId: string): ChoiceEffectResult {
  const otherPlayers = ctx.players.filter(p => p.id !== playerId);

  return {
    requiresChoice: true,
    choiceRequest: {
      choiceType: 'vote',
      prompt: '国民投票！資源を失わせたいプレイヤーに投票してください。',
      options: otherPlayers.map(p => p.id),
    },
    applyChoice: (targetPlayerId: string) => {
      const players = clonePlayers(ctx.players);
      const target = players.find(p => p.id === targetPlayerId);

      if (!target) {
        return { players, message: '国民投票の結果、対象が見つからなかった。' };
      }

      let lostCount = 0;
      for (let i = 0; i < 2; i++) {
        const available = ALL_RESOURCES.filter(r => target.resources[r] > 0);
        if (available.length === 0) break;
        const res = available[Math.floor(Math.random() * available.length)];
        target.resources[res]--;
        lostCount++;
      }

      return {
        players,
        message: `国民投票の結果、${target.name}が資源${lostCount}つを失った！`,
      };
    },
  };
}

/** 🔄 強制交換 - 他プレイヤー1人と好きな資源を1つ強制交換 */
function applyForcedTrade(ctx: GameContext, playerId: string): ChoiceEffectResult {
  const otherPlayers = ctx.players.filter(p => p.id !== playerId);

  return {
    requiresChoice: true,
    choiceRequest: {
      choiceType: 'select_player',
      prompt: '不平等条約！他プレイヤーと資源を1つ強制交換します。相手と交換する資源を選んでください。',
      options: otherPlayers.map(p => p.id),
    },
    applyChoice: (choice: { targetPlayerId: string; giveResource: ResourceType; takeResource: ResourceType }) => {
      const players = clonePlayers(ctx.players);
      const player = players.find(p => p.id === playerId)!;
      const target = players.find(p => p.id === choice.targetPlayerId);

      if (!target) {
        return { players, message: '交換相手が見つからなかった。' };
      }

      // 交換実行
      if (player.resources[choice.giveResource] > 0 && target.resources[choice.takeResource] > 0) {
        player.resources[choice.giveResource]--;
        target.resources[choice.takeResource]--;
        player.resources[choice.takeResource]++;
        target.resources[choice.giveResource]++;

        return {
          players,
          message: `${target.name}と強制交換！${RESOURCE_NAMES[choice.giveResource]}を渡して${RESOURCE_NAMES[choice.takeResource]}を獲得。`,
        };
      }

      return {
        players,
        message: '交換に必要な資源が足りなかった。',
      };
    },
  };
}

/** 🏴‍☠️ 海賊出没 - 港の効果が1ターン無効＋港持ちプレイヤーは資源1つ失う */
function applyPirate(ctx: GameContext, _playerId: string): EffectResult {
  const players = clonePlayers(ctx.players);
  const affectedNames: string[] = [];

  // 海タイルに隣接する拠点を持つプレイヤー（港持ち）から資源を奪う
  const seaTileIds = new Set(
    ctx.tiles.filter(t => t.type === 'sea').map(t => t.id)
  );

  const portPlayerIds = new Set<string>();
  ctx.settlements.forEach(s => {
    const v = ctx.vertices.find(vv => vv.id === s.vertexId);
    if (v && v.adjacentTileIds.some(tid => seaTileIds.has(tid))) {
      portPlayerIds.add(s.playerId);
    }
  });

  portPlayerIds.forEach(pid => {
    const p = players.find(pp => pp.id === pid);
    if (p) {
      const available = ALL_RESOURCES.filter(r => p.resources[r] > 0);
      if (available.length > 0) {
        const res = available[Math.floor(Math.random() * available.length)];
        p.resources[res]--;
        affectedNames.push(p.name);
      }
    }
  });

  return {
    players,
    message: affectedNames.length > 0
      ? `海賊が出没！${affectedNames.join('・')}が資源を1つ失った。港の効果が1ターン無効。`
      : '海賊が出没したが、港を持つプレイヤーがいなかった。',
    temporaryEffect: {
      type: 'pirate',
      expiresAtTurn: ctx.currentTurn + 1,
    },
  };
}

// =============================================
// メインディスパッチャー
// =============================================

/** effectTypeに基づいて適切な効果ハンドラを呼び出す */
export function applyEventEffect(
  effectType: EventEffectType,
  ctx: GameContext,
  playerId: string
): EventEffectOutput {
  switch (effectType) {
    // ネガティブ
    case 'rebellion':       return applyRebellion(ctx, playerId);
    case 'storm':           return applyStorm(ctx, playerId);
    case 'depression':      return applyDepression(ctx, playerId);
    case 'plague':          return applyPlague(ctx, playerId);
    case 'independence':    return applyIndependence(ctx, playerId);
    case 'sanction':        return applySanction(ctx, playerId);
    case 'border_conflict': return applyBorderConflict(ctx, playerId);

    // ポジティブ
    case 'industrial_rev':  return applyIndustrialRev(ctx, playerId);
    case 'diplomacy':       return applyDiplomacy(ctx, playerId);
    case 'railroad':        return applyRailroad(ctx, playerId);
    case 'aid':             return applyAid(ctx, playerId);
    case 'expo':            return applyExpo(ctx, playerId);
    case 'discovery':       return applyDiscovery(ctx, playerId);
    case 'peace_treaty':    return applyPeaceTreaty(ctx, playerId);

    // 特殊
    case 'vote':            return applyVote(ctx, playerId);
    case 'forced_trade':    return applyForcedTrade(ctx, playerId);
    case 'pirate':          return applyPirate(ctx, playerId);

    // フォールバック
    default:
      return {
        players: clonePlayers(ctx.players),
        message: `不明なイベント効果: ${effectType}`,
      };
  }
}

/** イベントカードから効果を適用するショートカット */
export function applyCardEffect(
  card: EventCard,
  ctx: GameContext,
  playerId: string
): EventEffectOutput {
  return applyEventEffect(card.effectType, ctx, playerId);
}
