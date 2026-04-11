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
import EventCardDisplay from '@/components/game/EventCardDisplay';
import QuizPopup from '@/components/game/QuizPopup';
import GameLog from '@/components/game/GameLog';
import AITurnOverlay from '@/components/game/AITurnOverlay';
import AIResourcePanel from '@/components/game/AIResourcePanel';
import ResourcePopup from '@/components/game/ResourcePopup';
import { useGameStore } from '@/lib/gameStore';
import { TURN_TIMER_SECONDS } from '@/lib/gameTypes';
import { useState, useEffect, useRef } from 'react';
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

// Event card 3D flip host — shows human's drawn card (phase==='event') or AI's drawn card
function EventCardDisplayHost() {
  console.count('[render] EventCardDisplayHost');
  const phase = useGameStore(s => s.phase);
  const currentEvent = useGameStore(s => s.currentEvent);
  const currentAIAction = useGameStore(s => s.currentAIAction);
  const handleEvent = useGameStore(s => s.handleEvent);
  const resourcePickMode = useGameStore(s => s.resourcePickMode);

  // Priority 1: human event card
  if (phase === 'event' && currentEvent && !resourcePickMode) {
    return <EventCardDisplay card={currentEvent} onDismiss={handleEvent} />;
  }

  // Priority 2: AI event card action
  if (currentAIAction?.type === 'event_card' && currentAIAction.eventCard) {
    return <EventCardDisplay card={currentAIAction.eventCard} />;
  }

  return null;
}

// Handoff screen for local multiplayer
function HandoffOverlay() {
  const phase = useGameStore(s => s.phase);
  const players = useGameStore(s => s.players);
  const handoffPlayerIndex = useGameStore(s => s.handoffPlayerIndex);
  const confirmHandoff = useGameStore(s => s.confirmHandoff);

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

/* ---- Turn Timer Display ---- */
function TurnTimerDisplay() {
  const turnTimeRemaining = useGameStore(s => s.turnTimeRemaining);
  const turnTimerActive = useGameStore(s => s.turnTimerActive);
  const timerEnabled = useGameStore(s => s.timerEnabled);
  const isPlayingAI = useGameStore(s => s.isPlayingAI);
  const phase = useGameStore(s => s.phase);
  const tickTurnTimer = useGameStore(s => s.tickTurnTimer);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerEnabled && turnTimerActive) {
      timerRef.current = setInterval(() => {
        tickTurnTimer();
      }, 1000);
    }
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [timerEnabled, turnTimerActive, tickTurnTimer]);

  if (!timerEnabled || isPlayingAI || phase === 'setup' || phase === 'finished' || phase === 'handoff') {
    return null;
  }

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const progress = turnTimeRemaining / TURN_TIMER_SECONDS;
  const dashOffset = circumference * (1 - progress);

  const isYellow = turnTimeRemaining <= 15 && turnTimeRemaining > 5;
  const isRed = turnTimeRemaining <= 5;
  const strokeColor = isRed ? '#EF4444' : isYellow ? '#F59E0B' : '#3B82F6';
  const textColor = isRed ? 'text-red-500' : isYellow ? 'text-amber-500' : 'text-blue-500';

  return (
    <motion.div
      animate={isRed ? { scale: [1, 1.05, 1] } : {}}
      transition={isRed ? { duration: 0.5, repeat: Infinity } : {}}
      className="absolute top-2 left-2 z-30"
    >
      <div className="relative w-11 h-11 md:w-12 md:h-12">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r={radius} fill="rgba(0,0,0,0.4)" stroke="#ffffff33" strokeWidth={3} />
          <circle
            cx="22" cy="22" r={radius} fill="none"
            stroke={strokeColor}
            strokeWidth={3}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-score font-bold text-xs md:text-sm ${textColor}`}>
            {turnTimeRemaining}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function GameScreen() {
  console.count('[render] GameScreen');
  const phase = useGameStore(s => s.phase);
  const isPlayingAI = useGameStore(s => s.isPlayingAI);
  const currentAIAction = useGameStore(s => s.currentAIAction);
  const setupPhase = useGameStore(s => s.setupPhase);
  const players = useGameStore(s => s.players);
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

      {/* Main Content: Mobile = column / PC = row (map left, sidebar right) */}
      <div className="relative z-10 flex flex-col md:flex-row w-full" style={{ height: '100dvh' }}>
        {/* ================= LEFT / TOP: Map area ================= */}
        <div className="flex-1 min-h-0 flex flex-col relative md:p-1">
          {/* Mobile-only: Opponent Bar at top of screen */}
          <div className="shrink-0 relative md:hidden">
            <TurnTimerDisplay />
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

          {/* PC-only: floating timer over map */}
          <div className="hidden md:block">
            <TurnTimerDisplay />
          </div>

          {/* Setup Phase Banner */}
          <AnimatePresence>
            {isSetup && setupPlayer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="shrink-0 mx-2 md:mx-0 md:mb-1"
              >
                <div
                  className="text-center py-2 md:py-1 px-3 rounded-lg text-white text-sm md:text-xs font-heading font-bold shadow-lg"
                  style={{ backgroundColor: setupPlayer.color + 'dd' }}
                >
                  {setupPlayer.flagEmoji} {setupPlayer.name}の初期配置
                  {setupPhase?.round === 1 ? '（1回目）' : '（2回目）'}
                  {setupPlayer.isAI && ' — AI配置中…'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Turn Banner */}
          <AnimatePresence>
            {isPlayingAI && currentAIAction && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="shrink-0 mx-2 md:mx-0 md:mb-1"
              >
                <div
                  className="text-center py-1.5 md:py-1 px-3 rounded-lg text-white text-sm md:text-xs font-heading font-bold shadow-lg"
                  style={{ backgroundColor: currentAIAction.playerColor + 'dd' }}
                >
                  {currentAIAction.playerFlag} {currentAIAction.playerName}が行動中…
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AIResourcePanel />

          {/* Map — fills remaining space */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-1 px-2 md:px-0">
            <HexMap />
            {/* Mobile-only: DiceRoller under map */}
            <div className="md:hidden">
              {!isPlayingAI && !isSetup && phase !== 'handoff' && <DiceRoller />}
            </div>
          </div>
        </div>

        {/* ================= RIGHT: Sidebar (PC) / Bottom (Mobile) ================= */}
        <div className="shrink-0 md:w-80 lg:w-96 flex flex-col gap-1 pb-1 md:py-2 md:pr-2 md:pl-0 md:overflow-y-auto md:bg-black/25 md:backdrop-blur-sm relative">
          {/* PC-only: Help button at top of sidebar */}
          <div className="hidden md:flex md:justify-end md:px-2 md:pt-1 relative">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="bg-white/20 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/30 transition-colors"
            >
              <HelpCircle size={20} />
            </button>
            <AnimatePresence>
              {showHelp && <TileHelpTooltip onClose={() => setShowHelp(false)} />}
            </AnimatePresence>
          </div>

          {/* PC-only: Opponents (vertical) */}
          <div className="hidden md:block md:px-2">
            <OpponentBar />
          </div>

          <GameLog />
          {!isSetup && <PlayerPanel />}
          {!isPlayingAI && !isSetup && phase !== 'handoff' && <ActionMenu />}

          {/* PC-only: DiceRoller in sidebar */}
          <div className="hidden md:flex md:justify-center md:py-2">
            {!isPlayingAI && !isSetup && phase !== 'handoff' && <DiceRoller />}
          </div>
        </div>
      </div>

      {/* AI Turn Overlay - staged animation */}
      <AITurnOverlay />

      {/* Resource Gain Popup */}
      <ResourcePopup />

      {/* Event Popup Overlay (handles resource-pick UI after EventCardDisplay) */}
      <EventPopup />

      {/* Event Card 3D flip display (replaces legacy card face) */}
      <EventCardDisplayHost />

      {/* Quiz Popup Overlay */}
      <QuizPopup />

      {/* Handoff Overlay for local multiplayer */}
      <AnimatePresence>
        <HandoffOverlay />
      </AnimatePresence>
    </div>
  );
}
