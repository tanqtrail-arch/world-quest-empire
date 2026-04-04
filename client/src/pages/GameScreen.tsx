/*
 * GameScreen - メインゲーム画面
 * Design: ポップ冒険RPGスタイル
 * Layout: 100dvh flex column with proper spacing
 * - 上部: 対戦相手情報バー
 * - 中央: ヘックスマップ + サイコロ
 * - 下部: ゲームログ + プレイヤー情報 + アクションメニュー
 * - オーバーレイ: AIターン演出 + イベントポップアップ + ハンドオフ画面
 */
import HexMap from '@/components/game/HexMap';
import OpponentBar from '@/components/game/OpponentBar';
import PlayerPanel from '@/components/game/PlayerPanel';
import DiceRoller from '@/components/game/DiceRoller';
import ActionMenu from '@/components/game/ActionMenu';
import EventPopup from '@/components/game/EventPopup';
import GameLog from '@/components/game/GameLog';
import AITurnOverlay from '@/components/game/AITurnOverlay';
import ResourcePopup from '@/components/game/ResourcePopup';
import { useGameStore } from '@/lib/gameStore';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';

const BOARD_BG = '/game-board-bg.webp';

function TileHelpTooltip({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-12 right-2 z-40 parchment rounded-xl p-4 max-w-xs shadow-2xl"
    >
      <button onClick={onClose} className="absolute top-2 right-2 text-amber-700">
        <X size={16} />
      </button>
      <h3 className="font-heading font-bold text-amber-900 mb-2">🗺️ あそびかた</h3>
      <div className="text-amber-800 text-xs space-y-2 leading-relaxed">
        <p>
          <strong>🎲 サイコロの出目</strong>でタイルから資源がもらえるよ！
          各タイルには数字が書いてあって、サイコロの合計がその数字と同じなら、
          そのタイルの頂点に拠点がある人が資源をゲット！
        </p>
        <p>
          <strong>🛤️ 道を建てて</strong>拠点を広げよう！道がつながった先の頂点に新しい拠点を建てられるよ。
        </p>
        <p>
          <strong>🏠 拠点</strong>は隣接する2〜3つのタイルから資源がもらえる。
          <strong>🏰 都市</strong>にすると資源が2倍！
        </p>
        <p>
          <strong>🛤️ 最長の道</strong>を持つプレイヤーは+2勝利点ボーナス！
        </p>
        <div className="flex gap-1 flex-wrap mt-1">
          <span className="inline-block bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full">🌿ゴム</span>
          <span className="inline-block bg-slate-700 text-white text-[10px] px-2 py-0.5 rounded-full">🛢️石油</span>
          <span className="inline-block bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full">💰金</span>
          <span className="inline-block bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">🌾食料</span>
        </div>
      </div>
    </motion.div>
  );
}

// Handoff screen for local multiplayer
function HandoffOverlay() {
  const { phase, players, handoffPlayerIndex, confirmHandoff } = useGameStore();

  if (phase !== 'handoff' || handoffPlayerIndex === null) return null;

  const nextPlayer = players[handoffPlayerIndex];
  if (!nextPlayer) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${nextPlayer.color}88, ${nextPlayer.color}44)`, backdropFilter: 'blur(12px)' }}
    >
      <motion.div
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        className="parchment rounded-3xl p-8 mx-4 max-w-sm w-full text-center shadow-2xl"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-7xl mb-4"
        >
          {nextPlayer.flagEmoji}
        </motion.div>
        <h2 className="font-heading text-2xl font-bold text-amber-900 mb-2">
          {nextPlayer.name}のターン！
        </h2>
        <p className="text-amber-700 text-sm mb-6">
          📱 端末を{nextPlayer.name}に渡してください
        </p>
        <button
          onClick={confirmHandoff}
          className="game-btn-primary text-lg px-10 py-3 rounded-2xl"
          style={{ backgroundColor: nextPlayer.color }}
        >
          準備OK！
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function GameScreen() {
  const { phase, isPlayingAI, currentAIAction, setupPhase, players } = useGameStore();
  const [showHelp, setShowHelp] = useState(false);

  const isSetup = phase === 'setup';
  const setupPlayer = setupPhase ? players[setupPhase.currentPlayerIndex] : null;

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
        {/* Top: Opponent Bar + Help Button */}
        <div className="shrink-0 relative">
          <OpponentBar />
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm rounded-full p-1.5 text-white hover:bg-white/30 transition-colors"
          >
            <HelpCircle size={18} />
          </button>
          <AnimatePresence>
            {showHelp && <TileHelpTooltip onClose={() => setShowHelp(false)} />}
          </AnimatePresence>
        </div>

        {/* Setup Phase Banner */}
        <AnimatePresence>
          {isSetup && setupPlayer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="shrink-0 mx-2"
            >
              <div
                className="text-center py-2 px-3 rounded-lg text-white text-sm font-heading font-bold shadow-lg"
                style={{ backgroundColor: setupPlayer.color + 'dd' }}
              >
                {setupPlayer.flagEmoji} {setupPlayer.name}の初期配置
                {setupPhase?.round === 1 ? '（1回目）' : '（2回目）'}
                {setupPlayer.isAI && ' — AI配置中…'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Turn Banner - shows which AI is playing */}
        <AnimatePresence>
          {isPlayingAI && currentAIAction && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="shrink-0 mx-2"
            >
              <div
                className="text-center py-1.5 px-3 rounded-lg text-white text-sm font-heading font-bold shadow-lg"
                style={{ backgroundColor: currentAIAction.playerColor + 'dd' }}
              >
                {currentAIAction.playerFlag} {currentAIAction.playerName}が行動中…
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Middle: Map + Dice (takes remaining space) */}
        <div className="flex-1 flex flex-col items-center justify-center gap-1 px-2 overflow-hidden">
          <HexMap />
          {!isPlayingAI && !isSetup && phase !== 'handoff' && <DiceRoller />}
        </div>

        {/* Bottom Section: Log + Player + Actions */}
        <div className="shrink-0 flex flex-col gap-1 pb-1">
          {/* Game Log */}
          <GameLog />

          {/* Player Panel */}
          {!isSetup && <PlayerPanel />}

          {/* Action Menu - hidden during AI turns and setup */}
          {!isPlayingAI && !isSetup && phase !== 'handoff' && <ActionMenu />}
        </div>
      </div>

      {/* AI Turn Overlay - staged animation */}
      <AITurnOverlay />

      {/* Resource Gain Popup */}
      <ResourcePopup />

      {/* Event Popup Overlay */}
      <EventPopup />

      {/* Handoff Overlay for local multiplayer */}
      <AnimatePresence>
        <HandoffOverlay />
      </AnimatePresence>
    </div>
  );
}
