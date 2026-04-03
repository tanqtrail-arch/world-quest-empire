/*
 * GameScreen - メインゲーム画面
 * Design: ポップ冒険RPGスタイル
 * Layout: 100dvh flex column with proper spacing
 * - 上部: 対戦相手情報バー
 * - 中央: ヘックスマップ + サイコロ（flex-1で残りスペースを使用）
 * - 下部: ゲームログ + プレイヤー情報 + アクションメニュー
 */
import HexMap from '@/components/game/HexMap';
import OpponentBar from '@/components/game/OpponentBar';
import PlayerPanel from '@/components/game/PlayerPanel';
import DiceRoller from '@/components/game/DiceRoller';
import ActionMenu from '@/components/game/ActionMenu';
import EventPopup from '@/components/game/EventPopup';
import GameLog from '@/components/game/GameLog';
import { useGameStore } from '@/lib/gameStore';

const BOARD_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663286960690/RthryRhRZNJvzXLKUFJiBd/game-board-bg-8s6c49wGQN8mc2Rzb2agwx.webp';

export default function GameScreen() {
  const { phase, currentTurn, maxTurns } = useGameStore();

  return (
    <div
      className="relative overflow-hidden select-none"
      style={{
        height: '100dvh',
        backgroundImage: `url(${BOARD_BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />

      {/* Main Content Column */}
      <div className="relative z-10 flex flex-col" style={{ height: '100dvh' }}>
        {/* Top: Opponent Bar */}
        <div className="shrink-0">
          <OpponentBar />
        </div>

        {/* Middle: Map + Dice (takes remaining space) */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-2 overflow-hidden">
          <HexMap />
          <DiceRoller />
        </div>

        {/* Bottom Section: Log + Player + Actions */}
        <div className="shrink-0 flex flex-col gap-1 pb-1">
          {/* Game Log */}
          <GameLog />

          {/* Player Panel */}
          <PlayerPanel />

          {/* Action Menu */}
          <ActionMenu />
        </div>
      </div>

      {/* Event Popup Overlay */}
      <EventPopup />
    </div>
  );
}
