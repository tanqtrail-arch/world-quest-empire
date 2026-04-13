// Stub module — achievements system not yet implemented.
// Exports placeholders so RankingScreen compiles.

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export const BADGES: Record<string, Badge> = {};
export const BADGE_ORDER: string[] = [];

export function computeBadges(_data: any): Set<string> { return new Set(); }
export function getStoredBadges(_name?: string): Set<string> { return new Set(); }
export function mergeBadges(_name: string, _badges: Set<string>): void {}
export function getStoredPlayerName(): string { return 'プレイヤー'; }
