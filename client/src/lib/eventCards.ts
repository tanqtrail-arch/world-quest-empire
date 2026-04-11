import type { EventCard } from './gameTypes';

// =============================================
// EVENT CARDS DATA - 17枚のイベントカード
// =============================================

export const EVENT_CARDS: Omit<EventCard, 'id'>[] = [
  // =============================================
  // ネガティブカード（7枚）
  // =============================================
  {
    title: '現地の反乱',
    description: '植民地の人々が立ち上がった！ランダムな資源を2つ失う。',
    category: 'negative',
    effectType: 'rebellion',
    effectValue: 2,
    icon: '🔥',
    learningPoint: '植民地支配への抵抗は世界中で起きた歴史的事実です。',
  },
  {
    title: '嵐で船が沈没',
    description: '大嵐が来た！ランダムな資源を3つ失う。',
    category: 'negative',
    effectType: 'storm',
    effectValue: 3,
    icon: '🌊',
    learningPoint: '大航海時代、海上輸送は常に嵐や海賊のリスクがありました。',
  },
  {
    title: '経済恐慌',
    description: '世界中が不景気に！全プレイヤーの金が半分（切り捨て）になる。',
    category: 'negative',
    effectType: 'depression',
    effectValue: 0,
    icon: '📉',
    learningPoint: '1929年の世界恐慌は、世界中の経済に大打撃を与えました。',
  },
  {
    title: '疫病の流行',
    description: '病気が広がった！食料を2つ失う。',
    category: 'negative',
    effectType: 'plague',
    effectValue: 2,
    icon: '🤒',
    learningPoint: 'ペストやコレラなど、植民地では疫病が大きな問題でした。',
  },
  {
    title: '独立運動',
    description: '植民地が独立を宣言！拠点1つを失う（1つ以下なら資源2つ失う）。',
    category: 'negative',
    effectType: 'independence',
    effectValue: 1,
    icon: '✊',
    learningPoint: '20世紀、多くの植民地が独立を勝ち取りました。',
  },
  {
    title: '貿易制裁',
    description: '国際社会から制裁を受けた！このターン行動できない。',
    category: 'negative',
    effectType: 'sanction',
    effectValue: 1,
    icon: '🚫',
    learningPoint: '経済制裁は国際政治の重要な手段の一つです。',
    duration: 1,
  },
  {
    title: '国境紛争',
    description: '隣国との争い！資源を1つ失う。',
    category: 'negative',
    effectType: 'border_conflict',
    effectValue: 1,
    icon: '⚔️',
    learningPoint: '国境線をめぐる争いは、今も世界各地で続いています。',
  },

  // =============================================
  // ポジティブカード（7枚）
  // =============================================
  {
    title: '産業革命',
    description: '技術が進歩した！好きな資源を2つ選んでゲット！',
    category: 'positive',
    effectType: 'industrial_rev',
    effectValue: 2,
    icon: '⚡',
    learningPoint: '18世紀のイギリスで始まった産業革命は世界を変えました。',
  },
  {
    title: '外交条約',
    description: '友好条約を結んだ！好きな資源を3つ選んでゲット！',
    category: 'positive',
    effectType: 'diplomacy',
    effectValue: 3,
    icon: '🤝',
    learningPoint: '外交は戦争を避け、平和を保つための大切な手段です。',
    requiresChoice: true,
  },
  {
    title: '新資源発見',
    description: '未知の資源を発見！好きな資源を1つ選んでゲット！',
    category: 'positive',
    effectType: 'discovery',
    effectValue: 1,
    icon: '💎',
    learningPoint: '新大陸の発見は、ヨーロッパに多くの新しい資源をもたらしました。',
    requiresChoice: true,
  },
  {
    title: '援助物資',
    description: '友好国から物資が届いた！全資源を1つずつゲット！',
    category: 'positive',
    effectType: 'aid',
    effectValue: 1,
    icon: '📦',
    learningPoint: '国際援助は困っている国を助ける大切な仕組みです。',
  },
  {
    title: '万国博覧会',
    description: '博覧会で世界に認められた！★勝利ポイント+1！',
    category: 'positive',
    effectType: 'expo',
    effectValue: 1,
    icon: '🏛️',
    learningPoint: '1851年のロンドン万博は、世界初の国際博覧会でした。',
    duration: 3,
  },
  {
    title: '鉄道開通',
    description: '鉄道が開通した！道を1つ無料で建設！',
    category: 'positive',
    effectType: 'railroad',
    effectValue: 1,
    icon: '🚂',
    learningPoint: '鉄道の発明は、人と物の移動を劇的に変えました。',
  },
  {
    title: '平和条約',
    description: '世界に平和が訪れた！全資源を1つずつゲット！',
    category: 'positive',
    effectType: 'peace_treaty',
    effectValue: 1,
    icon: '🕊️',
    learningPoint: '平和条約は戦争を終わらせ、新しい時代を開く重要な一歩です。',
    duration: 2,
  },

  // =============================================
  // 特殊カード（3枚）
  // =============================================
  {
    title: '海賊出没',
    description: '海賊に襲われた！資源を1つ奪われる。',
    category: 'special',
    effectType: 'pirate',
    effectValue: 1,
    icon: '🏴‍☠️',
    learningPoint: 'カリブ海の海賊は、大航海時代の大きな脅威でした。',
  },
  {
    title: '強制交換',
    description: '他のプレイヤーとランダムに資源を1つ交換！',
    category: 'special',
    effectType: 'forced_trade',
    effectValue: 1,
    icon: '🔄',
    learningPoint: '貿易は時に不平等な条件で行われることもありました。',
    requiresChoice: true,
  },
  {
    title: '国民投票',
    description: '投票の結果、ランダムな相手が資源を2つ失う！',
    category: 'special',
    effectType: 'vote',
    effectValue: 2,
    icon: '🗳️',
    learningPoint: '民主主義の基本は、国民一人ひとりの投票です。',
    requiresChoice: true,
  },
];
