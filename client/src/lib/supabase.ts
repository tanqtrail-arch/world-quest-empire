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
}

export interface RankingEntry {
  player_name: string;
  total_points: number;
  wins: number;
  games: number;
  max_vp: number;
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
