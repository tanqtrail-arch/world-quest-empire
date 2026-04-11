import type { EventCard, Player, ResourceType, Settlement, Road } from './gameTypes';

// =============================================
// EVENT CARD EFFECTS - 各カードの効果ハンドラ
// =============================================

export interface EffectContext {
  players: Player[];
  currentPlayerId: string;
  settlements: Settlement[];
  roads: Road[];
  edges: Array<{ id: string; v1: string; v2: string }>;
  vertices: Array<{ id: string; x: number; y: number }>;
}

export interface EffectResult {
  players?: Player[];
  settlements?: Settlement[];
  roads?: Road[];
  message: string;
  skipAction?: boolean;
  requiresChoice?: 'pick_resource';
  choiceCount?: number;
  vpChange?: number;
}

const RESOURCES: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];

function clonePlayers(players: Player[]): Player[] {
  return players.map(p => ({ ...p, resources: { ...p.resources } }));
}

function getPlayer(players: Player[], id: string): Player {
  return players.find(p => p.id === id)!;
}

function loseRandomResources(player: Player, count: number): number {
  let lost = 0;
  for (let i = 0; i < count; i++) {
    const avail = RESOURCES.filter(r => player.resources[r] > 0);
    if (avail.length === 0) break;
    const res = avail[Math.floor(Math.random() * avail.length)];
    player.resources[res]--;
    lost++;
  }
  return lost;
}

function gainRandomResources(player: Player, count: number): void {
  for (let i = 0; i < count; i++) {
    const res = RESOURCES[Math.floor(Math.random() * RESOURCES.length)];
    player.resources[res]++;
  }
}

// =============================================
// EFFECT HANDLERS
// =============================================

// =============================================
// All handlers now apply to ALL players (not just current).
// =============================================

export function applyRebellion(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  players.forEach(p => loseRandomResources(p, card.effectValue));
  return { players, message: `${card.icon}${card.title}→全員ランダム資源-${card.effectValue}！` };
}

export function applyStorm(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  players.forEach(p => loseRandomResources(p, 3));
  return { players, message: `${card.icon}${card.title}→全員ランダム資源-3！` };
}

export function applyDepression(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  players.forEach(p => { p.resources.gold = Math.floor(p.resources.gold / 2); });
  return { players, message: `${card.icon}${card.title}→全プレイヤーの金が半分に！` };
}

export function applyPlague(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  players.forEach(p => {
    const loss = Math.min(p.resources.food, 2);
    p.resources.food -= loss;
  });
  return { players, message: `${card.icon}${card.title}→全員🌾食料-2！` };
}

export function applyIndependence(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  const settlements = [...ctx.settlements];

  // Each player loses one settlement (if >1) or 2 random resources.
  players.forEach(p => {
    const mySettlements = settlements.filter(s => s.playerId === p.id && s.level === 'settlement');
    if (mySettlements.length > 1) {
      const target = mySettlements[Math.floor(Math.random() * mySettlements.length)];
      const idx = settlements.findIndex(s => s.vertexId === target.vertexId && s.playerId === p.id);
      if (idx !== -1) settlements.splice(idx, 1);
      p.victoryPoints = Math.max(0, p.victoryPoints - 1);
    } else {
      loseRandomResources(p, 2);
    }
  });
  return { players, settlements, message: `${card.icon}${card.title}→全員🏠拠点1つ or 資源2つ失った！` };
}

export function applySanction(card: EventCard, _ctx: EffectContext): EffectResult {
  return { message: `${card.icon}${card.title}→全員このターン行動できない！`, skipAction: true };
}

export function applyBorderConflict(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  players.forEach(p => loseRandomResources(p, 1));
  return { players, message: `${card.icon}${card.title}→全員ランダム資源-1！` };
}

export function applyIndustrialRev(card: EventCard, ctx: EffectContext): EffectResult {
  // Current player picks 2 (interactive). Others receive 2 random resources.
  const players = clonePlayers(ctx.players);
  players.forEach(p => {
    if (p.id !== ctx.currentPlayerId) gainRandomResources(p, 2);
  });
  return {
    players,
    message: `${card.icon}${card.title}→全員資源+2！(あなたは好きな2つを選ぼう)`,
    requiresChoice: 'pick_resource',
    choiceCount: 2,
  };
}

export function applyDiplomacy(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  players.forEach(p => {
    if (p.id !== ctx.currentPlayerId) gainRandomResources(p, 3);
  });
  return {
    players,
    message: `${card.icon}${card.title}→全員資源+3！(あなたは好きな3つを選ぼう)`,
    requiresChoice: 'pick_resource',
    choiceCount: 3,
  };
}

export function applyDiscovery(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  players.forEach(p => {
    if (p.id !== ctx.currentPlayerId) gainRandomResources(p, 1);
  });
  return {
    players,
    message: `${card.icon}${card.title}→全員資源+1！(あなたは好きな1つを選ぼう)`,
    requiresChoice: 'pick_resource',
    choiceCount: 1,
  };
}

export function applyAid(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  players.forEach(p => {
    RESOURCES.forEach(res => { p.resources[res] += 1; });
  });
  return { players, message: `${card.icon}${card.title}→全員🌿+1 🛢️+1 💰+1 🌾+1！` };
}

export function applyExpo(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  players.forEach(p => { p.victoryPoints += 1; });
  return { players, message: `${card.icon}${card.title}→全員★VP+1！`, vpChange: 1 };
}

export function applyRailroad(card: EventCard, ctx: EffectContext): EffectResult {
  // Each player gets one free road if they have a valid spot.
  const roads = [...ctx.roads];
  const usedEdgeIds = new Set(roads.map(r => r.edgeId));

  ctx.players.forEach(p => {
    const mySettlementVertices = new Set(
      ctx.settlements.filter(s => s.playerId === p.id).map(s => s.vertexId)
    );
    const myRoadVertices = new Set<string>();
    roads.filter(r => r.playerId === p.id).forEach(r => {
      const edge = ctx.edges.find(e => e.id === r.edgeId);
      if (edge) { myRoadVertices.add(edge.v1); myRoadVertices.add(edge.v2); }
    });
    const validEdges = ctx.edges.filter(e => {
      if (usedEdgeIds.has(e.id)) return false;
      return mySettlementVertices.has(e.v1) || mySettlementVertices.has(e.v2) ||
             myRoadVertices.has(e.v1) || myRoadVertices.has(e.v2);
    });
    if (validEdges.length > 0) {
      const edge = validEdges[Math.floor(Math.random() * validEdges.length)];
      roads.push({ edgeId: edge.id, playerId: p.id });
      usedEdgeIds.add(edge.id);
    }
  });
  return { roads, message: `${card.icon}${card.title}→全員🛤️道を1つ無料で建設！` };
}

export function applyPeaceTreaty(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  players.forEach(p => {
    RESOURCES.forEach(res => { p.resources[res] += 1; });
  });
  return { players, message: `${card.icon}${card.title}→全員に平和！全資源+1` };
}

export function applyPirate(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  players.forEach(p => loseRandomResources(p, 1));
  return { players, message: `${card.icon}${card.title}→全員ランダム資源-1！` };
}

export function applyForcedTrade(card: EventCard, ctx: EffectContext): EffectResult {
  // Each player loses 1 random resource and gains 1 random resource (forced market).
  const players = clonePlayers(ctx.players);
  players.forEach(p => {
    const owned = RESOURCES.filter(r => p.resources[r] > 0);
    if (owned.length > 0) {
      const give = owned[Math.floor(Math.random() * owned.length)];
      const take = RESOURCES[Math.floor(Math.random() * RESOURCES.length)];
      p.resources[give]--;
      p.resources[take]++;
    }
  });
  return { players, message: `${card.icon}${card.title}→全員ランダム資源を1つ交換！` };
}

export function applyVote(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  players.forEach(p => loseRandomResources(p, 2));
  return { players, message: `${card.icon}${card.title}→全員ランダム資源-2！` };
}

// =============================================
// DISPATCHER
// =============================================

const EFFECT_HANDLERS: Record<string, (card: EventCard, ctx: EffectContext) => EffectResult> = {
  rebellion: applyRebellion,
  storm: applyStorm,
  depression: applyDepression,
  plague: applyPlague,
  independence: applyIndependence,
  sanction: applySanction,
  border_conflict: applyBorderConflict,
  industrial_rev: applyIndustrialRev,
  diplomacy: applyDiplomacy,
  discovery: applyDiscovery,
  aid: applyAid,
  expo: applyExpo,
  railroad: applyRailroad,
  peace_treaty: applyPeaceTreaty,
  pirate: applyPirate,
  forced_trade: applyForcedTrade,
  vote: applyVote,
};

export function applyEventEffect(card: EventCard, ctx: EffectContext): EffectResult {
  const handler = EFFECT_HANDLERS[card.effectType];
  if (handler) return handler(card, ctx);
  return { message: `${card.icon} ${card.title}→${card.description}` };
}
