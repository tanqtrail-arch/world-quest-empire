// ===== Stage Mode Data =====
// 10ステージの定義。各ステージはストーリー + 特殊ルール + クリア条件を持つ。

import type { Difficulty } from './gameTypes';

// --- Stage Special Rules ---
export interface StageSpecialRules {
  resourceHalved?: boolean;       // 全員資源半減スタート
  eventRateMultiplier?: number;   // イベント発生率倍率
  outerBaseDecayInterval?: number; // N ターンごとに最外拠点消滅
  coopMode?: boolean;             // 協力モード（全員でVP合計）
  coopTargetTotal?: number;       // 協力モード目標合計VP
  skipSetupPhase?: boolean;       // セットアップフェイズスキップ（チュートリアル用）
  noTrade?: boolean;              // 交易禁止
  turnLimit?: number;             // ターン制限（maxTurnsとは別にクリア判定用）
}

// --- Clear Condition ---
export interface StageClearCondition {
  type: 'vp' | 'settlements' | 'ports' | 'survive_turns' | 'coop_vp';
  /** VP到達 or 拠点数 or 港数 or 生存ターン数 */
  value: number;
  /** survive_turns の場合、追加でVP条件 */
  minVP?: number;
  /** coopの場合、各プレイヤー最低VP */
  minVPEach?: number;
  /** AIより先に到達する必要があるか */
  beforeAI?: boolean;
}

// --- Star Conditions ---
export interface StageStarConditions {
  /** ★1: クリア条件達成（常にclear） */
  star1: 'clear';
  /** ★2: 規定ターン内クリア */
  star2TurnLimit: number;
  /** ★3: クイズ全問正解 + 規定ターン内 */
  star3TurnLimit: number;
}

// --- AI Slot Definition ---
export interface StageAISlot {
  difficulty: Difficulty;
  countryIndex: number; // PLAYER_COLORSのインデックス
}

// --- Stage Definition ---
export interface StageDefinition {
  id: number;
  title: string;
  subtitle: string;
  era: string;
  storyText: string;
  clearText: string;
  mapSize: 'mini' | 'standard' | 'large';
  aiSlots: StageAISlot[];
  specialRules: StageSpecialRules;
  clearCondition: StageClearCondition;
  starConditions: StageStarConditions;
  difficulty: Difficulty;
}

// --- Stage Progress (localStorage) ---
export interface StageProgress {
  cleared: boolean;
  stars: number;
  bestTurns: number;
}

export type StageProgressMap = { [stageId: number]: StageProgress };

const STORAGE_KEY = 'wqe_stage_progress';

export function loadStageProgress(): StageProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStageProgress(progress: StageProgressMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function updateStageResult(
  stageId: number,
  stars: number,
  turns: number,
): StageProgressMap {
  const progress = loadStageProgress();
  const prev = progress[stageId];
  progress[stageId] = {
    cleared: true,
    stars: Math.max(stars, prev?.stars ?? 0),
    bestTurns: prev?.bestTurns ? Math.min(turns, prev.bestTurns) : turns,
  };
  saveStageProgress(progress);
  return progress;
}

export function getTotalStars(progress: StageProgressMap): number {
  return Object.values(progress).reduce((sum, p) => sum + (p.stars ?? 0), 0);
}

export function isStageUnlocked(stageId: number, progress: StageProgressMap): boolean {
  if (stageId === 1) return true;
  const prev = progress[stageId - 1];
  return !!prev?.cleared && prev.stars >= 1;
}

// =============================================
// 10 STAGES
// =============================================

export const STAGES: StageDefinition[] = [
  {
    id: 1,
    title: '産業革命の始まり',
    subtitle: 'チュートリアル',
    era: '1760年代',
    storyText:
      'イギリスで蒸気機関が発明された。工場が次々と建ち、世界が変わり始める。まずは拠点を2つ建てて、資源を集める練習をしよう！',
    clearText:
      '素晴らしい！拠点の建て方をマスターした。次は他の国と競争だ！',
    mapSize: 'mini',
    aiSlots: [],
    specialRules: { skipSetupPhase: true },
    clearCondition: { type: 'settlements', value: 2 },
    starConditions: { star1: 'clear', star2TurnLimit: 8, star3TurnLimit: 5 },
    difficulty: 'easy',
  },
  {
    id: 2,
    title: '植民地競争',
    subtitle: '最初のライバル',
    era: '1800年代',
    storyText:
      'ヨーロッパの国々がアジアやアフリカに進出し始めた。ライバル国より先に勝利点5を目指せ！制限時間は5ターンだ。',
    clearText:
      '植民地競争に勝利した！しかし、アフリカでは新たな争いが始まっている…',
    mapSize: 'standard',
    aiSlots: [{ difficulty: 'easy', countryIndex: 1 }],
    specialRules: { turnLimit: 5 },
    clearCondition: { type: 'vp', value: 5, beforeAI: true },
    starConditions: { star1: 'clear', star2TurnLimit: 4, star3TurnLimit: 3 },
    difficulty: 'easy',
  },
  {
    id: 3,
    title: 'アフリカ分割',
    subtitle: '港を確保せよ',
    era: '1880年代',
    storyText:
      'ヨーロッパ列強がアフリカを分割している。砂漠が多い厳しい土地で、港を2つ確保して貿易路を築け！',
    clearText:
      'アフリカの港を確保した。だが、列強の間で同盟と対立が生まれている…',
    mapSize: 'standard',
    aiSlots: [{ difficulty: 'normal', countryIndex: 2 }],
    specialRules: {},
    clearCondition: { type: 'ports', value: 2 },
    starConditions: { star1: 'clear', star2TurnLimit: 12, star3TurnLimit: 8 },
    difficulty: 'normal',
  },
  {
    id: 4,
    title: '同盟と対立',
    subtitle: '2国を相手に',
    era: '1900年代',
    storyText:
      '世界は2つの陣営に分かれつつある。弱い国と強い国、2つのライバルを相手に勝利点7を目指せ！',
    clearText:
      '複数の国を相手に勝利した！しかし、ヨーロッパに戦争の影が忍び寄る…',
    mapSize: 'standard',
    aiSlots: [
      { difficulty: 'easy', countryIndex: 1 },
      { difficulty: 'hard', countryIndex: 3 },
    ],
    specialRules: {},
    clearCondition: { type: 'vp', value: 7 },
    starConditions: { star1: 'clear', star2TurnLimit: 15, star3TurnLimit: 10 },
    difficulty: 'normal',
  },
  {
    id: 5,
    title: '第一次世界大戦',
    subtitle: '混乱を生き延びろ',
    era: '1914年',
    storyText:
      '世界大戦が勃発した！イベントが2倍の頻度で起きる混乱の中、20ターン生き残り、勝利点6以上を維持せよ！',
    clearText:
      '大戦を生き延びた。しかし、戦争の傷跡は深く、世界経済に暗雲が…',
    mapSize: 'standard',
    aiSlots: [
      { difficulty: 'normal', countryIndex: 2 },
      { difficulty: 'normal', countryIndex: 4 },
    ],
    specialRules: { eventRateMultiplier: 2 },
    clearCondition: { type: 'survive_turns', value: 20, minVP: 6 },
    starConditions: { star1: 'clear', star2TurnLimit: 20, star3TurnLimit: 20 },
    difficulty: 'normal',
  },
  {
    id: 6,
    title: '世界恐慌',
    subtitle: '資源が足りない！',
    era: '1929年',
    storyText:
      '世界恐慌が発生！全プレイヤーの初期資源が半分からスタート。厳しい状況から勝利点8を目指せ！',
    clearText:
      '恐慌を乗り越えた！だが、世界では再び戦争の足音が…',
    mapSize: 'standard',
    aiSlots: [
      { difficulty: 'normal', countryIndex: 1 },
      { difficulty: 'normal', countryIndex: 3 },
    ],
    specialRules: { resourceHalved: true },
    clearCondition: { type: 'vp', value: 8 },
    starConditions: { star1: 'clear', star2TurnLimit: 18, star3TurnLimit: 12 },
    difficulty: 'hard',
  },
  {
    id: 7,
    title: '第二次世界大戦',
    subtitle: '3国に勝て',
    era: '1939年',
    storyText:
      '第二次世界大戦。3つの強国を相手に、勝利点10を目指して勝利せよ！',
    clearText:
      '大戦に勝利した！世界は新しい秩序を求めている…',
    mapSize: 'standard',
    aiSlots: [
      { difficulty: 'hard', countryIndex: 1 },
      { difficulty: 'hard', countryIndex: 3 },
      { difficulty: 'hard', countryIndex: 4 },
    ],
    specialRules: {},
    clearCondition: { type: 'vp', value: 10 },
    starConditions: { star1: 'clear', star2TurnLimit: 20, star3TurnLimit: 15 },
    difficulty: 'hard',
  },
  {
    id: 8,
    title: '独立の波',
    subtitle: '拠点が消える！',
    era: '1950年代',
    storyText:
      'アジア・アフリカで独立運動が広がる。3ターンごとに最も外側の拠点が消滅する！拠点を失いながらも勝利点12を目指せ！',
    clearText:
      '独立の嵐を乗り越えた！世界は協力の時代に向かう…',
    mapSize: 'standard',
    aiSlots: [
      { difficulty: 'hard', countryIndex: 2 },
      { difficulty: 'hard', countryIndex: 5 },
    ],
    specialRules: { outerBaseDecayInterval: 3 },
    clearCondition: { type: 'vp', value: 12 },
    starConditions: { star1: 'clear', star2TurnLimit: 22, star3TurnLimit: 16 },
    difficulty: 'hard',
  },
  {
    id: 9,
    title: '国連設立',
    subtitle: '協力モード',
    era: '1945年',
    storyText:
      '国際連合が設立された。今回は全員が味方！全プレイヤーがそれぞれ勝利点8以上に到達すれば勝利だ！',
    clearText:
      '全員で目標を達成した！協力の力で世界は平和へ向かう。あと1つ、最後の試練が待っている…',
    mapSize: 'standard',
    aiSlots: [
      { difficulty: 'normal', countryIndex: 1 },
      { difficulty: 'normal', countryIndex: 3 },
    ],
    specialRules: { coopMode: true, coopTargetTotal: 30 },
    clearCondition: { type: 'coop_vp', value: 30, minVPEach: 8 },
    starConditions: { star1: 'clear', star2TurnLimit: 25, star3TurnLimit: 18 },
    difficulty: 'normal',
  },
  {
    id: 10,
    title: '最終試練',
    subtitle: '完全勝利を目指せ',
    era: '現代',
    storyText:
      '全ての時代を生き抜いてきた。最後の試練は、広大なマップで3つの強国に勝利すること。勝利点15で完全勝利だ！',
    clearText:
      'おめでとう！全ステージ制覇！あなたは真の世界の覇者だ！歴史に名を刻もう！',
    mapSize: 'large',
    aiSlots: [
      { difficulty: 'hard', countryIndex: 1 },
      { difficulty: 'hard', countryIndex: 3 },
      { difficulty: 'hard', countryIndex: 5 },
    ],
    specialRules: {},
    clearCondition: { type: 'vp', value: 15 },
    starConditions: { star1: 'clear', star2TurnLimit: 25, star3TurnLimit: 18 },
    difficulty: 'hard',
  },
];

export function getStageById(id: number): StageDefinition | undefined {
  return STAGES.find(s => s.id === id);
}
