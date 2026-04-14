// ===== Gamble Cards (2 or 12 出目で発動) =====
// プレイヤーが2か12を出すとカード1枚を引く。needsDice=trueなら1d6で結果決定。

import type { Player, Settlement, Road, ResourceType } from './gameTypes';

export interface GambleResolveContext {
  playerId: string;
  players: Player[];
  settlements: Settlement[];
  roads: Road[];
}

export interface GambleResolveResult {
  message: string;
  changes: {
    players?: Player[];
    settlements?: Settlement[];
    roads?: Road[];
  };
  /** 「好きな資源を選ぶ」系。後で別UIで使う */
  requiresChoice?: { type: 'pick_resource'; count: number };
  /** 道3本自動建設要求 */
  buildFreeRoads?: number;
  /** 効果の種別（演出用） */
  outcome: 'positive' | 'negative' | 'neutral';
}

export interface GambleCard {
  id: number;
  title: string;
  icon: string;
  description: string;
  needsDice: boolean;
  resolve: (diceRoll: number, ctx: GambleResolveContext) => GambleResolveResult;
}

const ALL_RES: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];

function clonePlayers(players: Player[]): Player[] {
  return players.map(p => ({ ...p, resources: { ...p.resources } }));
}
function findMe(players: Player[], id: string): Player | undefined {
  return players.find(p => p.id === id);
}
function pickRandomRes(): ResourceType {
  return ALL_RES[Math.floor(Math.random() * ALL_RES.length)];
}

export const GAMBLE_CARDS: GambleCard[] = [
  // 1: 産業革命 (無条件 +2 全資源)
  {
    id: 1,
    title: '産業革命',
    icon: '⚡',
    description: '工業化の波が全資源を増やす！全資源 +2',
    needsDice: false,
    resolve: (_d, ctx) => {
      const players = clonePlayers(ctx.players);
      const me = findMe(players, ctx.playerId);
      if (me) ALL_RES.forEach(r => { me.resources[r] += 2; });
      return {
        message: '全資源 +2 を獲得！',
        changes: { players },
        outcome: 'positive',
      };
    },
  },

  // 2: 疫病 (出目分の食料を失う)
  {
    id: 2,
    title: '疫病',
    icon: '💀',
    description: '🎲を振る → 出た目の数だけ食料を失う',
    needsDice: true,
    resolve: (d, ctx) => {
      const players = clonePlayers(ctx.players);
      const me = findMe(players, ctx.playerId);
      const lost = me ? Math.min(me.resources.food, d) : 0;
      if (me) me.resources.food -= lost;
      return {
        message: `食料 -${lost}（${d}失うはずが、所持分まで）`,
        changes: { players },
        outcome: 'negative',
      };
    },
  },

  // 3: 海賊の宝 (奇数 金+3 / 偶数 何もなし)
  {
    id: 3,
    title: '海賊の宝',
    icon: '🏴‍☠️',
    description: '🎲を振る → 奇数なら金+3、偶数なら何もなし',
    needsDice: true,
    resolve: (d, ctx) => {
      const players = clonePlayers(ctx.players);
      const me = findMe(players, ctx.playerId);
      const odd = d % 2 === 1;
      if (odd && me) me.resources.gold += 3;
      return {
        message: odd ? '金 +3！' : '何も見つからなかった…',
        changes: { players },
        outcome: odd ? 'positive' : 'neutral',
      };
    },
  },

  // 4: 大嵐 (出目分のランダム資源を失う)
  {
    id: 4,
    title: '大嵐',
    icon: '🌊',
    description: '🎲を振る → 出た目の数だけランダム資源を失う',
    needsDice: true,
    resolve: (d, ctx) => {
      const players = clonePlayers(ctx.players);
      const me = findMe(players, ctx.playerId);
      let lost = 0;
      if (me) {
        for (let i = 0; i < d; i++) {
          // 持っている資源プールから1つ抜く
          const pool: ResourceType[] = [];
          ALL_RES.forEach(r => { for (let j = 0; j < me.resources[r]; j++) pool.push(r); });
          if (pool.length === 0) break;
          const lose = pool[Math.floor(Math.random() * pool.length)];
          me.resources[lose] -= 1;
          lost++;
        }
      }
      return {
        message: `ランダム資源 -${lost}`,
        changes: { players },
        outcome: 'negative',
      };
    },
  },

  // 5: 外交勝利 (奇数 +3好きな資源 / 偶数 +1好きな資源) — 選択UIは未実装、ランダム選択
  {
    id: 5,
    title: '外交勝利',
    icon: '🤝',
    description: '🎲を振る → 奇数:資源+3、偶数:資源+1',
    needsDice: true,
    resolve: (d, ctx) => {
      const players = clonePlayers(ctx.players);
      const me = findMe(players, ctx.playerId);
      const amt = d % 2 === 1 ? 3 : 1;
      const res = pickRandomRes();
      if (me) me.resources[res] += amt;
      const resName = res === 'rubber' ? 'ゴム' : res === 'oil' ? '石油' : res === 'gold' ? '金' : '食料';
      return {
        message: `${resName} +${amt}！`,
        changes: { players },
        outcome: 'positive',
      };
    },
  },

  // 6: 恐慌 (5以上 全プレイヤー金半分 / 4以下 自分だけ金-1)
  {
    id: 6,
    title: '恐慌',
    icon: '📉',
    description: '🎲を振る → 5以上:全プレイヤー金半分、4以下:自分だけ金-1',
    needsDice: true,
    resolve: (d, ctx) => {
      const players = clonePlayers(ctx.players);
      if (d >= 5) {
        players.forEach(p => { p.resources.gold = Math.floor(p.resources.gold / 2); });
        return {
          message: '全プレイヤーの金が半分に！',
          changes: { players },
          outcome: 'negative',
        };
      } else {
        const me = findMe(players, ctx.playerId);
        if (me) me.resources.gold = Math.max(0, me.resources.gold - 1);
        return {
          message: '自分だけ金 -1',
          changes: { players },
          outcome: 'negative',
        };
      }
    },
  },

  // 7: 鉄道開発 (道3本無料建設) — 自動配置
  {
    id: 7,
    title: '鉄道開発',
    icon: '🚂',
    description: '道を3本、無料で建設！',
    needsDice: false,
    resolve: (_d, _ctx) => {
      return {
        message: '道3本を無料で建設！',
        changes: {},
        buildFreeRoads: 3,
        outcome: 'positive',
      };
    },
  },

  // 8: 反乱 (奇数 拠点1失う / 偶数 拠点2失う)
  {
    id: 8,
    title: '反乱',
    icon: '✊',
    description: '🎲を振る → 奇数:拠点1失う、偶数:拠点2失う',
    needsDice: true,
    resolve: (d, ctx) => {
      const players = clonePlayers(ctx.players);
      const me = findMe(players, ctx.playerId);
      const need = d % 2 === 1 ? 1 : 2;
      // 自分の拠点 (settlement レベルのみ。都市は壊さない)
      const mine = ctx.settlements.filter(s => s.playerId === ctx.playerId && s.level === 'settlement');
      const toRemove = mine.slice(0, Math.min(need, mine.length));
      const newSettlements = ctx.settlements.filter(s => !toRemove.includes(s));
      if (me) me.victoryPoints = Math.max(0, me.victoryPoints - toRemove.length);
      return {
        message: `拠点 -${toRemove.length}（${need}失うはずが、所持分まで）`,
        changes: { players, settlements: newSettlements },
        outcome: 'negative',
      };
    },
  },

  // 9: 金鉱発見 (奇数 金+5 / 偶数 金+2)
  {
    id: 9,
    title: '金鉱発見',
    icon: '💎',
    description: '🎲を振る → 奇数:金+5、偶数:金+2',
    needsDice: true,
    resolve: (d, ctx) => {
      const players = clonePlayers(ctx.players);
      const me = findMe(players, ctx.playerId);
      const amt = d % 2 === 1 ? 5 : 2;
      if (me) me.resources.gold += amt;
      return {
        message: `金 +${amt}！`,
        changes: { players },
        outcome: 'positive',
      };
    },
  },

  // 10: 大火事 (偶数 ゴム全失 / 奇数 何もなし)
  {
    id: 10,
    title: '大火事',
    icon: '🔥',
    description: '🎲を振る → 偶数:ゴム全失、奇数:何もなし',
    needsDice: true,
    resolve: (d, ctx) => {
      const players = clonePlayers(ctx.players);
      const me = findMe(players, ctx.playerId);
      const even = d % 2 === 0;
      const lost = me ? me.resources.rubber : 0;
      if (even && me) me.resources.rubber = 0;
      return {
        message: even ? `ゴムを全て失った…（-${lost}）` : '火は広がらず無事…',
        changes: { players },
        outcome: even ? 'negative' : 'neutral',
      };
    },
  },
];

export function pickRandomGambleCard(): GambleCard {
  return GAMBLE_CARDS[Math.floor(Math.random() * GAMBLE_CARDS.length)];
}
