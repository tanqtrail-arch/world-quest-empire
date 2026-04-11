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

// =============================================
// EFFECT HANDLERS
// =============================================

export function applyRebellion(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  const player = getPlayer(players, ctx.currentPlayerId);
  const lost = loseRandomResources(player, card.effectValue);
  return { players, message: `${card.icon}${card.title}→資源を${lost}つ失った！` };
}

export function applyStorm(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  const player = getPlayer(players, ctx.currentPlayerId);
  const lost = loseRandomResources(player, 3);
  return { players, message: `${card.icon}${card.title}→資源を${lost}つ失った！` };
}

export function applyDepression(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  players.forEach(p => { p.resources.gold = Math.floor(p.resources.gold / 2); });
  return { players, message: `${card.icon}${card.title}→全プレイヤーの金が半分に！` };
}

export function applyPlague(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  const player = getPlayer(players, ctx.currentPlayerId);
  const loss = Math.min(player.resources.food, 2);
  player.resources.food -= loss;
  return { players, message: `${card.icon}${card.title}→🌾食料を${loss}つ失った` };
}

export function applyIndependence(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  const player = getPlayer(players, ctx.currentPlayerId);
  const settlements = [...ctx.settlements];
  const mySettlements = settlements.filter(
    s => s.playerId === ctx.currentPlayerId && s.level === 'settlement'
  );

  if (mySettlements.length > 1) {
    const target = mySettlements[Math.floor(Math.random() * mySettlements.length)];
    const idx = settlements.findIndex(
      s => s.vertexId === target.vertexId && s.playerId === ctx.currentPlayerId
    );
    if (idx !== -1) settlements.splice(idx, 1);
    player.victoryPoints = Math.max(0, player.victoryPoints - 1);
    return { players, settlements, message: `${card.icon}${card.title}→🏠拠点1つ失った！`, vpChange: -1 };
  } else {
    const lost = loseRandomResources(player, 2);
    return { players, message: `${card.icon}${card.title}→資源${lost}つ失った` };
  }
}

export function applySanction(card: EventCard, _ctx: EffectContext): EffectResult {
  return { message: `${card.icon}${card.title}→このターン行動できない！`, skipAction: true };
}

export function applyBorderConflict(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  const player = getPlayer(players, ctx.currentPlayerId);
  const lost = loseRandomResources(player, 1);
  return { players, message: `${card.icon}${card.title}→資源を${lost > 0 ? '1' : '0'}つ失った` };
}

export function applyIndustrialRev(card: EventCard, _ctx: EffectContext): EffectResult {
  return { message: `${card.icon}${card.title}→好きな資源を2つ選ぼう！`, requiresChoice: 'pick_resource', choiceCount: 2 };
}

export function applyDiplomacy(card: EventCard, _ctx: EffectContext): EffectResult {
  return { message: `${card.icon}${card.title}→好きな資源を3つ選ぼう！`, requiresChoice: 'pick_resource', choiceCount: 3 };
}

export function applyDiscovery(card: EventCard, _ctx: EffectContext): EffectResult {
  return { message: `${card.icon}${card.title}→好きな資源を1つ選ぼう！`, requiresChoice: 'pick_resource', choiceCount: 1 };
}

export function applyAid(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  const player = getPlayer(players, ctx.currentPlayerId);
  RESOURCES.forEach(res => { player.resources[res] += 1; });
  return { players, message: `${card.icon}${card.title}→🌿+1 🛢️+1 💰+1 🌾+1 全部もらった！` };
}

export function applyExpo(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  const player = getPlayer(players, ctx.currentPlayerId);
  player.victoryPoints += 1;
  return { players, message: `${card.icon}${card.title}→★VP+1！`, vpChange: 1 };
}

export function applyRailroad(card: EventCard, ctx: EffectContext): EffectResult {
  const roads = [...ctx.roads];
  const usedEdgeIds = new Set(roads.map(r => r.edgeId));
  const mySettlementVertices = new Set(
    ctx.settlements.filter(s => s.playerId === ctx.currentPlayerId).map(s => s.vertexId)
  );
  const myRoadVertices = new Set<string>();
  roads.filter(r => r.playerId === ctx.currentPlayerId).forEach(r => {
    const edge = ctx.edges.find(e => e.id === r.edgeId);
    if (edge) { myRoadVertices.add(edge.v1); myRoadVertices.add(edge.v2); }
  });
  const validEdges = ctx.edges.filter(e => {
    if (usedEdgeIds.has(e.id)) return false;
    return mySettlementVertices.has(e.v1) || mySettlementVertices.has(e.v2) || myRoadVertices.has(e.v1) || myRoadVertices.has(e.v2);
  });
  if (validEdges.length > 0) {
    const edge = validEdges[Math.floor(Math.random() * validEdges.length)];
    roads.push({ edgeId: edge.id, playerId: ctx.currentPlayerId });
    return { roads, message: `${card.icon}${card.title}→🛤️道を1つ無料で建設！` };
  }
  return { message: `${card.icon}${card.title}→建設できる場所がなかった` };
}

export function applyPeaceTreaty(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  const player = getPlayer(players, ctx.currentPlayerId);
  RESOURCES.forEach(res => { player.resources[res] += 1; });
  return { players, message: `${card.icon}${card.title}→平和が訪れた！全資源+1` };
}

export function applyPirate(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  const player = getPlayer(players, ctx.currentPlayerId);
  const lost = loseRandomResources(player, 1);
  return { players, message: lost > 0 ? `${card.icon}${card.title}→海賊に資源を奪われた！` : `${card.icon}${card.title}→資源がなくて助かった！` };
}

export function applyForcedTrade(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  const player = getPlayer(players, ctx.currentPlayerId);
  const others = players.filter(p => p.id !== ctx.currentPlayerId);
  if (others.length > 0) {
    const target = others[Math.floor(Math.random() * others.length)];
    const myAvail = RESOURCES.filter(r => player.resources[r] > 0);
    const theirAvail = RESOURCES.filter(r => target.resources[r] > 0);
    if (myAvail.length > 0 && theirAvail.length > 0) {
      const give = myAvail[Math.floor(Math.random() * myAvail.length)];
      const take = theirAvail[Math.floor(Math.random() * theirAvail.length)];
      player.resources[give]--; target.resources[take]--;
      player.resources[take]++; target.resources[give]++;
      return { players, message: `${card.icon}${card.title}→${target.name}と資源を交換！` };
    }
  }
  return { players, message: `${card.icon}${card.title}→交換できなかった` };
}

export function applyVote(card: EventCard, ctx: EffectContext): EffectResult {
  const players = clonePlayers(ctx.players);
  const others = players.filter(p => p.id !== ctx.currentPlayerId);
  if (others.length > 0) {
    const target = others[Math.floor(Math.random() * others.length)];
    const lost = loseRandomResources(target, 2);
    return { players, message: `${card.icon}${card.title}→${target.name}が資源${lost}つ失った！` };
  }
  return { message: `${card.icon}${card.title}→対象がいなかった` };
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
