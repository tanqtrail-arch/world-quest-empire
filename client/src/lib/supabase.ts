// Stub module — Supabase integration not yet implemented.
// Exports placeholders so RankingScreen compiles.

export interface RankingEntry {
  rank: number;
  player_name: string;
  score: number;
  wins: number;
  total_points: number;
  games: number;
  avg_quiz_rate: number;
  [key: string]: any;
}

export interface HallOfFameEntry {
  player_name: string;
  title: string;
  score: number;
  week_start: string;
  wins: number;
  games: number;
  week_points: number;
  [key: string]: any;
}

export interface GameResultRow {
  id: string;
  player_name: string;
  score: number;
  timestamp: number;
  [key: string]: any;
}

export interface StreakInfo {
  current: number;
  best: number;
  max: number;
}

export function isSupabaseEnabled(): boolean { return false; }
export async function fetchRanking(): Promise<RankingEntry[]> { return []; }
export async function fetchWeeklyRanking(): Promise<RankingEntry[]> { return []; }
export async function fetchHallOfFame(): Promise<HallOfFameEntry[]> { return []; }
export async function fetchRecentResults(_limit?: number): Promise<GameResultRow[]> { return []; }
export async function fetchPlayerHistory(_name?: string, _limit?: number): Promise<GameResultRow[]> { return []; }
export function computeStreaks(_results: GameResultRow[]): Map<string, StreakInfo> { return new Map(); }
export function streakFire(s: StreakInfo): string { return s.current >= 3 ? '🔥' : ''; }
export function getTitle(_score: number): any { return { title: '新人', emoji: '📚' }; }
export function getLevel(_score: number): any { return { level: 1, isMax: false }; }
