// ===== Stage Mode Data =====
// 10ステージの段階的学習設計（チュートリアル形式）
// ステージ1-3: 1d6, ソロ, 基本操作を学ぶ
// ステージ4-6: 2d6, AI1体
// ステージ7-9: 2d6, 複数AI, フルルール
// ステージ10: 最終試練（大マップ）

import type { Difficulty } from './gameTypes';

// --- Stage Special Rules ---
export interface StageSpecialRules {
  resourceHalved?: boolean;       // 全員資源半減スタート
  eventRateMultiplier?: number;   // イベント発生率倍率
  skipSetupPhase?: boolean;       // セットアップフェイズスキップ（初期配置済み）
  noTrade?: boolean;              // 交易禁止
  enablePorts?: boolean;          // 港を有効化
  enableEvents?: boolean;         // イベントカード有効化
  enableQuiz?: boolean;           // クイズ有効化
}

// --- Clear Condition ---
export interface StageClearCondition {
  type: 'vp' | 'resource_count' | 'road_count' | 'settlement_count' | 'city_count';
  /** 目標値 */
  value: number;
  /** VP条件も同時に満たす必要がある場合 */
  minVP?: number;
  /** 交換回数条件 */
  minTrades?: number;
  /** AIより先に到達する必要があるか */
  beforeAI?: boolean;
}

// --- Star Conditions (percentage-based) ---
export interface StageStarConditions {
  /** ★1: クリア */
  star1: 'clear';
  /** ★2: 規定ターン数の80%以内 */
  star2Pct: number; // 0.8
  /** ★3: 規定ターン数の50%以内 */
  star3Pct: number; // 0.5
}

// --- AI Slot Definition ---
export interface StageAISlot {
  difficulty: Difficulty;
  countryIndex: number;
}

// --- Stage Definition ---
export interface StageDefinition {
  id: number;
  title: string;
  subtitle: string;
  description: string;   // ルール概要（StageSelectに表示）
  storyText: string;
  clearText: string;
  mapSize: 'normal' | 'large';
  mapRows: number[];      // タイル行構成
  diceCount: 1 | 2;
  maxTurns: number;
  aiSlots: StageAISlot[];
  specialRules: StageSpecialRules;
  clearCondition: StageClearCondition;
  starConditions: StageStarConditions;
  difficulty: Difficulty;
  /** 初期拠点を自動配置する数 (skipSetupPhase時) */
  preplacedSettlements?: number;
  /** チュートリアル吹き出しメッセージ */
  tutorialMessage?: string;
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
// 10 STAGES - 段階的学習設計（全ステージ通常19タイルマップ、ステージ10のみ大マップ）
// =============================================

const NORMAL_ROWS = [3, 4, 5, 4, 3]; // 19タイル
const LARGE_ROWS = [3, 4, 5, 6, 5, 4, 3]; // 24タイル

export const STAGES: StageDefinition[] = [
  // ===== ステージ1-3: サイコロ1つ、AIなし、基本操作を学ぶ =====
  {
    id: 1,
    title: 'サイコロと資源',
    subtitle: 'サイコロの基本を覚えよう',
    description: 'サイコロ1つ。出た目のタイルから資源がもらえる！',
    storyText:
      '冒険のはじまりだ！サイコロを振って、出た目と同じ数字のタイルから資源を集めよう。まずは資源をたくさん集めることが目標だ！',
    clearText:
      'すごい！サイコロと資源の仕組みをマスターした。次は道の作り方を覚えよう！',
    mapSize: 'normal',
    mapRows: NORMAL_ROWS,
    diceCount: 1,
    maxTurns: 10,
    aiSlots: [],
    specialRules: { skipSetupPhase: true, noTrade: true },
    clearCondition: { type: 'resource_count', value: 8 },
    starConditions: { star1: 'clear', star2Pct: 0.8, star3Pct: 0.5 },
    difficulty: 'easy',
    preplacedSettlements: 1,
    tutorialMessage: 'サイコロを振ると、出た目と同じ番号のタイルから資源がもらえるよ！',
  },
  {
    id: 2,
    title: '道を作ろう',
    subtitle: '建設の基本',
    description: '資源を使って道を建設しよう！',
    storyText:
      '資源の使い方を覚えよう。ゴムと石油を集めて道を3本建設するのが目標だ。サイコロを振って資源を集めて、道を建てよう！',
    clearText:
      '道を建てられるようになった！次は拠点を増やすことに挑戦だ！',
    mapSize: 'normal',
    mapRows: NORMAL_ROWS,
    diceCount: 1,
    maxTurns: 12,
    aiSlots: [],
    specialRules: { skipSetupPhase: true, noTrade: true },
    clearCondition: { type: 'road_count', value: 3 },
    starConditions: { star1: 'clear', star2Pct: 0.8, star3Pct: 0.5 },
    difficulty: 'easy',
    preplacedSettlements: 1,
    tutorialMessage: 'ゴム1+石油1で道が作れるよ！道を伸ばして領土を広げよう',
  },
  {
    id: 3,
    title: '拠点を増やせ',
    subtitle: '道→拠点の建設チェーン',
    description: '道を伸ばして、新しい拠点を建設！',
    storyText:
      '道をつないだ先に新しい拠点を建てられるぞ！拠点を合計3つにするのが目標だ。全資源を1つずつ集めて拠点を建てよう！',
    clearText:
      '拠点の建て方をマスターした！いよいよライバルとの戦いが始まる…',
    mapSize: 'normal',
    mapRows: NORMAL_ROWS,
    diceCount: 1,
    maxTurns: 15,
    aiSlots: [],
    specialRules: { skipSetupPhase: true, noTrade: true },
    clearCondition: { type: 'settlement_count', value: 3 },
    starConditions: { star1: 'clear', star2Pct: 0.8, star3Pct: 0.5 },
    difficulty: 'easy',
    preplacedSettlements: 1,
    tutorialMessage: '道の先の頂点に新しい拠点を建てられるよ！全資源1つずつ必要',
  },

  // ===== ステージ4-6: サイコロ2つ、AI登場 =====
  {
    id: 4,
    title: 'はじめてのライバル',
    subtitle: '2d6とAI対戦の基本',
    description: 'サイコロ2つ！AIとの初対戦。',
    storyText:
      'ここからサイコロが2つになる！2つの合計が出目だ。ライバル国が登場。相手より先に勝利点5を目指せ！',
    clearText:
      'ライバルに勝利した！2つのサイコロにも慣れてきたかな？',
    mapSize: 'normal',
    mapRows: NORMAL_ROWS,
    diceCount: 2,
    maxTurns: 15,
    aiSlots: [{ difficulty: 'easy', countryIndex: 1 }],
    specialRules: {},
    clearCondition: { type: 'vp', value: 5 },
    starConditions: { star1: 'clear', star2Pct: 0.8, star3Pct: 0.5 },
    difficulty: 'easy',
    tutorialMessage: 'サイコロが2つに！合計の数字でタイルが光るよ。6と8が出やすい！',
  },
  {
    id: 5,
    title: '交換と港',
    subtitle: '交換と港の活用',
    description: '資源交換と港を使いこなせ！',
    storyText:
      '資源が足りない？交換を使おう！港を使えばもっとお得に交換できるぞ。交換を3回以上使って、勝利点6を目指せ！',
    clearText:
      '交換をマスターした！これで資源不足も怖くない！',
    mapSize: 'normal',
    mapRows: NORMAL_ROWS,
    diceCount: 2,
    maxTurns: 18,
    aiSlots: [{ difficulty: 'normal', countryIndex: 2 }],
    specialRules: { enablePorts: true },
    clearCondition: { type: 'vp', value: 6, minTrades: 3 },
    starConditions: { star1: 'clear', star2Pct: 0.8, star3Pct: 0.5 },
    difficulty: 'normal',
    tutorialMessage: '余った資源は交換できるよ！港の近くに拠点を建てると交換レートがお得！',
  },
  {
    id: 6,
    title: '都市化',
    subtitle: '都市化戦略',
    description: '拠点を都市にアップグレード！',
    storyText:
      '拠点を都市にアップグレードすると、資源が2倍もらえるようになる！都市を1つ建設して、勝利点7を目指せ！',
    clearText:
      '都市化の力を知った！いよいよ世界の列強たちとの戦いだ…',
    mapSize: 'normal',
    mapRows: NORMAL_ROWS,
    diceCount: 2,
    maxTurns: 20,
    aiSlots: [{ difficulty: 'normal', countryIndex: 3 }],
    specialRules: { enablePorts: true },
    clearCondition: { type: 'city_count', value: 1, minVP: 7 },
    starConditions: { star1: 'clear', star2Pct: 0.8, star3Pct: 0.5 },
    difficulty: 'normal',
    tutorialMessage: '拠点を都市にアップグレード！資源が2倍もらえるようになるよ',
  },

  // ===== ステージ7-10: フルルール =====
  {
    id: 7,
    title: '列強の時代',
    subtitle: '複数の敵との戦略',
    description: '2体のAIと戦え！',
    storyText:
      '2つの国が立ちはだかる。限られた土地を奪い合い、勝利点8に先に到達した者が勝者だ！',
    clearText:
      '2国を相手に勝利した！しかし、世界にはまだ強敵が…',
    mapSize: 'normal',
    mapRows: NORMAL_ROWS,
    diceCount: 2,
    maxTurns: 22,
    aiSlots: [
      { difficulty: 'normal', countryIndex: 1 },
      { difficulty: 'normal', countryIndex: 4 },
    ],
    specialRules: { enablePorts: true },
    clearCondition: { type: 'vp', value: 8 },
    starConditions: { star1: 'clear', star2Pct: 0.8, star3Pct: 0.5 },
    difficulty: 'normal',
  },
  {
    id: 8,
    title: '帝国主義',
    subtitle: 'イベント対応と危機管理',
    description: 'イベントカード発動！危機を乗り越えろ。',
    storyText:
      'イベントカードが登場！予想外の出来事に対応しながら、勝利点10を目指せ！',
    clearText:
      'イベントの嵐を乗り越えた！最終決戦が近い…',
    mapSize: 'normal',
    mapRows: NORMAL_ROWS,
    diceCount: 2,
    maxTurns: 25,
    aiSlots: [
      { difficulty: 'hard', countryIndex: 2 },
      { difficulty: 'hard', countryIndex: 5 },
    ],
    specialRules: { enablePorts: true, enableEvents: true },
    clearCondition: { type: 'vp', value: 10 },
    starConditions: { star1: 'clear', star2Pct: 0.8, star3Pct: 0.5 },
    difficulty: 'hard',
  },
  {
    id: 9,
    title: '世界大戦',
    subtitle: '全スキル総合',
    description: '3体のAI、全機能！',
    storyText:
      '3つの強国と激突！イベント・クイズ・交換、全てのスキルを駆使して勝利点12を目指せ！',
    clearText:
      '世界大戦を制した！残るは最後の試練のみ…',
    mapSize: 'normal',
    mapRows: NORMAL_ROWS,
    diceCount: 2,
    maxTurns: 28,
    aiSlots: [
      { difficulty: 'hard', countryIndex: 1 },
      { difficulty: 'hard', countryIndex: 3 },
      { difficulty: 'hard', countryIndex: 5 },
    ],
    specialRules: { enablePorts: true, enableEvents: true, enableQuiz: true },
    clearCondition: { type: 'vp', value: 12 },
    starConditions: { star1: 'clear', star2Pct: 0.8, star3Pct: 0.5 },
    difficulty: 'hard',
  },
  {
    id: 10,
    title: '最終試練：世界征服',
    subtitle: '逆境からの勝利',
    description: '大マップ！資源半減スタート！全機能フル稼働！',
    storyText:
      '全ての時代を生き抜いてきた。最後の試練は、資源が半分からのスタート。3つの強国を倒し、勝利点15で完全勝利を目指せ！',
    clearText:
      'おめでとう！全ステージ制覇！あなたは真の世界の覇者だ！',
    mapSize: 'large',
    mapRows: LARGE_ROWS,
    diceCount: 2,
    maxTurns: 30,
    aiSlots: [
      { difficulty: 'hard', countryIndex: 1 },
      { difficulty: 'hard', countryIndex: 3 },
      { difficulty: 'hard', countryIndex: 5 },
    ],
    specialRules: { resourceHalved: true, enablePorts: true, enableEvents: true, enableQuiz: true },
    clearCondition: { type: 'vp', value: 15 },
    starConditions: { star1: 'clear', star2Pct: 0.8, star3Pct: 0.5 },
    difficulty: 'hard',
  },
];

export function getStageById(id: number): StageDefinition | undefined {
  return STAGES.find(s => s.id === id);
}
