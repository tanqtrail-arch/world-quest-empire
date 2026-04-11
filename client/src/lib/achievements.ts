/*
 * Achievement badges — computed from game_results + cached in localStorage.
 * Badges are awarded permanently once unlocked.
 */
import type { GameResultRow } from './supabase';

export interface Badge {
  id: string;
  emoji: string;
  name: string;
  description: string;
}

export const BADGES: Record<string, Badge> = {
  quiz_master: {
    id: 'quiz_master',
    emoji: '🎯',
    name: 'クイズマスター',
    description: 'クイズ正答率90%以上（10問以上）',
  },
  blitz_victory: {
    id: 'blitz_victory',
    emoji: '⚡',
    name: '電撃勝利',
    description: '8ターン以内で勝利',
  },
  builder_king: {
    id: 'builder_king',
    emoji: '🏗️',
    name: '建築王',
    description: '1ゲームで拠点5つ以上',
  },
  city_empire: {
    id: 'city_empire',
    emoji: '🏰',
    name: '都市帝国',
    description: '1ゲームで都市3つ以上',
  },
  road_ruler: {
    id: 'road_ruler',
    emoji: '🛤️',
    name: '道の覇者',
    description: '最長道路ボーナスを累計3回以上獲得',
  },
  lucky_seven: {
    id: 'lucky_seven',
    emoji: '🎲',
    name: 'ラッキー7',
    description: '7を累計5回以上出した',
  },
  comeback_king: {
    id: 'comeback_king',
    emoji: '💪',
    name: '逆転王',
    description: '最下位から1位になって勝利',
  },
  world_conqueror: {
    id: 'world_conqueror',
    emoji: '🌍',
    name: '世界征服者',
    description: '全難易度で各3勝以上',
  },
  history_scholar: {
    id: 'history_scholar',
    emoji: '📚',
    name: '歴史博士',
    description: '1ゲームでクイズ全問正解',
  },
};

export const BADGE_ORDER: string[] = [
  'quiz_master', 'blitz_victory', 'builder_king', 'city_empire',
  'road_ruler', 'lucky_seven', 'comeback_king', 'world_conqueror', 'history_scholar',
];

/**
 * Compute which badges a player has earned from their full result history.
 */
export function computeBadges(results: GameResultRow[]): Set<string> {
  const earned = new Set<string>();
  if (results.length === 0) return earned;

  // Aggregations
  let totalQuizCorrect = 0;
  let totalQuizTotal = 0;
  let totalSevens = 0;
  let longestRoadCount = 0;
  const winsByDifficulty: Record<string, number> = { easy: 0, normal: 0, hard: 0 };

  for (const r of results) {
    totalQuizCorrect += r.quiz_correct || 0;
    totalQuizTotal += r.quiz_total || 0;
    totalSevens += r.sevens_rolled || 0;
    if (r.had_longest_road) longestRoadCount++;

    // Per-game badges
    if (r.rank === 1 && r.turns_used <= 8) earned.add('blitz_victory');
    if (r.settlements_count >= 5) earned.add('builder_king');
    if (r.cities_count >= 3) earned.add('city_empire');
    if (r.rank === 1 && r.came_from_behind) earned.add('comeback_king');
    if (r.quiz_total >= 3 && r.quiz_correct === r.quiz_total) earned.add('history_scholar');

    // Diff wins
    if (r.rank === 1 && r.difficulty in winsByDifficulty) {
      winsByDifficulty[r.difficulty]++;
    }
  }

  // Aggregate badges
  if (totalQuizTotal >= 10 && totalQuizCorrect / totalQuizTotal >= 0.9) {
    earned.add('quiz_master');
  }
  if (longestRoadCount >= 3) earned.add('road_ruler');
  if (totalSevens >= 5) earned.add('lucky_seven');
  if (winsByDifficulty.easy >= 3 && winsByDifficulty.normal >= 3 && winsByDifficulty.hard >= 3) {
    earned.add('world_conqueror');
  }

  return earned;
}

/** LocalStorage cache: per-player earned badges. */
const STORAGE_KEY = 'wqe_badges_v1';

type BadgeStore = Record<string, string[]>; // playerName → badge ids

function loadStore(): BadgeStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStore(store: BadgeStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage full / disabled */
  }
}

export function getStoredBadges(playerName: string): Set<string> {
  const store = loadStore();
  return new Set(store[playerName] || []);
}

/**
 * Merge newly-computed badges with the stored set (once earned, always earned).
 * Returns the set of badges that were NEWLY unlocked this call.
 */
export function mergeBadges(playerName: string, computed: Set<string>): Set<string> {
  const store = loadStore();
  const existing = new Set(store[playerName] || []);
  const newly = new Set<string>();
  computed.forEach(id => {
    if (!existing.has(id)) {
      newly.add(id);
      existing.add(id);
    }
  });
  store[playerName] = Array.from(existing);
  saveStore(store);
  return newly;
}

// --- Current player name (for match history + badge binding) ---
const PLAYER_NAME_KEY = 'wqe_player_name';

export function getStoredPlayerName(): string | null {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY);
  } catch {
    return null;
  }
}

export function setStoredPlayerName(name: string) {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name);
  } catch {
    /* ignore */
  }
}

// --- Level-up detection (for Result screen animation) ---
const LAST_LEVEL_KEY = 'wqe_last_level_';

export function getLastLevel(playerName: string): number {
  try {
    const v = localStorage.getItem(LAST_LEVEL_KEY + playerName);
    return v ? parseInt(v, 10) : 1;
  } catch {
    return 1;
  }
}

export function setLastLevel(playerName: string, level: number) {
  try {
    localStorage.setItem(LAST_LEVEL_KEY + playerName, String(level));
  } catch {
    /* ignore */
  }
}
