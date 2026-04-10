// ===== Game Types & Constants for World Quest Empire =====
// カタン方式: 頂点に拠点、辺に道を建設。隣接タイルから資源を獲得。

// --- Resource Types ---
export type ResourceType = 'rubber' | 'oil' | 'gold' | 'food';

export const RESOURCE_INFO: Record<ResourceType, { name: string; color: string; icon: string; bgClass: string }> = {
  rubber: { name: 'ゴム', color: '#27AE60', icon: '🌿', bgClass: 'bg-emerald-600' },
  oil:    { name: '石油', color: '#2C3E50', icon: '🛢️', bgClass: 'bg-slate-800' },
  gold:   { name: '金',   color: '#F1C40F', icon: '💰', bgClass: 'bg-amber-500' },
  food:   { name: '食料', color: '#E67E22', icon: '🌾', bgClass: 'bg-orange-500' },
};

export type Resources = Record<ResourceType, number>;

// --- Tile Types ---
export type TileType = ResourceType | 'desert' | 'sea';

export const TILE_INFO: Record<TileType, { name: string; color: string; bgColor: string }> = {
  rubber: { name: 'ゴム', color: '#27AE60', bgColor: '#2ECC71' },
  oil:    { name: '石油', color: '#2C3E50', bgColor: '#34495E' },
  gold:   { name: '金',   color: '#F1C40F', bgColor: '#F39C12' },
  food:   { name: '食料', color: '#E67E22', bgColor: '#E8A838' },
  desert: { name: '砂漠', color: '#D4A574', bgColor: '#DEB887' },
  sea:    { name: '海',   color: '#3498DB', bgColor: '#5DADE2' },
};

// --- Tile ---
export interface GameTile {
  id: number;
  type: TileType;
  diceNumber: number;
  q: number;
  r: number;
}

// --- Vertex (頂点) - 拠点を建てる場所 ---
export interface Vertex {
  id: string;           // "v_q1r1_q2r2_q3r3" format (sorted tile keys)
  adjacentTileIds: number[];  // 隣接するタイルのID (2-3個)
  adjacentVertexIds: string[]; // 隣接する頂点のID
  adjacentEdgeIds: string[];   // 隣接する辺のID
  x: number;            // 描画用X座標
  y: number;            // 描画用Y座標
}

// --- Edge (辺) - 道を建てる場所 ---
export interface Edge {
  id: string;           // "e_v1_v2" format (sorted vertex keys)
  vertexIds: [string, string]; // 両端の頂点ID
  adjacentTileIds: number[];   // 隣接するタイルのID (1-2個)
  x1: number; y1: number;     // 描画用始点
  x2: number; y2: number;     // 描画用終点
}

// --- Settlement (拠点) - 頂点上に建設 ---
export interface Settlement {
  vertexId: string;
  playerId: string;
  level: 'settlement' | 'city';  // 拠点 or 都市
}

// --- Road (道) - 辺上に建設 ---
export interface Road {
  edgeId: string;
  playerId: string;
}

// --- Player ---
export interface Player {
  id: string;
  name: string;
  color: string;
  colorName: string;
  flagEmoji: string;
  countryName: string;
  resources: Resources;
  victoryPoints: number;
  isAI: boolean;
  isHuman: boolean;     // ローカル対戦用: 人間プレイヤーかどうか
  longestRoadLength: number;
  eventCards: EventCard[];
}

// --- Event Card ---
export type EventCategory = 'negative' | 'positive';

export interface EventCard {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  effectType: string;
  effectValue: number;
  icon: string;
}

// --- Game Phase ---
export type GamePhase = 
  | 'setup'       // 初期配置フェーズ
  | 'rolling'
  | 'action'
  | 'building'
  | 'trading'
  | 'event'
  | 'ai_turn'
  | 'handoff'     // ローカル対戦: 端末渡し画面
  | 'finished';

// --- Setup Sub-Phase ---
export type SetupStep = 'place_settlement' | 'place_road';

// --- Difficulty ---
export type Difficulty = 'easy' | 'normal' | 'hard';

// --- Player Slot (ゲーム作成画面用) ---
export interface PlayerSlot {
  type: 'human' | 'ai';
  name: string;
  countryIndex: number;
}

// --- Game State ---
export interface GameState {
  roomId: string;
  players: Player[];
  tiles: GameTile[];
  vertices: Vertex[];
  edges: Edge[];
  settlements: Settlement[];
  roads: Road[];
  ports: Port[];
  currentPlayerIndex: number;
  currentTurn: number;
  maxTurns: number;
  phase: GamePhase;
  diceResult: [number, number] | null;
  difficulty: Difficulty;
  gameLog: GameLogEntry[];
  currentEvent: EventCard | null;
  winner: Player | null;
  // Setup phase state
  setupPhase: {
    currentPlayerIndex: number;
    round: number;       // 1 or 2 (each player places 2 settlements)
    step: SetupStep;
    lastPlacedVertexId: string | null;
  } | null;
  // Longest road tracking
  longestRoadPlayerId: string | null;
}

export interface GameLogEntry {
  id: string;
  message: string;
  type: 'info' | 'resource' | 'build' | 'event' | 'trade' | 'system' | 'road';
  timestamp: number;
  playerId?: string;
}

// --- Player Colors ---
export const PLAYER_COLORS = [
  { color: '#E74C3C', name: '赤', flagEmoji: '🇯🇵', countryName: '日本' },
  { color: '#3498DB', name: '青', flagEmoji: '🇬🇧', countryName: 'イギリス' },
  { color: '#2ECC71', name: '緑', flagEmoji: '🇫🇷', countryName: 'フランス' },
  { color: '#F39C12', name: '黄', flagEmoji: '🇩🇪', countryName: 'ドイツ' },
  { color: '#9B59B6', name: '紫', flagEmoji: '🇺🇸', countryName: 'アメリカ' },
  { color: '#1ABC9C', name: '水色', flagEmoji: '🇮🇹', countryName: 'イタリア' },
];

// --- Port (港) ---
export interface Port {
  id: string;
  vertexIds: string[];  // この港に隣接する頂点（2つ）
  type: 'general' | ResourceType;  // general=3:1、資源港=2:1
}

export const TRADE_RATE_DEFAULT = 4;
export const TRADE_RATE_GENERAL_PORT = 3;
export const TRADE_RATE_SPECIAL_PORT = 2;

// --- Build Costs ---
export const BUILD_COSTS = {
  settlement: { rubber: 1, food: 1, gold: 1, oil: 1 } as Partial<Resources>,
  city:       { oil: 2, gold: 2, food: 1 } as Partial<Resources>,
  road:       { rubber: 1, oil: 1 } as Partial<Resources>,
};

// --- Victory Points ---
export const VP_VALUES = {
  settlement: 1,
  city: 2,
  road: 0,
  longestRoad: 2,
};

// --- Winning Score ---
export const WINNING_SCORE: Record<Difficulty, number> = {
  easy: 8,
  normal: 10,
  hard: 12,
};

// --- Map Layout (3-4-5-4-3 hex grid) ---
export const HEX_LAYOUT: { q: number; r: number }[] = [
  // Row 0 (3 tiles)
  { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
  // Row 1 (4 tiles)
  { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 2, r: 1 },
  // Row 2 (5 tiles)
  { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 2, r: 2 },
  // Row 3 (4 tiles)
  { q: -2, r: 3 }, { q: -1, r: 3 }, { q: 0, r: 3 }, { q: 1, r: 3 },
  // Row 4 (3 tiles)
  { q: -2, r: 4 }, { q: -1, r: 4 }, { q: 0, r: 4 },
];

// --- Tile Distribution ---
export const TILE_DISTRIBUTION: TileType[] = [
  'rubber', 'rubber', 'rubber', 'rubber', 'rubber',
  'oil', 'oil', 'oil', 'oil',
  'gold', 'gold', 'gold', 'gold',
  'food', 'food', 'food', 'food', 'food',
  'desert',
];

// --- Dice Numbers (excluding 7, distributed across non-sea/non-desert tiles) ---
export const DICE_NUMBERS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

// =============================================
// LARGE MAP (4-5-6-5-4 layout for 5-6 players)
// =============================================
export const HEX_LAYOUT_LARGE: { q: number; r: number }[] = [
  // Row 0 (4 tiles)
  { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 },
  // Row 1 (5 tiles)
  { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 3, r: 1 },
  // Row 2 (6 tiles)
  { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 2, r: 2 }, { q: 3, r: 2 },
  // Row 3 (5 tiles)
  { q: -2, r: 3 }, { q: -1, r: 3 }, { q: 0, r: 3 }, { q: 1, r: 3 }, { q: 2, r: 3 },
  // Row 4 (4 tiles)
  { q: -2, r: 4 }, { q: -1, r: 4 }, { q: 0, r: 4 }, { q: 1, r: 4 },
];

export const TILE_DISTRIBUTION_LARGE: TileType[] = [
  'rubber', 'rubber', 'rubber', 'rubber', 'rubber', 'rubber',
  'oil', 'oil', 'oil', 'oil', 'oil',
  'gold', 'gold', 'gold', 'gold', 'gold',
  'food', 'food', 'food', 'food', 'food', 'food', 'food',
  'desert',
];

export const DICE_NUMBERS_LARGE = [2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 11, 11, 12];

export const ROWS_LARGE = [4, 5, 6, 5, 4];

// --- Event Cards Data ---
export const EVENT_CARDS: Omit<EventCard, 'id'>[] = [
  // Negative
  { title: '現地の反発', description: '広がりすぎた！現地の人たちが怒っている。資源を2つ失う。', category: 'negative', effectType: 'lose_resources', effectValue: 2, icon: '😠' },
  { title: '独立運動', description: '海外の拠点で独立運動が起きた！拠点が1つなくなる。', category: 'negative', effectType: 'lose_structure', effectValue: 1, icon: '✊' },
  { title: '国際問題', description: '他の国から文句を言われた。1ターン行動できない。', category: 'negative', effectType: 'skip_turn', effectValue: 1, icon: '🌐' },
  { title: '物流トラブル', description: '船が嵐にあった！食料を2つ失う。', category: 'negative', effectType: 'lose_food', effectValue: 2, icon: '🌊' },
  { title: '暴動', description: '不満が爆発！ゴムと石油を1つずつ失う。', category: 'negative', effectType: 'lose_resources', effectValue: 2, icon: '🔥' },
  // Positive
  { title: '資源ラッシュ！', description: '好きな資源2つゲット！', category: 'positive', effectType: 'gain_resources', effectValue: 2, icon: '💎' },
  { title: '外交成功', description: '他の国と仲良くなった！好きな資源1つゲット！', category: 'positive', effectType: 'gain_resources', effectValue: 1, icon: '🤝' },
  { title: '技術革新', description: '新しい技術を発見！次の建設コストが半分になる。', category: 'positive', effectType: 'discount_build', effectValue: 50, icon: '⚡' },
  { title: '支援物資', description: '友好国から物資が届いた！全資源1つずつゲット！', category: 'positive', effectType: 'gain_all', effectValue: 1, icon: '📦' },
  { title: '新航路発見', description: '新しい航路を見つけた！道を1つ無料で建設できる！', category: 'positive', effectType: 'free_road', effectValue: 1, icon: '🧭' },
];
