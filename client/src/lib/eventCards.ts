// ===== Event Cards Data for World Quest Empire =====
// 17枚のイベントカード: ネガティブ7枚、ポジティブ7枚、特殊3枚
// 各カードは歴史的な学びのポイントを含む教育的要素を持つ

import type { EventCard, EventCategory, EventEffectType } from './gameTypes';

/** カードテンプレート型（idはランタイムで付与） */
export type EventCardTemplate = Omit<EventCard, 'id'>;

// =============================================
// ネガティブカード（7枚）
// =============================================

const NEGATIVE_CARDS: EventCardTemplate[] = [
  {
    title: '現地の反乱',
    description: 'ランダムな拠点1つが1ターン資源生産停止！現地の人々が支配に抵抗している。',
    category: 'negative',
    effectType: 'rebellion',
    icon: '🔥',
    learningPoint: '植民地では現地の人々が支配に対して何度も抵抗運動を起こしました。インドのセポイの乱やジャワの反乱などが有名です。',
    duration: 1,
  },
  {
    title: '嵐で船が沈没',
    description: '大嵐が来た！ランダムな資源を3つ失う。',
    category: 'negative',
    effectType: 'storm',
    icon: '🌊',
    learningPoint: '大航海時代、船は嵐や海難事故で多くの物資と人命を失いました。スペインの無敵艦隊もイギリスとの戦いと嵐で壊滅しました。',
  },
  {
    title: '経済恐慌',
    description: '世界的な不況！全プレイヤーの金が半分に（切り捨て）。',
    category: 'negative',
    effectType: 'depression',
    icon: '📉',
    learningPoint: '1929年の世界恐慌では、アメリカから始まった経済危機が世界中に広がり、多くの国が深刻な不況に陥りました。',
  },
  {
    title: '疫病の流行',
    description: '病気が広がった！食料を2つ失う。',
    category: 'negative',
    effectType: 'plague',
    icon: '🤒',
    learningPoint: 'ヨーロッパ人が持ち込んだ天然痘やはしかは、免疫のない先住民に壊滅的な被害を与えました。アメリカ大陸の先住民の多くが疫病で亡くなりました。',
  },
  {
    title: '独立運動',
    description: '一番外側の拠点を失う！（拠点1つ以下なら資源2つ失う）',
    category: 'negative',
    effectType: 'independence',
    icon: '✊',
    learningPoint: '20世紀、アジア・アフリカの多くの植民地が独立を勝ち取りました。インドのガンジーによる非暴力運動は世界中に影響を与えました。',
  },
  {
    title: '貿易制裁',
    description: '他国から制裁を受けた！次のターンは交換ができない。',
    category: 'negative',
    effectType: 'sanction',
    icon: '🚫',
    learningPoint: '経済制裁は、戦争をせずに相手国に圧力をかける外交手段です。現代でも国際問題の解決に使われています。',
    duration: 1,
  },
  {
    title: '国境紛争',
    description: '隣接する敵プレイヤーと互いに資源1つ失う！',
    category: 'negative',
    effectType: 'border_conflict',
    icon: '⚔️',
    learningPoint: '植民地の国境は、現地の民族や文化を無視して引かれたため、多くの紛争の原因となりました。アフリカの直線的な国境線がその例です。',
  },
];

// =============================================
// ポジティブカード（7枚）
// =============================================

const POSITIVE_CARDS: EventCardTemplate[] = [
  {
    title: '産業革命',
    description: '技術革新！次の建設コストが半額（端数切り上げ）。',
    category: 'positive',
    effectType: 'industrial_rev',
    icon: '⚡',
    learningPoint: '18世紀後半にイギリスで始まった産業革命は、蒸気機関の発明により工業生産を飛躍的に向上させ、世界の歴史を大きく変えました。',
    duration: 1,
  },
  {
    title: '外交条約',
    description: '外交交渉成功！好きな資源を3つ選んで獲得できる。',
    category: 'positive',
    effectType: 'diplomacy',
    icon: '🤝',
    learningPoint: '外交交渉は国と国の関係を平和的に解決する重要な手段です。ウィーン会議やポーツマス条約など、歴史的な条約が世界の形を変えてきました。',
    requiresChoice: true,
  },
  {
    title: '鉄道開通',
    description: 'インフラ整備！道を1本無料で建設できる。',
    category: 'positive',
    effectType: 'railroad',
    icon: '🚂',
    learningPoint: '鉄道の発展は物資の輸送を劇的に効率化しました。アメリカの大陸横断鉄道やインドの鉄道網は、植民地経営の重要なインフラでした。',
    requiresChoice: true,
  },
  {
    title: '援助物資',
    description: '同盟国から支援！全資源が1つずつ増える。',
    category: 'positive',
    effectType: 'aid',
    icon: '📦',
    learningPoint: '国際援助は困っている国を助ける仕組みです。第二次世界大戦後のマーシャル・プランは、アメリカがヨーロッパの復興を支援した有名な例です。',
  },
  {
    title: '万国博覧会',
    description: '国威発揚！VP+1（3ターン後に消滅）。',
    category: 'positive',
    effectType: 'expo',
    icon: '🏛️',
    learningPoint: '万国博覧会は各国が技術や文化を競い合う場でした。1851年のロンドン万博は、イギリスの工業力を世界に示す大イベントでした。',
    duration: 3,
  },
  {
    title: '新資源発見',
    description: '探検隊が新資源を発見！好きなタイル1つの資源タイプを変更できる。',
    category: 'positive',
    effectType: 'discovery',
    icon: '💡',
    learningPoint: '新しい資源の発見は国の運命を変えました。南アフリカの金鉱発見やアラビア半島の石油発見は、世界経済に大きな影響を与えました。',
    requiresChoice: true,
  },
  {
    title: '平和条約',
    description: '平和が訪れた！2ターンの間イベントが発生しない。',
    category: 'positive',
    effectType: 'peace_treaty',
    icon: '🕊️',
    learningPoint: '国際条約は国同士の約束事です。国際連合の設立や不戦条約など、平和を守るための努力が続けられています。',
    duration: 2,
  },
];

// =============================================
// 特殊カード（3枚）
// =============================================

const SPECIAL_CARDS: EventCardTemplate[] = [
  {
    title: '国民投票',
    description: '全プレイヤーが投票！最多票のプレイヤーが資源2つ失う。',
    category: 'special',
    effectType: 'vote',
    icon: '🗳️',
    learningPoint: '民主主義では、国民の投票によって重要な決定が行われます。選挙や国民投票は、人々の意思を政治に反映させる大切な仕組みです。',
    requiresChoice: true,
  },
  {
    title: '強制交換',
    description: '不平等条約！他プレイヤー1人と好きな資源を1つ強制交換。',
    category: 'special',
    effectType: 'forced_trade',
    icon: '🔄',
    learningPoint: '不平等条約は、力の差を利用して一方的に有利な条件を押し付けるものです。日本も幕末に不平等条約を結ばされ、改正に長い年月がかかりました。',
    requiresChoice: true,
  },
  {
    title: '海賊出没',
    description: '海賊だ！港の効果が1ターン無効。港持ちプレイヤーは資源1つ失う。',
    category: 'special',
    effectType: 'pirate',
    icon: '🏴‍☠️',
    learningPoint: 'カリブ海の海賊は、スペインの財宝船を襲って有名になりました。イギリスは海賊を「私掠船」として利用し、スペインと戦わせることもありました。',
    duration: 1,
  },
];

// =============================================
// 全カード統合
// =============================================

export const EVENT_CARDS: EventCardTemplate[] = [
  ...NEGATIVE_CARDS,
  ...POSITIVE_CARDS,
  ...SPECIAL_CARDS,
];

/** カテゴリ別にカードを取得 */
export function getCardsByCategory(category: EventCategory): EventCardTemplate[] {
  return EVENT_CARDS.filter(c => c.category === category);
}

/** effectTypeでカードを検索 */
export function getCardByEffectType(effectType: EventEffectType): EventCardTemplate | undefined {
  return EVENT_CARDS.find(c => c.effectType === effectType);
}

/** カテゴリの表示情報 */
export const CATEGORY_INFO: Record<EventCategory, {
  label: string;
  color: string;
  bgGradient: string;
  borderColor: string;
  headerGradient: string;
  glowColor: string;
}> = {
  negative: {
    label: 'トラブル発生！',
    color: '#E74C3C',
    bgGradient: 'linear-gradient(135deg, #FDEDEC, #F5B7B1)',
    borderColor: '#C0392B',
    headerGradient: 'linear-gradient(180deg, #E74C3C, #C0392B)',
    glowColor: 'rgba(231, 76, 60, 0.4)',
  },
  positive: {
    label: 'ボーナス！',
    color: '#27AE60',
    bgGradient: 'linear-gradient(135deg, #E8F8F5, #D5F5E3)',
    borderColor: '#1E8449',
    headerGradient: 'linear-gradient(180deg, #2ECC71, #27AE60)',
    glowColor: 'rgba(46, 204, 113, 0.4)',
  },
  special: {
    label: '特殊イベント！',
    color: '#8E44AD',
    bgGradient: 'linear-gradient(135deg, #F5EEF8, #E8DAEF)',
    borderColor: '#6C3483',
    headerGradient: 'linear-gradient(180deg, #9B59B6, #8E44AD)',
    glowColor: 'rgba(155, 89, 182, 0.4)',
  },
};
