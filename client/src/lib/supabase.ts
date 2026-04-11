import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabase is optional — works without env vars (local-only mode)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseEnabled = !!supabase;

// --- Ranking types ---
export interface GameResult {
  player_name: string;
  victory_points: number;
  rank: number;
  turns_used: number;
  settlements_count: number;
  cities_count: number;
  roads_count: number;
  difficulty: string;
  player_count: number;
  quiz_correct: number;
  quiz_total: number;
  sevens_rolled: number;
  had_longest_road: boolean;
  came_from_behind: boolean;
}

// Game result as stored (includes server fields)
export interface GameResultRow extends GameResult {
  id: string;
  played_at: string;
}

export interface RankingEntry {
  player_name: string;
  total_points: number;
  wins: number;
  games: number;
  max_vp: number;
  avg_quiz_rate: number;
}

export interface HallOfFameEntry {
  week_start: string;
  player_name: string;
  week_points: number;
  wins: number;
  games: number;
}

// --- Ranking point calculation ---
export function rankToPoints(rank: number): number {
  if (rank === 1) return 10;
  if (rank === 2) return 5;
  if (rank === 3) return 3;
  return 1;
}

// --- Title system ---
export function getTitle(totalPoints: number): { title: string; emoji: string } {
  if (totalPoints >= 200) return { title: '世界征服者', emoji: '🌍' };
  if (totalPoints >= 100) return { title: '帝国の覇者', emoji: '⚔️' };
  if (totalPoints >= 50) return { title: '植民地総督', emoji: '👑' };
  if (totalPoints >= 20) return { title: '貿易商人', emoji: '🏪' };
  return { title: '初心者探検家', emoji: '🔰' };
}

// --- Level system ---
// Lv.1 (0pt) → Lv.2 (20pt) → Lv.3 (50pt) → Lv.4 (100pt) → Lv.5 (200pt) → Lv.MAX (500pt)
export const LEVEL_THRESHOLDS = [0, 20, 50, 100, 200, 500];

export interface PlayerLevel {
  level: number;       // 1..6 (6 = MAX)
  isMax: boolean;
  currentTier: number; // threshold for current level
  nextTier: number | null;
  progress: number;    // 0..1 toward next level
  borderClass: string; // tailwind-ish gradient id used by RankingScreen
}

export function getLevel(totalPoints: number): PlayerLevel {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalPoints >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  const isMax = level >= LEVEL_THRESHOLDS.length;
  const currentTier = LEVEL_THRESHOLDS[level - 1];
  const nextTier = isMax ? null : LEVEL_THRESHOLDS[level];
  const progress = isMax || nextTier === null
    ? 1
    : Math.max(0, Math.min(1, (totalPoints - currentTier) / (nextTier - currentTier)));

  // Border style key (consumed by components)
  const borderClass =
    level >= 6 ? 'level-rainbow' :
    level >= 5 ? 'level-gold' :
    level >= 4 ? 'level-purple' :
    level >= 3 ? 'level-blue' :
    level >= 2 ? 'level-white' : 'level-base';

  return { level, isMax, currentTier, nextTier, progress, borderClass };
}

// --- Save game result ---
export async function saveGameResult(result: GameResult): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('game_results').insert(result);
  if (error) {
    console.error('[Supabase] saveGameResult error:', error);
    return false;
  }
  return true;
}

// --- Fetch ranking ---
export async function fetchRanking(): Promise<RankingEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('get_ranking');
  if (error) {
    console.error('[Supabase] fetchRanking error:', error);
    return [];
  }
  return data || [];
}

export async function fetchWeeklyRanking(): Promise<RankingEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('get_weekly_ranking');
  if (error) {
    console.error('[Supabase] fetchWeeklyRanking error:', error);
    return [];
  }
  return data || [];
}

export async function fetchHallOfFame(): Promise<HallOfFameEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('get_hall_of_fame');
  if (error) {
    console.error('[Supabase] fetchHallOfFame error:', error);
    return [];
  }
  return data || [];
}

// Fetch recent raw results (used for streak calc + badge calc across players)
export async function fetchRecentResults(limit = 500): Promise<GameResultRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('game_results')
    .select('*')
    .order('played_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[Supabase] fetchRecentResults error:', error);
    return [];
  }
  return (data as GameResultRow[]) || [];
}

// Fetch a single player's game history (most recent N)
export async function fetchPlayerHistory(playerName: string, limit = 20): Promise<GameResultRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('game_results')
    .select('*')
    .eq('player_name', playerName)
    .order('played_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[Supabase] fetchPlayerHistory error:', error);
    return [];
  }
  return (data as GameResultRow[]) || [];
}

// --- Streak calculation (client-side from raw results) ---
export interface StreakInfo {
  current: number;
  max: number;
}

export function computeStreaks(results: GameResultRow[]): Map<string, StreakInfo> {
  const map = new Map<string, StreakInfo>();
  // Group by player, sort ascending by played_at
  const byPlayer = new Map<string, GameResultRow[]>();
  for (const r of results) {
    if (!byPlayer.has(r.player_name)) byPlayer.set(r.player_name, []);
    byPlayer.get(r.player_name)!.push(r);
  }
  byPlayer.forEach((rows, name) => {
    const sorted = [...rows].sort((a, b) => a.played_at.localeCompare(b.played_at));
    let cur = 0;
    let max = 0;
    let run = 0;
    for (const r of sorted) {
      if (r.rank === 1) { run++; if (run > max) max = run; }
      else { run = 0; }
    }
    // Current streak = trailing run from newest games backward
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].rank === 1) cur++;
      else break;
    }
    map.set(name, { current: cur, max });
  });
  return map;
}

export function streakFire(streak: number): string {
  if (streak >= 10) return '🔥🔥🔥';
  if (streak >= 5) return '🔥🔥';
  if (streak >= 3) return '🔥';
  return '';
}
